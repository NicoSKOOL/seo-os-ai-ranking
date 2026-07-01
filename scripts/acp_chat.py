#!/usr/bin/env python3
"""Run ONE ACP chat turn against `hermes -p <profile> acp` and print JSON.

Executed by the Hermes venv Python (so `import acp` works). The sync bridge
calls this as a subprocess; it never imports this module.

CLI:  python acp_chat.py --profile P --workspace W [--session SID] [--timeout N]
      message text is read from stdin
Out:  one JSON line: {"ok": true, "reply": "...", "session_id": "..."}
                  or {"ok": false, "error": "..."}
"""
import argparse
import asyncio
import json
import sys

HERMES = "/root/.local/bin/hermes"


def collect_reply_text(chunks):
    """Join streamed agent text chunks into a single stripped reply."""
    return "".join(chunks).strip()


def _build_client():
    """Construct the ACP client class lazily so the module imports without acp."""
    from acp.schema import (
        RequestPermissionResponse, DeniedOutcome, ReadTextFileResponse,
        WriteTextFileResponse, CreateTerminalResponse, TerminalOutputResponse,
        WaitForTerminalExitResponse, ReleaseTerminalResponse, TerminalExitStatus,
    )

    class RelayChatClient:
        def __init__(self):
            self.chunks = []
            self.denied = 0

        async def session_update(self, session_id, update, **kw):
            content = getattr(update, "content", None)
            text = getattr(content, "text", None) if content is not None else None
            if text:
                self.chunks.append(text)

        async def request_permission(self, options, session_id, tool_call, **kw):
            # Stage 1: deny everything (edits are handled in Stage 2 via cards).
            self.denied += 1
            return RequestPermissionResponse(outcome=DeniedOutcome(outcome="cancelled"))

        async def read_text_file(self, path, session_id, limit=None, line=None, **kw):
            try:
                with open(path) as f:
                    data = f.read()
            except Exception as e:  # noqa: BLE001
                data = f"<<read error: {e}>>"
            return ReadTextFileResponse(content=data)

        async def write_text_file(self, content, path, session_id, **kw):
            return WriteTextFileResponse()

        async def create_terminal(self, command, session_id, args=None, cwd=None,
                                  env=None, output_byte_limit=None, **kw):
            return CreateTerminalResponse(terminal_id="relay-term-1")

        async def terminal_output(self, session_id, terminal_id, **kw):
            return TerminalOutputResponse(
                output="", exit_status=TerminalExitStatus(exit_code=0, signal=None),
                truncated=False)

        async def wait_for_terminal_exit(self, session_id, terminal_id, **kw):
            return WaitForTerminalExitResponse(exit_code=0, signal=None)

        async def release_terminal(self, session_id, terminal_id, **kw):
            return ReleaseTerminalResponse()

        async def kill_terminal(self, *a, **kw):
            return None

        async def ext_method(self, method, params):
            return {}

        async def ext_notification(self, method, params):
            return None

    return RelayChatClient


async def _run_turn(profile, workspace, message, session_id, timeout):
    from acp import spawn_agent_process
    from acp.schema import ClientCapabilities, FileSystemCapabilities, TextContentBlock

    fs_fields = FileSystemCapabilities.model_fields.keys()
    fs_kwargs = {k: True for k in fs_fields if "read" in k or "write" in k}
    caps = ClientCapabilities(fs=FileSystemCapabilities(**fs_kwargs), terminal=True)
    client = _build_client()()

    async with spawn_agent_process(client, HERMES, "-p", profile, "acp",
                                   cwd=workspace) as (conn, proc):
        await asyncio.wait_for(
            conn.initialize(protocol_version=1, client_capabilities=caps), timeout=60)
        if session_id:
            try:
                await asyncio.wait_for(
                    conn.load_session(cwd=workspace, session_id=session_id), timeout=60)
                sid = session_id
            except Exception:
                sess = await asyncio.wait_for(conn.new_session(cwd=workspace), timeout=60)
                sid = sess.session_id
        else:
            sess = await asyncio.wait_for(conn.new_session(cwd=workspace), timeout=60)
            sid = sess.session_id
        await asyncio.wait_for(
            conn.prompt(prompt=[TextContentBlock(type="text", text=message)],
                        session_id=sid),
            timeout=timeout)
        return collect_reply_text(client.chunks), sid


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", required=True)
    ap.add_argument("--workspace", required=True)
    ap.add_argument("--session", default=None)
    ap.add_argument("--timeout", type=float, default=180.0)
    args = ap.parse_args()
    message = sys.stdin.read()
    try:
        reply, sid = asyncio.run(
            _run_turn(args.profile, args.workspace, message, args.session, args.timeout))
        print(json.dumps({"ok": True, "reply": reply, "session_id": sid}))
    except Exception as e:  # noqa: BLE001
        print(json.dumps({"ok": False, "error": repr(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
