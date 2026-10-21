import os
import tempfile
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect


def test_alembic_migrations_fresh_database():
    """Verify that Alembic migrations run cleanly on a completely fresh SQLite database."""
    with tempfile.TemporaryDirectory() as tmpdir:
        db_path = os.path.join(tmpdir, "test_fresh.db")
        db_url = f"sqlite:///{db_path}"

        # Configure Alembic to point to the temporary database
        alembic_cfg = Config("alembic.ini")
        alembic_cfg.set_main_option("sqlalchemy.url", db_url)

        # Run migration to head
        command.upgrade(alembic_cfg, "head")

        # Inspect tables created
        engine = create_engine(db_url)
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        engine.dispose()

        expected_tables = {
            "institutions",
            "users",
            "application_categories",
            "applications",
            "audit_events",
            "documents",
            "processing_runs",
            "alembic_version",
        }
        assert expected_tables.issubset(tables), f"Missing tables in {tables}"

        # Test downgrade to base
        command.downgrade(alembic_cfg, "base")
        engine_after = create_engine(db_url)
        inspector_after = inspect(engine_after)
        tables_after = set(inspector_after.get_table_names())
        engine_after.dispose()

        assert "documents" not in tables_after
        assert "processing_runs" not in tables_after
        assert "applications" not in tables_after
        assert "institutions" not in tables_after
