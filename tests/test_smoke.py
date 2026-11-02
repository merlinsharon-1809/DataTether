"""
DataTether — Automated Smoke Test Suite
Verifies backend connectivity, core endpoints, and dataset retrieval.
Uses standard library urllib (no external dependencies required).
"""

import sys
import json
import urllib.request
import urllib.error

BASE_URL = "http://127.0.0.1:8000"

def run_test(name: str, url: str, expected_code: int = 200) -> bool:
    print(f"[*] Testing {name} ({url})...", end=" ")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "DataTether-SmokeTest"})
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            body = response.read().decode("utf-8")
            data = json.loads(body)
            if status == expected_code:
                print(f"[PASS] (HTTP {status})")
                return True
            else:
                print(f"[FAIL] (Expected {expected_code}, got {status})")
                return False
    except urllib.error.URLError as e:
        print(f"[FAIL] ({e})")
        return False
    except Exception as e:
        print(f"[FAIL] (Unexpected error: {e})")
        return False

def main():
    print("=" * 60)
    print("DataTether Smoke Verification Suite")
    print(f"Target Base URL: {BASE_URL}")
    print("=" * 60)

    results = []

    # 1. Health Endpoint
    results.append(run_test("Backend Health", f"{BASE_URL}/api/health"))

    # 2. Datasets Endpoint
    results.append(run_test("Dataset Registry", f"{BASE_URL}/api/datasets"))

    # 3. Lineage Relationships Endpoint
    results.append(run_test("Lineage Relationships", f"{BASE_URL}/api/lineage/relationships/all"))

    print("=" * 60)
    passed = sum(1 for r in results if r)
    total = len(results)
    print(f"Summary: {passed}/{total} tests passed.")

    if passed == total:
        print("[SUCCESS] All smoke tests PASSED! DataTether backend is healthy and demo-ready.")
        return 0
    else:
        print("[WARNING] One or more smoke tests FAILED. Ensure the backend server is running.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
