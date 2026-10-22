import re
import unicodedata
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models.document import Document
from app.models.document_page import DocumentPage
from app.models.finding import ExtractedField
from app.models.audit import AuditEvent
from app.core.exceptions import NotFoundException, ValidationException


# Mapping for Devanagari numerals to standard ASCII Arabic numerals
DEVANAGARI_DIGITS = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
}

# Statutory regulatory bilingual glossary for Indian institutional scrutiny
REGULATORY_GLOSSARY = {
    "अखिल भारतीय तकनीकी शिक्षा परिषद": "All India Council for Technical Education (AICTE)",
    "तकनीकी शिक्षा निदेशालय": "Directorate of Technical Education",
    "संस्थान का नाम": "Institution Name",
    "महाविद्यालय का नाम": "College Name",
    "विश्वविद्यालय": "University",
    "स्वीकृत क्षमता": "Approved Intake",
    "प्रवेश क्षमता": "Intake Capacity",
    "शैक्षणिक सत्र": "Academic Year",
    "शैक्षणिक वर्ष": "Academic Year",
    "अनुमोदन पत्र": "Approval Letter",
    "अनापत्ति प्रमाण पत्र": "No Objection Certificate (NOC)",
    "भूमि प्रमाण पत्र": "Land Certificate",
    "भवन निर्माण प्रमाण पत्र": "Building Completion Certificate",
    "संस्था कोड": "Institution Code",
    "स्थायी पहचान संख्या": "Permanent ID",
    "दिनांक": "Date",
    "जारी तिथि": "Issue Date",
    "वैधता": "Validity",
    "सत्र": "Session",
}


def normalize_unicode_text(text: str) -> str:
    """Standardize Unicode representation and whitespace using NFKC normalization."""
    if not text:
        return ""
    normalized = unicodedata.normalize('NFKC', text)
    # Remove invisible zero-width joiners/non-joiners at word boundaries
    normalized = normalized.replace('\u200b', '').replace('\ufeff', '')
    return re.sub(r'[ \t]+', ' ', normalized).strip()


def normalize_devanagari_numerals(text: str) -> str:
    """Converts native Devanagari numerals (०-९) to ASCII numerals (0-9)."""
    if not text:
        return ""
    result = []
    for ch in text:
        result.append(DEVANAGARI_DIGITS.get(ch, ch))
    return "".join(result)


def is_devanagari_char(char: str) -> bool:
    """Returns True if character belongs to Devanagari Unicode block."""
    code = ord(char)
    return 0x0900 <= code <= 0x097F


def detect_text_language(text: str) -> Dict[str, Any]:
    """
    Identifies language of extracted document text based on script distribution.
    Enforces honest thresholding: short fragments are marked 'und' (undetermined).
    """
    if not text:
        return {
            "language": "und",
            "confidence": None,
            "method": "EMPTY_TEXT",
            "is_mixed": False,
            "script_distribution": {"latin": 0.0, "devanagari": 0.0, "other": 0.0}
        }

    clean = normalize_unicode_text(text)
    letters = [ch for ch in clean if ch.isalpha()]

    # If insufficient alphabetic characters, do not fabricate language confidence
    if len(letters) < 15:
        return {
            "language": "und",
            "confidence": None,
            "method": "INSUFFICIENT_TEXT",
            "is_mixed": False,
            "script_distribution": {"latin": 0.0, "devanagari": 0.0, "other": 0.0}
        }

    total = len(letters)
    devanagari_count = sum(1 for ch in letters if is_devanagari_char(ch))
    latin_count = sum(1 for ch in letters if 'a' <= ch.lower() <= 'z')
    other_count = total - (devanagari_count + latin_count)

    ratio_dev = round(devanagari_count / total, 3)
    ratio_lat = round(latin_count / total, 3)
    ratio_oth = round(other_count / total, 3)

    script_dist = {
        "latin": ratio_lat,
        "devanagari": ratio_dev,
        "other": ratio_oth
    }

    # Classification
    if ratio_lat >= 0.85:
        return {
            "language": "en",
            "confidence": ratio_lat,
            "method": "SCRIPT_DISTRIBUTION",
            "is_mixed": False,
            "script_distribution": script_dist
        }
    elif ratio_dev >= 0.80:
        return {
            "language": "hi",
            "confidence": ratio_dev,
            "method": "SCRIPT_DISTRIBUTION",
            "is_mixed": False,
            "script_distribution": script_dist
        }
    elif ratio_lat >= 0.15 and ratio_dev >= 0.15:
        return {
            "language": "mixed",
            "confidence": round(ratio_lat + ratio_dev, 3),
            "method": "SCRIPT_DISTRIBUTION",
            "is_mixed": True,
            "script_distribution": script_dist
        }
    else:
        return {
            "language": "und",
            "confidence": None,
            "method": "AMBIGUOUS_DISTRIBUTION",
            "is_mixed": False,
            "script_distribution": script_dist
        }


