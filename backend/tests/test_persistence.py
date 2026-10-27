import os
import tempfile
from sqlalchemy import create_engine, select
from sqlalchemy.orm import sessionmaker
from app.db.base import Base
from app.models.institution import Institution
from app.models.category import ApplicationCategory
from app.models.application import Application
from app.models.audit import AuditEvent


def test_database_persistence_across_restart():
    """Verify that records persist to disk and remain intact after closing engine connections."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_file = os.path.join(tmpdir, "persist_test.db")
        db_url = f"sqlite:///{db_file}"

        # 1. First session / run
        engine1 = create_engine(db_url)
        Base.metadata.create_all(bind=engine1)
        Session1 = sessionmaker(bind=engine1)
        session1 = Session1()

        inst = Institution(
            id="INS-PERSIST-1",
            institution_name="Persisted Polytechnic",
            status="ACTIVE",
            data_origin="SYNTHETIC_DEMO",
        )
        cat = ApplicationCategory(
            code="EOA_ILLUSTRATIVE",
            name="Extension of Approval",
            provenance="ILLUSTRATIVE",
        )
        app = Application(
            id="APP-PERSIST-1",
            application_reference="VAI-2026-9999",
            institution_id="INS-PERSIST-1",
            category_code="EOA_ILLUSTRATIVE",
            academic_year="2026-27",
            lifecycle_status="DRAFT",
            created_by="USR-INST-01",
            data_origin="SYNTHETIC_DEMO",
        )
        audit = AuditEvent(
            id="AUD-PERSIST-1",
            event_type="APPLICATION_CREATED",
            actor_type="USER",
            application_id="APP-PERSIST-1",
        )

        session1.add_all([inst, cat, app, audit])
        session1.commit()
        session1.close()
        engine1.dispose()

        # 2. Simulate server restart: fresh engine and session connecting to the existing file
        engine2 = create_engine(db_url)
        Session2 = sessionmaker(bind=engine2)
        session2 = Session2()

        loaded_app = session2.scalar(select(Application).where(Application.id == "APP-PERSIST-1"))
        assert loaded_app is not None
        assert loaded_app.application_reference == "VAI-2026-9999"
        assert loaded_app.institution_id == "INS-PERSIST-1"

        loaded_audit = session2.scalar(select(AuditEvent).where(AuditEvent.id == "AUD-PERSIST-1"))
        assert loaded_audit is not None
        assert loaded_audit.event_type == "APPLICATION_CREATED"

        session2.close()
        engine2.dispose()


def test_scrutiny_job_persistence_and_startup_reconciliation_across_restart():
    """Verify that ScrutinyJobs persist across restarts and startup reconciliation cleanly transitions abandoned jobs."""
    from app.models.scrutiny_job import ScrutinyJob
    from app.services.scrutiny_job import reconcile_abandoned_scrutiny_jobs

    with tempfile.TemporaryDirectory() as tmpdir:
        db_file = os.path.join(tmpdir, "persist_scrutiny_test.db")
        db_url = f"sqlite:///{db_file}"

        # 1. First run: insert institution, category, application, and PROCESSING scrutiny job
        engine1 = create_engine(db_url)
        Base.metadata.create_all(bind=engine1)
        Session1 = sessionmaker(bind=engine1)
        session1 = Session1()

        inst = Institution(id="INS-RECON-1", institution_name="Recon College", status="ACTIVE")
        cat = ApplicationCategory(code="EOA_RECON", name="Reconciliation Category")
        app = Application(
            id="APP-RECON-1",
            application_reference="VAI-2026-RECON",
            institution_id="INS-RECON-1",
            category_code="EOA_RECON",
            academic_year="2026-27",
            lifecycle_status="SUBMITTED",
            created_by="USR-OFFICER-01",
        )
        job = ScrutinyJob(
            id="JOB-ABANDONED-01",
            application_id="APP-RECON-1",
            job_type="FULL_SCRUTINY",
            status="PROCESSING",
            triggered_by="USR-OFFICER-01",
            retry_count=0,
            max_retries=2,
            safe_error_summary=None,
        )
        session1.add_all([inst, cat, app, job])
        session1.commit()
        session1.close()
        engine1.dispose()

        # 2. Simulated server crash / restart: engine restarts, lifespan hook triggers reconciliation
        engine2 = create_engine(db_url)
        Session2 = sessionmaker(bind=engine2)
        session2 = Session2()

        # Run startup reconciliation
        reconciled_count = reconcile_abandoned_scrutiny_jobs(session2)
        assert reconciled_count == 1

        # Verify job transitioned to FAILED with exact error code
        persisted_job = session2.scalar(select(ScrutinyJob).where(ScrutinyJob.id == "JOB-ABANDONED-01"))
        assert persisted_job is not None
        assert persisted_job.status == "FAILED"
        assert persisted_job.error_code == "SERVER_RESTARTED_DURING_EXECUTION"
        assert persisted_job.completed_at is not None

        # Verify audit event recorded
        recon_audit = session2.scalar(
            select(AuditEvent).where(
                AuditEvent.event_type == "SCRUTINY_JOB_RECONCILED",
                AuditEvent.entity_id == "JOB-ABANDONED-01",
            )
        )
        assert recon_audit is not None
        assert recon_audit.actor_type == "SYSTEM"

        session2.close()
        engine2.dispose()
