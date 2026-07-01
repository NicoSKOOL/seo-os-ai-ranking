import importlib.util
import os

SPEC = os.path.join(os.path.dirname(__file__), "..", "acp_chat.py")


def _load():
    spec = importlib.util.spec_from_file_location("acp_chat", SPEC)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_collect_reply_text_joins_and_strips():
    mod = _load()
    assert mod.collect_reply_text(["P", "ONG"]) == "PONG"
    assert mod.collect_reply_text(["  hi ", "there\n"]) == "hi there"
    assert mod.collect_reply_text([]) == ""


def test_permission_kind_by_mode():
    mod = _load()
    assert mod.permission_kind(False) == "denied"
    assert mod.permission_kind(True) == "allowed"
