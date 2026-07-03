import importlib.util
import os
import pathlib
import sqlite3

SPEC = os.path.join(os.path.dirname(__file__), "..", "seo_os_sync.py")
LOCAL_SCHEMA = os.path.join(os.path.dirname(__file__), "..", "..", "dashboard", "db", "local-schema.sql")


def _load():
    spec = importlib.util.spec_from_file_location("seo_os_sync", SPEC)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    # Build against the real local (VPS) schema, not a hand-rolled stand-in,
    # so drift between this test and the actual tables gets caught.
    c.executescript(pathlib.Path(LOCAL_SCHEMA).read_text())
    c.execute(
        "INSERT INTO clients (id,name,domain,role,status,health_score,hermes_profile,"
        "telegram_topic,gsc_status,ga4_status,repo_status,workspace,created_at,updated_at) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ("datawise", "DataWise SEO", "www.datawiseseo.com", "client", "active", 80,
         "datawise-seo", "", "connected", "connected", "connected",
         "/root/seo-sites/datawiseseo.com", "2026-01-01T00:00:00", "2026-01-01T00:00:00"),
    )
    c.execute(
        "INSERT INTO approval_requests (id,client_id,title,type,risk,status,requested_action,"
        "evidence,source_url,agent_confidence,production_gate,created_at,updated_at,decision_note) "
        "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        ("appr1", "datawise", "Fix title", "content", "low", "needs_review", "Rewrite title",
         "ev", "/post/x", "high", "manual", "2026-01-01T00:00:00", "2026-01-01T00:00:00", ""),
    )
    c.commit()
    return c


def _cmd():
    return {"type": "execute_approved_task",
            "payload_json": '{"approval_id":"appr1","source_url":"/post/x","title":"Fix title",'
                            '"requested_action":"Rewrite title","note":"go"}'}


def test_executes_when_enabled(monkeypatch):
    mod = _load()
    monkeypatch.setattr(mod, "EXECUTE_ENABLED", True)
    monkeypatch.setattr(mod, "run_acp_execute", lambda *a, **k: ("Updated title; deployed live.", "s1"))
    conn = _db()
    res = mod.apply_command(conn, _cmd())
    assert res["status"] == "done"
    assert res["result"]["executed"] is True
    task = conn.execute("SELECT status, notes FROM agent_tasks").fetchone()
    assert task["status"] == "done"
    assert "Updated title" in task["notes"]
    appr = conn.execute("SELECT status, decision_note FROM approval_requests").fetchone()
    assert appr["status"] == "approved"
    assert "Updated title" in appr["decision_note"]
    assert conn.execute("SELECT count(*) c FROM activity_events").fetchone()["c"] == 1


def test_records_failure(monkeypatch):
    mod = _load()
    monkeypatch.setattr(mod, "EXECUTE_ENABLED", True)

    def boom(*a, **k):
        raise RuntimeError("build failed")

    monkeypatch.setattr(mod, "run_acp_execute", boom)
    conn = _db()
    res = mod.apply_command(conn, _cmd())
    assert res["status"] == "failed"
    assert "build failed" in res["error"]
    assert conn.execute("SELECT status FROM agent_tasks").fetchone()["status"] == "failed"


def test_legacy_when_disabled(monkeypatch):
    mod = _load()
    monkeypatch.setattr(mod, "EXECUTE_ENABLED", False)
    conn = _db()
    res = mod.apply_command(conn, _cmd())
    assert res["status"] == "done"
    assert conn.execute("SELECT status FROM agent_tasks").fetchone()["status"] == "ready"
