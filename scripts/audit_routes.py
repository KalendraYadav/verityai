import sys
import os

backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, backend_path)

from app.main import app

openapi = app.openapi()
paths = openapi.get("paths", {})
print("Total OpenAPI paths:", len(paths))

total_ops = 0
for path, methods in sorted(paths.items()):
    for method, op in sorted(methods.items()):
        total_ops += 1
        summary = op.get("summary", "")
        tags = ",".join(op.get("tags", []))
        print(f"{method.upper():<7} {path:<55} [{tags}] {summary}")

print(f"Total operations: {total_ops}")
