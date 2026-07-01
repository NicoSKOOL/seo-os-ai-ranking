import importlib.util
import os
import sqlite3

SPEC = os.path.join(os.path.dirname(__file__), "..", "seo_os_sync.py")


def _load():
    spec = importlib.util.spec_from_file_location("seo_os_sync", SPEC)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _db():
    c = sqlite3.connect(":memory:")
    c.row_factory = sqlite3.Row
    c.executescript(
        "CREATE TABLE clients(id TEXT, hermes_profile TEXT, workspace TEXT, domain TEXT, telegram_topic TEXT);"
        "CREATE TABLE approval_requests(id TEXT, client_id TEXT, title TEXT, requested_action TEXT,"
        " evidence TEXT, source_url TEXT, status TEXT, decision_note TEXT, updated_at TEXT);"
        "CREATE TABLE agent_tasks(id TEXT, client_id TEXT, title TEXT, priority TEXT, status TEXT,"
        " source TEXT, owner_profile TEXT, page_asset TEXT, next_action TEXT, notes TEXT,"
        " created_at TEXT, updated_at TEXT);"
        "CREATE TABLE activity_events(id TEXT, client_id TEXT, kind TEXT, summary TEXT, created_at TEXT);"
    )
    c.execute("INSERT INTO clients VALUES('datawise','datawise-seo','/root/seo-sites/datawiseseo.com','www.datawiseseo.com','')")
    c.execute("INSERT INTO approval_requests VALUES('appr1','datawise','Fix title','Rewrite title',"
              "'ev','/post/x','needs_review','',NULL)")
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