def extract_multilingual_candidate_fields(
    raw_text: str,
    document_id: str,
    page_number: int
) -> List[Dict[str, Any]]:
    """
    Extracts structured candidate fields from multilingual text (Hindi & English aliases).
    Normalizes native numerals while preserving original raw evidence.
    """
    if not raw_text:
        return []

    clean_orig = normalize_unicode_text(raw_text)
    # Text with Devanagari digits normalized to ASCII digits for robust regex extraction
    clean_norm = normalize_devanagari_numerals(clean_orig)
    candidates = []

    # 1. Institution Name (Hindi & English patterns)
    name_patterns = [
        r"(?:संस्थान का नाम|महाविद्यालय का नाम|कॉलेज का नाम|विद्यालय का नाम)\s*[:：\-]\s*([^\n\r,]+)",
        r"(?:Name of (?:the )?Institution|Institution Name|College Name)\s*[:：\-]\s*([^\n\r,]+)"
    ]
    for pat in name_patterns:
        match = re.search(pat, clean_norm, re.IGNORECASE)
        if match:
            val = match.group(1).strip()
            if len(val) >= 3:
                candidates.append({
                    "field_name": "institution_name",
                    "raw_value": val,
                    "normalized_value": val,
                    "document_id": document_id,
                    "page_number": page_number,
                    "confidence": 0.88,
                    "extraction_method": "MULTILINGUAL_PATTERN_REGEX"
                })
                break

    # 2. Approved Intake / Capacity
    intake_patterns = [
        r"(?:स्वीकृत क्षमता|प्रवेश क्षमता|कुल क्षमता)\s*[:：\-]\s*([0-9]+)",
        r"(?:Approved Intake|Sanctioned Intake|Total Intake)\s*[:：\-]\s*([0-9]+)"
    ]
    for pat in intake_patterns:
        match = re.search(pat, clean_norm, re.IGNORECASE)
        if match:
            intake_val = match.group(1).strip()
            candidates.append({
                "field_name": "approved_intake",
                "raw_value": intake_val,
                "normalized_value": intake_val,
                "document_id": document_id,
                "page_number": page_number,
                "confidence": 0.92,
                "extraction_method": "MULTILINGUAL_PATTERN_REGEX"
            })
            break

    # 3. Academic Year
    ay_patterns = [
        r"(?:शैक्षणिक सत्र|शैक्षणिक वर्ष|सत्र)\s*[:：\-]\s*([0-9]{4}\s*[-–/]\s*[0-9]{2,4})",
        r"(?:Academic Year|Session)\s*[:：\-]\s*([0-9]{4}\s*[-–/]\s*[0-9]{2,4})"
    ]
    for pat in ay_patterns:
        match = re.search(pat, clean_norm, re.IGNORECASE)
        if match:
            ay_val = re.sub(r"\s+", "", match.group(1).replace("–", "-").replace("/", "-"))
            candidates.append({
                "field_name": "academic_year",
                "raw_value": match.group(1).strip(),
                "normalized_value": ay_val,
                "document_id": document_id,
                "page_number": page_number,
                "confidence": 0.90,
                "extraction_method": "MULTILINGUAL_PATTERN_REGEX"
            })
            break

    # 4. AISHE / Permanent Identifier
    id_patterns = [
        r"(?:एआईएसएचई कोड|संस्था कोड|स्थायी पहचान संख्या|स्थायी आईडी)\s*[:：\-]\s*([A-Za-z0-9\-_/]+)",
        r"(?:AISHE Code|Permanent ID|Institution Code)\s*[:：\-]\s*([A-Za-z0-9\-_/]+)"
    ]
    for pat in id_patterns:
        match = re.search(pat, clean_norm, re.IGNORECASE)
        if match:
            id_val = match.group(1).strip()
            candidates.append({
                "field_name": "aishe_code",
                "raw_value": id_val,
                "normalized_value": id_val.upper(),
                "document_id": document_id,
                "page_number": page_number,
                "confidence": 0.94,
                "extraction_method": "MULTILINGUAL_PATTERN_REGEX"
            })
            break

    # 5. Dates (दिनांक / Date of Issue)
    date_patterns = [
        r"(?:दिनांक|जारी करने की तिथि|जारी तिथि)\s*[:：\-]\s*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})",
        r"(?:Date of Issue|Dated|Issue Date)\s*[:：\-]\s*([0-9]{1,2}[-/.][0-9]{1,2}[-/.][0-9]{4})"
    ]
    for pat in date_patterns:
        match = re.search(pat, clean_norm, re.IGNORECASE)
        if match:
            date_val = match.group(1).strip().replace("/", "-").replace(".", "-")
            candidates.append({
                "field_name": "issue_date",
                "raw_value": match.group(1).strip(),
                "normalized_value": date_val,
                "document_id": document_id,
                "page_number": page_number,
                "confidence": 0.89,
                "extraction_method": "MULTILINGUAL_PATTERN_REGEX"
            })
            break

    return candidates


