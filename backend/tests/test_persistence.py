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
