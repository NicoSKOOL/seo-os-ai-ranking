import importlib.util
import os
import sqlite3

SPEC = os.path.join(os.path.dirname(__file__), "..", "seo_os_sync.py")


def _load():
    spec = importlib.util.spec_from_file_location("seo_os_sync", SPEC)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_session_store_roundtrip():
    mod = _load()
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    mod.ensure_chat_sessions_table(conn)
    assert mod.get_acp_session_id(conn, "k1") is None
    mod.set_acp_session_id(conn, "k1", "sid-abc")
    assert mod.get_acp_session_id(conn, "k1") == "sid-abc"
    mod.set_acp_session_id(conn, "k1", "sid-def")  # upsert
    assert mod.get_acp_session_id(conn, "k1") == "sid-def"