class TranslationProviderInterface(ABC):
    provider_name: str
    is_available: bool

    @abstractmethod
    def translate(self, text: str, source_lang: str = "hi", target_lang: str = "en") -> Dict[str, Any]:
        pass


class GlossaryTranslationProvider(TranslationProviderInterface):
    """
    Local statutory glossary translation adapter.
    Translates recognized regulatory terminology without sending data to external APIs.
    """
    provider_name = "LOCAL_REGULATORY_GLOSSARY"
    is_available = True

    def translate(self, text: str, source_lang: str = "hi", target_lang: str = "en") -> Dict[str, Any]:
        if not text:
            return {"translated_text": "", "glossary_terms_found": [], "provider": self.provider_name}

        terms_found = []
        translated = text
        for term, gloss in REGULATORY_GLOSSARY.items():
            if term in translated:
                terms_found.append({"source": term, "translated": gloss})
                translated = translated.replace(term, f"[{gloss}]")

        return {
            "original_text": text,
            "translated_text": translated,
            "glossary_terms_found": terms_found,
            "provider": self.provider_name,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }


class ExternalTranslationStub(TranslationProviderInterface):
    """
    External machine translation stub. Explicitly reports unconfigured status.
    """
    provider_name = "EXTERNAL_CLOUD_TRANSLATOR"
    is_available = False

    def translate(self, text: str, source_lang: str = "hi", target_lang: str = "en") -> Dict[str, Any]:
        raise ValidationException("External cloud translation provider is not configured in this prototype environment.")


TRANSLATION_PROVIDERS = {
    "GLOSSARY": GlossaryTranslationProvider(),
    "EXTERNAL": ExternalTranslationStub(),
}


def translate_text(text: str, provider_key: str = "GLOSSARY") -> Dict[str, Any]:
    provider = TRANSLATION_PROVIDERS.get(provider_key)
    if not provider or not provider.is_available:
        raise ValidationException(f"Translation provider '{provider_key}' is unavailable or not configured.")
    return provider.translate(text)


def analyze_document_multilingual(db: Session, document_id: str) -> Dict[str, Any]:
    """
    Performs language classification and multilingual candidate field discovery for all pages of a document.
    Updates Document and DocumentPage records with detected languages.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise NotFoundException(code="DOCUMENT_NOT_FOUND", message=f"Document '{document_id}' not found.")

    pages = db.query(DocumentPage).filter(DocumentPage.document_id == document_id).order_by(DocumentPage.page_number.asc()).all()

    lang_counts: Dict[str, int] = {}
    discovered_fields_count = 0

    for page in pages:
        content = page.clean_text or page.raw_text or ""
        det = detect_text_language(content)
        page.detected_language = det["language"]
        page.language_confidence = det["confidence"]

        # Track distribution
        l_code = det["language"]
        lang_counts[l_code] = lang_counts.get(l_code, 0) + 1

        # Extract multilingual candidate fields
        fields = extract_multilingual_candidate_fields(content, doc.id, page.page_number)
        for f in fields:
            # Check if field already stored for this page and name
            existing = (
                db.query(ExtractedField)
                .filter(
                    ExtractedField.document_id == doc.id,
                    ExtractedField.page_number == page.page_number,
                    ExtractedField.field_key == f["field_name"]
                )
                .first()
            )
            if not existing:
                new_field = ExtractedField(
                    document_id=doc.id,
                    processing_run_id=page.processing_run_id,
                    page_number=page.page_number,
                    field_key=f["field_name"],
                    raw_value=f["raw_value"],
                    normalized_value=f["normalized_value"],
                    confidence=f["confidence"],
                    extraction_method=f["extraction_method"]
                )
                db.add(new_field)
                discovered_fields_count += 1

    # Update document-level language
    total_pages = len(pages)
    if total_pages > 0:
        dominant_lang = max(lang_counts.items(), key=lambda x: x[1])[0]
        doc.detected_language = dominant_lang
        doc.language_distribution = {k: round(v / total_pages, 2) for k, v in lang_counts.items()}
    else:
        doc.detected_language = "und"
        doc.language_distribution = {}

    db.commit()
    db.refresh(doc)

    return {
        "document_id": doc.id,
        "detected_language": doc.detected_language,
        "language_distribution": doc.language_distribution,
        "page_count": total_pages,
        "candidate_fields_discovered": discovered_fields_count
    }
