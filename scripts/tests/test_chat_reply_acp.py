import importlib.util
import os
import json

SPEC = os.path.join(os.path.dirname(__file__), "..", "seo_os_sync.py")


def _load():
    spec = importlib.util.spec_from_file_location("seo_os_sync", SPEC)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_run_acp_chat_parses_json(monkeypatch):
    mod = _load()
    calls = {}

    class FakeCP:
        returncode = 0
        stdout = json.dumps({"ok": True, "reply": "hello", "session_id": "sid-1"}) + "\n"
        stderr = ""

    def fake_run(args, **kw):
        calls["args"] = args
        calls["input"] = kw.get("input")
        return FakeCP()

    monkeypatch.setattr(mod.subprocess, "run", fake_run)
    reply, sid = mod.run_acp_chat("datawise-seo", "/root/seo-sites/datawiseseo.com", "hi", None)
    assert reply == "hello"
    assert sid == "sid-1"
    assert "acp_chat.py" in " ".join(calls["args"])
    assert "--profile" in calls["args"] and "datawise-seo" in calls["args"]
    assert calls["input"] == "hi"


def test_run_acp_chat_raises_on_error(monkeypatch):
    mod = _load()

    class FakeCP:
        returncode = 1
        stdout = json.dumps({"ok": False, "error": "boom"})
        stderr = ""

    monkeypatch.setattr(mod.subprocess, "run", lambda *a, **k: FakeCP())
    try:
        mod.run_acp_chat("p", "/tmp", "hi", None)
        assert False, "expected RuntimeError"
    except RuntimeError as e:
        assert "boom" in str(e)
