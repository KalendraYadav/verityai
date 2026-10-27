"""Safely update existing development database institutions to the 6 clean, fictional institutions.
Preserves all primary keys (INS-0001, APP-2026-0001, etc.), foreign keys, uploaded files,
and audit history without resetting or reseeding the database.
"""

import json
from sqlalchemy import select
from app.db.session import SessionLocal
from app.models.institution import Institution
from app.models.application import Application
from app.models.user import User

CLEAN_INSTITUTIONS = [
    {
        "id": "INS-0001",
        "institution_name": "Meridian Institute of Technology",
        "institution_identifier": "VAI-I-001",
        "institution_type": "ENGINEERING_COLLEGE",
        "state": "Maharashtra",
        "city": "Pune",
        "status": "ACTIVE",
        "data_origin": "SYNTHETIC_DEMO",
    },
    {
        "id": "INS-0002",
        "institution_name": "Northbridge College of Engineering",
        "institution_identifier": "VAI-I-002",
        "institution_type": "ENGINEERING_COLLEGE",
        "state": "Karnataka",
        "city": "Bengaluru",
        "status": "ACTIVE",
        "data_origin": "SYNTHETIC_DEMO",
    },
    {
        "id": "INS-0003",
        "institution_name": "Aravalli School of Technical Studies",
        "institution_identifier": "VAI-I-003",
        "institution_type": "POLYTECHNIC",
        "state": "Delhi",
        "city": "New Delhi",
        "status": "ACTIVE",
        "data_origin": "SYNTHETIC_DEMO",
    },
    {
        "id": "INS-0004",
        "institution_name": "Eastfield Institute of Applied Sciences",
        "institution_identifier": "VAI-I-004",
        "institution_type": "TECHNICAL_INSTITUTE",
        "state": "Telangana",
        "city": "Hyderabad",
        "status": "ACTIVE",
        "data_origin": "SYNTHETIC_DEMO",
    },
    {
        "id": "INS-0005",
        "institution_name": "Riverstone College of Engineering",
        "institution_identifier": "VAI-I-005",
        "institution_type": "ENGINEERING_COLLEGE",
        "state": "Tamil Nadu",
        "city": "Chennai",
        "status": "ACTIVE",
        "data_origin": "SYNTHETIC_DEMO",
    },
    {
        "id": "INS-0006",
        "institution_name": "Summit Institute of Management and Technology",
        "institution_identifier": "VAI-I-006",
        "institution_type": "MANAGEMENT_INSTITUTE",
        "state": "Uttar Pradesh",
        "city": "Noida",
        "status": "ACTIVE",
        "data_origin": "SYNTHETIC_DEMO",
    },
]

NAME_MAP = {
    "INS-0001": ("Meridian Institute of Technology", "VAI-I-001"),
    "INS-0002": ("Northbridge College of Engineering", "VAI-I-002"),
    "INS-0003": ("Aravalli School of Technical Studies", "VAI-I-003"),
    "INS-0004": ("Eastfield Institute of Applied Sciences", "VAI-I-004"),
    "INS-0005": ("Riverstone College of Engineering", "VAI-I-005"),
    "INS-0006": ("Summit Institute of Management and Technology", "VAI-I-006"),
}


def run_update():
    db = SessionLocal()
    try:
        print("1. Updating / Inserting Institutions...")
        for inst_data in CLEAN_INSTITUTIONS:
            inst = db.scalar(select(Institution).where(Institution.id == inst_data["id"]))
            if inst:
                print(f"  * Updating {inst.id}: '{inst.institution_name}' -> '{inst_data['institution_name']}' [{inst_data['institution_identifier']}]")
                inst.institution_name = inst_data["institution_name"]
                inst.institution_identifier = inst_data["institution_identifier"]
                inst.institution_type = inst_data["institution_type"]
                inst.state = inst_data["state"]
                inst.city = inst_data["city"]
            else:
                print(f"  + Inserting {inst_data['id']}: '{inst_data['institution_name']}' [{inst_data['institution_identifier']}]")
                inst = Institution(**inst_data)
                db.add(inst)

        db.flush()

        print("\n2. Synchronizing Applications declared_data...")
        apps = db.scalars(select(Application)).all()
        for app in apps:
            if app.institution_id in NAME_MAP:
                new_name, new_code = NAME_MAP[app.institution_id]
                declared = dict(app.declared_data or {})
                changed = False
                if declared.get("institution_name") != new_name:
                    declared["institution_name"] = new_name
                    changed = True
                if declared.get("institution_identifier") != new_code:
                    declared["institution_identifier"] = new_code
                    changed = True
                if changed:
                    app.declared_data = declared
                    print(f"  * Updated App {app.application_reference} declared_data -> {new_name} ({new_code})")

        print("\n3. Updating User display names...")
        users = db.scalars(select(User)).all()
        for u in users:
            if u.institution_id == "INS-0001" and "Apex" in u.display_name:
                u.display_name = u.display_name.replace("Apex", "Meridian")
                print(f"  * User {u.id}: -> {u.display_name}")
            elif u.institution_id == "INS-0002" and "Zenith" in u.display_name:
                u.display_name = u.display_name.replace("Zenith", "Northbridge")
                print(f"  * User {u.id}: -> {u.display_name}")

        db.commit()
        print("\nDatabase update completed successfully with zero deletion or reset!")
    except Exception as e:
        db.rollback()
        print(f"Error updating database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    run_update()
