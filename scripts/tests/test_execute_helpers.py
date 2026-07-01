import importlib.util
import os
import json

SPEC = os.path.join(os.path.dirname(__file__), "..", "seo_os_sync.py")


def _load():
    spec = importlib.util.spec_from_file_location("seo_os_sync", SPEC)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_run_acp_execute_argv_and_parse(monkeypatch):
    mod = _load()
    calls = {}

    class FakeCP:
        returncode = 0
        stdout = json.dumps({"ok": True, "reply": "did it", "session_id": "s9"})
        stderr = ""

    def fake_run(args, **kw):
        calls["args"] = args
        calls["input"] = kw.get("input")
        return FakeCP()

    monkeypatch.setattr(mod.subprocess, "run", fake_run)
    report, sid = mod.run_acp_execute("datawise-seo", "/root/seo-sites/datawiseseo.com", "apply X")
    assert report == "did it" and sid == "s9"
    assert "--execute" in calls["args"]
    assert "datawise-seo" in calls["args"]
    assert calls["input"] == "apply X"


def test_run_acp_execute_raises_on_error(monkeypatch):
    mod = _load()

    class FakeCP:
        returncode = 1
        stdout = json.dumps({"ok": False, "error": "boom"})
        stderr = ""

    monkeypatch.setattr(mod.subprocess, "run", lambda *a, **k: FakeCP())
    try:
        mod.run_acp_execute("p", "/tmp", "x")
        assert False, "expected RuntimeError"
    except RuntimeError as e:
        assert "boom" in str(e)


def test_compose_execute_prompt_has_action_and_framing():
    mod = _load()
    appr = {"title": "Fix meta title", "requested_action": "Rewrite title on /post/x",
            "evidence": "GSC low CTR", "source_url": "/post/x"}
    p = mod.compose_execute_prompt(appr)
    assert "Rewrite title on /post/x" in p
    assert "already approved" in p.lower()
    assert "deploy" in p.lower()
