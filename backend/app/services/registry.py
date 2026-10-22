import re
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.models.registry import RegistryRecord, RegistryVerificationRun, RegistryVerificationResult
from app.models.application import Application
from app.models.institution import Institution
from app.models.audit import AuditEvent
from app.core.exceptions import NotFoundException, ValidationException, BadRequestException


def normalize_institution_name(name: str) -> str:
    """
    Standardize institution names for resilient deterministic comparison.
    Strips noise words, punctuation, and multiple spaces.
    """
    if not name:
        return ""
    text = name.lower()
    # Replace punctuation and special characters with spaces
    text = re.sub(r"[^\w\s]", " ", text)
    tokens = text.split()
    # Common academic / legal entity noise tokens in Indian regulatory records
    stop_words = {
        "the", "of", "and", "for", "in", "at", "an", "a",
        "institute", "institution", "college", "university",
        "technology", "engineering", "polytechnic", "sciences", "science",
        "trust", "society", "foundation", "campus", "group"
    }
    filtered = [t for t in tokens if t not in stop_words]
    return " ".join(filtered)


class RegistryProviderInterface(ABC):
    """
    Abstract interface for regulatory registry adapters.
    """
    provider_code: str
    provider_name: str
    description: str
    is_synthetic: bool
    is_available: bool

    @abstractmethod
    def get_info(self) -> Dict[str, Any]:
        pass

    @abstractmethod
    def search_by_identifier(self, db: Session, identifier: str) -> Optional[RegistryRecord]:
        pass

    @abstractmethod
    def search_by_name(self, db: Session, name: str) -> List[RegistryRecord]:
        pass


class SyntheticAISHEProvider(RegistryProviderInterface):
    """
    Local synthetic provider simulating AISHE (All India Survey on Higher Education) registry data.
    """
    provider_code = "SYNTHETIC_AISHE"
    provider_name = "Synthetic AISHE Reference Registry"
    description = "Local demonstration registry fixture for institutional accreditation and approval records."
    is_synthetic = True
    is_available = True

    def get_info(self) -> Dict[str, Any]:
        return {
            "provider_code": self.provider_code,
            "provider_name": self.provider_name,
            "description": self.description,
            "is_synthetic": self.is_synthetic,
            "is_available": self.is_available,
            "status": "OPERATIONAL",
            "statutory_authority": "Simulated AISHE / Regulatory Registry (SIH 2026 Prototype)",
            "requires_network": False
        }

    def search_by_identifier(self, db: Session, identifier: str) -> Optional[RegistryRecord]:
        if not identifier:
            return None
        return (
            db.query(RegistryRecord)
            .filter(
                RegistryRecord.provider_code == self.provider_code,
                RegistryRecord.reference_identifier.ilike(identifier.strip())
            )
            .first()
        )

    def search_by_name(self, db: Session, name: str) -> List[RegistryRecord]:
        if not name:
            return []
        norm = normalize_institution_name(name)
        # 1. Exact or normalized search
        records = (
            db.query(RegistryRecord)
            .filter(
                RegistryRecord.provider_code == self.provider_code,
                or_(
                    RegistryRecord.institution_name.ilike(f"%{name.strip()}%"),
                    RegistryRecord.institution_name_normalized.ilike(f"%{norm}%")
                )
            )
            .all()
        )
        return records


class OfficialAICTEProviderStub(RegistryProviderInterface):
    """
    Explicit stub for the official AICTE portal integration.
    Clearly reports 'UNAVAILABLE' as required by prompt until authorized access is configured.
    """
    provider_code = "OFFICIAL_AICTE"
    provider_name = "Official AICTE Central Portal"
    description = "Official AICTE regulatory portal adapter (requires production credentials & authorization)."
    is_synthetic = False
    is_available = False

    def get_info(self) -> Dict[str, Any]:
        return {
            "provider_code": self.provider_code,
            "provider_name": self.provider_name,
            "description": self.description,
            "is_synthetic": self.is_synthetic,
            "is_available": self.is_available,
            "status": "NOT_CONFIGURED",
            "statutory_authority": "All India Council for Technical Education",
            "requires_network": True,
            "notes": "Live integration unavailable in prototype environment. Use SYNTHETIC_AISHE provider."
        }

    def search_by_identifier(self, db: Session, identifier: str) -> Optional[RegistryRecord]:
        return None

    def search_by_name(self, db: Session, name: str) -> List[RegistryRecord]:
        return []


