"""Repo-level contracts: version files stay in lockstep, served copies never drift."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def test_version_file_matches_worker_version():
    version = (ROOT / "VERSION").read_text().strip()
    ts = (ROOT / "dashboard" / "src" / "version.ts").read_text()
    m = re.search(r'VERSION\s*=\s*"([^"]+)"', ts)
    assert m, "dashboard/src/version.ts must export const VERSION = \"x.y.z\""
    assert m.group(1) == version

def test_served_bridge_copies_do_not_drift():
    for name in ("seo_os_sync.py", "acp_chat.py"):
        src = (ROOT / "scripts" / name).read_bytes()
        served = (ROOT / "dashboard" / "public" / name).read_bytes()
        assert src == served, f"dashboard/public/{name} drifted from scripts/{name}"