REGISTRY_PROVIDERS: Dict[str, RegistryProviderInterface] = {
    "SYNTHETIC_AISHE": SyntheticAISHEProvider(),
    "OFFICIAL_AICTE": OfficialAICTEProviderStub(),
}


def list_registry_providers() -> List[Dict[str, Any]]:
    return [p.get_info() for p in REGISTRY_PROVIDERS.values()]


def get_registry_provider(provider_code: str) -> RegistryProviderInterface:
    provider = REGISTRY_PROVIDERS.get(provider_code)
    if not provider:
        raise NotFoundException(code="PROVIDER_NOT_FOUND", message=f"Registry provider '{provider_code}' is not supported.")
    return provider


def import_registry_dataset(
    db: Session,
    records_data: List[Dict[str, Any]],
    provider_code: str = "SYNTHETIC_AISHE",
    source_dataset: str = "SYNTHETIC_REGISTRY_2026",
    dataset_version: str = "1.0",
    actor_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Safely import or update reference registry records.
    Validates required fields, rejects duplicates, and runs within a safe transaction.
    """
    if not records_data:
        raise ValidationException(message="Import dataset cannot be empty.")

    provider = get_registry_provider(provider_code)
    created_count = 0
    updated_count = 0
    seen_identifiers = set()

    for idx, item in enumerate(records_data):
        ref_id = item.get("reference_identifier", "").strip()
        inst_name = item.get("institution_name", "").strip()

        if not ref_id:
            raise ValidationException(message=f"Row {idx + 1}: 'reference_identifier' is required.")
        if not inst_name:
            raise ValidationException(message=f"Row {idx + 1}: 'institution_name' is required.")

        if ref_id in seen_identifiers:
            raise ValidationException(message=f"Duplicate reference identifier in import batch: '{ref_id}'.")
        seen_identifiers.add(ref_id)

        norm_name = normalize_institution_name(inst_name)
        existing = (
            db.query(RegistryRecord)
            .filter(
                RegistryRecord.provider_code == provider_code,
                RegistryRecord.reference_identifier == ref_id
            )
            .first()
        )

        if existing:
            existing.institution_name = inst_name
            existing.institution_name_normalized = norm_name
            existing.state = item.get("state") or existing.state
            existing.district = item.get("district") or existing.district
            existing.address = item.get("address") or existing.address
            existing.status = item.get("status") or existing.status
            existing.approved_intake = item.get("approved_intake") if item.get("approved_intake") is not None else existing.approved_intake
            existing.year_of_establishment = item.get("year_of_establishment") or existing.year_of_establishment
            existing.source_dataset = source_dataset
            existing.dataset_version = dataset_version
            existing.is_stale = item.get("is_stale", False)
            existing.metadata_json = item.get("metadata_json") or existing.metadata_json
            existing.updated_at = datetime.now(timezone.utc)
            updated_count += 1
        else:
            new_record = RegistryRecord(
                provider_code=provider_code,
                reference_identifier=ref_id,
                institution_name=inst_name,
                institution_name_normalized=norm_name,
                state=item.get("state"),
                district=item.get("district"),
                address=item.get("address"),
                status=item.get("status", "ACTIVE"),
                approved_intake=item.get("approved_intake"),
                year_of_establishment=item.get("year_of_establishment"),
                source_dataset=source_dataset,
                dataset_version=dataset_version,
                is_stale=item.get("is_stale", False),
                metadata_json=item.get("metadata_json")
            )
            db.add(new_record)
            created_count += 1

    # Record audit event
    audit = AuditEvent(
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        event_type="REGISTRY_DATASET_IMPORTED",
        entity_type="REGISTRY",
        entity_id=provider_code,
        metadata_json={
            "provider_code": provider_code,
            "source_dataset": source_dataset,
            "dataset_version": dataset_version,
            "created_count": created_count,
            "updated_count": updated_count,
            "total_records": len(records_data)
        }
    )
    db.add(audit)
    db.commit()

    return {
        "provider_code": provider_code,
        "source_dataset": source_dataset,
        "dataset_version": dataset_version,
        "created_count": created_count,
        "updated_count": updated_count,
        "total_processed": len(records_data)
    }


def verify_application_registry(
    db: Session,
    application_id: str,
    provider_code: str = "SYNTHETIC_AISHE",
    actor_id: Optional[str] = None
) -> RegistryVerificationRun:
    """
    Executes comprehensive regulatory verification comparing application declarations
    and institution data against the selected reference registry provider.
    """
    app = db.query(Application).filter(Application.id == application_id).first()
    if not app:
        raise NotFoundException(code="APPLICATION_NOT_FOUND", message=f"Application '{application_id}' not found.")

    provider = get_registry_provider(provider_code)

    if not provider.is_available:
        # Create unfulfilled verification run documenting unavailability
        run = RegistryVerificationRun(
            application_id=app.id,
            provider_code=provider_code,
            overall_status="PROVIDER_UNAVAILABLE",
            summary=f"Registry provider '{provider.provider_name}' is not configured or unavailable in this environment.",
            executed_by_id=actor_id
        )
        db.add(run)
        db.commit()
        db.refresh(run)
        return run

    institution = db.query(Institution).filter(Institution.id == app.institution_id).first()
    inst_identifier = institution.institution_identifier if institution else None
    inst_name = institution.institution_name if institution else None

    # Search reference record
    ref_record = provider.search_by_identifier(db, inst_identifier) if inst_identifier else None
    name_matches: List[RegistryRecord] = []

    if not ref_record and inst_name:
        name_matches = provider.search_by_name(db, inst_name)
        if len(name_matches) == 1:
            ref_record = name_matches[0]

    # Initialize Run
    run = RegistryVerificationRun(
        application_id=app.id,
        provider_code=provider_code,
        executed_by_id=actor_id,
        reference_record_id=ref_record.id if ref_record else None
    )
    db.add(run)
    db.flush()

    results: List[RegistryVerificationResult] = []

    if not ref_record:
        if len(name_matches) > 1:
            overall_status = "AMBIGUOUS"
            summary = f"Multiple reference records match institution name '{inst_name}'. Manual human resolution required."
            res = RegistryVerificationResult(
                run_id=run.id,
                check_type="NAME_MATCH",
                status="AMBIGUOUS",
                application_value=inst_name,
                registry_value=f"{len(name_matches)} candidates",
                explanation=summary,
                discrepancy_details={"candidates": [r.reference_identifier for r in name_matches]},
                requires_human_review=True
            )
            results.append(res)
        else:
            overall_status = "NOT_FOUND"
            summary = f"No reference record found in {provider.provider_name} for identifier '{inst_identifier}' or name '{inst_name}'."
            res = RegistryVerificationResult(
                run_id=run.id,
                check_type="IDENTIFIER_MATCH",
                status="NOT_FOUND",
                application_value=inst_identifier,
                registry_value=None,
                explanation="Institution identifier does not exist in reference registry dataset.",
                requires_human_review=True
            )
            results.append(res)
    else:
        # Check staleness
        if ref_record.is_stale:
            stale_res = RegistryVerificationResult(
                run_id=run.id,
                check_type="REFERENCE_FRESHNESS",
                status="STALE_REFERENCE",
                application_value=ref_record.dataset_version,
                registry_value="STALE",
                explanation=f"Reference record from dataset '{ref_record.source_dataset}' is flagged as stale or unconfirmed.",
                requires_human_review=True
            )
            results.append(stale_res)

        # 1. Identifier Check
        id_match = (inst_identifier and inst_identifier.strip().upper() == ref_record.reference_identifier.strip().upper())
        results.append(RegistryVerificationResult(
            run_id=run.id,
            check_type="IDENTIFIER_MATCH",
            status="MATCH" if id_match else "MISMATCH",
            application_value=inst_identifier,
            registry_value=ref_record.reference_identifier,
            explanation="Institutional identifier exact match verified." if id_match else "Application identifier conflicts with registry reference record.",
            requires_human_review=not id_match
        ))

        # 2. Name Check
        app_norm = normalize_institution_name(inst_name)
        ref_norm = ref_record.institution_name_normalized
        if app_norm == ref_norm:
            name_status = "MATCH"
            name_exp = "Institution legal name matches registered reference entity."
        elif app_norm in ref_norm or ref_norm in app_norm:
            name_status = "MATCH"
            name_exp = "Institution legal name exhibits high normalized correspondence with registry reference entity."
        else:
            name_status = "MISMATCH"
            name_exp = f"Institution declared name '{inst_name}' differs from registered registry entity '{ref_record.institution_name}'."

        results.append(RegistryVerificationResult(
            run_id=run.id,
            check_type="NAME_MATCH",
            status=name_status,
            application_value=inst_name,
            registry_value=ref_record.institution_name,
            explanation=name_exp,
            requires_human_review=(name_status != "MATCH")
        ))

        # 3. Status Check
        status_match = (ref_record.status.upper() in ["ACTIVE", "AFFILIATED", "RECOGNIZED"])
        results.append(RegistryVerificationResult(
            run_id=run.id,
            check_type="REGISTRATION_STATUS",
            status="MATCH" if status_match else "MISMATCH",
            application_value="ACTIVE_APPLICANT",
            registry_value=ref_record.status,
            explanation=f"Reference status is '{ref_record.status}'." if status_match else f"Regulatory reference status is '{ref_record.status}' (requires review).",
            requires_human_review=not status_match
        ))

        # 4. Intake capacity check if available
        declared_intake = None
        if app.declared_data and "declared_intake" in app.declared_data:
            try:
                declared_intake = int(app.declared_data["declared_intake"])
            except (ValueError, TypeError):
                pass

        if declared_intake is not None and ref_record.approved_intake is not None:
            intake_match = (declared_intake <= ref_record.approved_intake)
            results.append(RegistryVerificationResult(
                run_id=run.id,
                check_type="INTAKE_CEILING",
                status="MATCH" if intake_match else "MISMATCH",
                application_value=str(declared_intake),
                registry_value=str(ref_record.approved_intake),
                explanation="Declared intake is within registry-approved statutory ceiling." if intake_match else f"Declared intake ({declared_intake}) exceeds registry ceiling ({ref_record.approved_intake}).",
                requires_human_review=not intake_match
            ))

        # 5. Location check if available
        if ref_record.state and institution and institution.state:
            loc_match = (institution.state.strip().lower() == ref_record.state.strip().lower())
            results.append(RegistryVerificationResult(
                run_id=run.id,
                check_type="LOCATION_MATCH",
                status="MATCH" if loc_match else "MISMATCH",
                application_value=institution.state,
                registry_value=ref_record.state,
                explanation="Jurisdiction state matches registry record." if loc_match else f"Declared state '{institution.state}' conflicts with registry record '{ref_record.state}'.",
                requires_human_review=not loc_match
            ))

        # Determine overall status
        statuses = [r.status for r in results]
        if "MISMATCH" in statuses:
            overall_status = "MISMATCH"
            summary = "One or more core discrepancies detected against reference registry record."
        elif "STALE_REFERENCE" in statuses:
            overall_status = "STALE_REFERENCE"
            summary = "Reference record matched but reference data is marked stale."
        elif "AMBIGUOUS" in statuses:
            overall_status = "AMBIGUOUS"
            summary = "Ambiguous correspondence requiring reviewer adjudication."
        else:
            overall_status = "MATCH"
            summary = "All verified parameters successfully conform with reference registry data."

    run.overall_status = overall_status
    run.summary = summary
    for r in results:
        db.add(r)

    # Audit event
    audit = AuditEvent(
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        event_type="REGISTRY_VERIFICATION_EXECUTED",
        entity_type="APPLICATION",
        entity_id=application_id,
        metadata_json={
            "run_id": run.id,
            "provider_code": provider_code,
            "overall_status": overall_status,
            "result_count": len(results),
            "ref_record_id": ref_record.id if ref_record else None
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(run)
    return run


def resolve_registry_discrepancy(
    db: Session,
    result_id: str,
    resolution_status: str,
    resolution_notes: str,
    actor_id: Optional[str] = None
) -> RegistryVerificationResult:
    """
    Records human reviewer resolution for an ambiguous match or discrepancy.
    """
    valid_statuses = ["ACCEPTED", "WAIVED", "FLAGGED", "UNRESOLVED"]
    if resolution_status not in valid_statuses:
        raise ValidationException(message=f"Invalid resolution status '{resolution_status}'. Expected one of {valid_statuses}.")

    result = db.query(RegistryVerificationResult).filter(RegistryVerificationResult.id == result_id).first()
    if not result:
        raise NotFoundException(code="RESULT_NOT_FOUND", message=f"Verification result '{result_id}' not found.")

    result.resolution_status = resolution_status
    result.resolution_notes = resolution_notes
    result.resolved_by_id = actor_id
    result.resolved_at = datetime.now(timezone.utc)

    audit = AuditEvent(
        actor_id=actor_id,
        actor_type="USER" if actor_id else "SYSTEM",
        event_type="REGISTRY_DISCREPANCY_RESOLVED",
        entity_type="REGISTRY_RESULT",
        entity_id=result.id,
        metadata_json={
            "run_id": result.run_id,
            "check_type": result.check_type,
            "resolution_status": resolution_status,
            "notes": resolution_notes
        }
    )
    db.add(audit)
    db.commit()
    db.refresh(result)
    return result
