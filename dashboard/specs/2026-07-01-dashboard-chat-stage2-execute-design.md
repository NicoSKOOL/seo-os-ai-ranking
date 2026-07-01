# SEO OS Dashboard Chat Stage 2: approve-to-execute design

Date: 2026-07-01
Status: Approved. Ready for implementation plan.
Owner: Nico

## Goal

Close the loop on dashboard chat. Today chat can only read, research, and
propose. Stage 2 makes an approved proposal actually happen: when the operator
approves a card, the client's Hermes agent executes the change end to end (edit
files, build/QA, and deploy to production) in that client's repo, then reports
exactly what it did. The approval card is the single gate.

Builds on Stage 1 (ACP relay, live) and reuses the existing Phase B approval
pipeline (approve -> `execute_approved_task` command -> bridge).

## Decisions (locked 2026-07-01)

- **Model: propose -> approve -> execute.** Chat stays a non-blocking analyst
  that proposes; execution happens only after an approval. No mid-turn blocking,
  so no bridge deadlock.
- **Execution scope: full, including production deploy.** One approval can take a
  change all the way live. The card must state when it will deploy.
- Execution **re-derives** the change from the approved instruction (it does not
  replay a byte-exact diff). It reports precisely what it changed; everything is
  in the client's git repo, so changes are reviewable and revertible.

## Architecture

```
Chat turn (Stage 1, unchanged): agent PROPOSES -> proposal block -> approval card
        (edits attempted mid-chat are still auto-denied; chat does not execute)

Operator taps Approve on a card
  -> Worker POST /api/approvals/:id/decision  (existing Phase B)
  -> enqueues `execute_approved_task` command (existing)
  -> bridge claims it (existing)
        NEW: bridge runs a headless EXECUTE turn via acp_chat.py --execute
             on the client's profile + workspace, instruction = the approved
             action; edit approvals AUTO-ALLOWED; shell/build/deploy run.
  -> capture the agent's report; record result:
       - approval_requests: status 'approved', decision_note += result summary
       - agent_tasks: upsert a terminal row (status 'done' | 'failed') with the
         summary (so it never sits 'ready' for another runner to double-execute)
       - activity_events: "Executed: <title> - <summary|error>"
  -> command result_json returns the summary (surfaced on the card)
```

## Components and changes

### 1. `scripts/acp_chat.py`: add an execute mode
- New flag `--execute` (default off = Stage 1 chat behavior).
- In the ACP `Client.request_permission`: if execute mode, return an **allowed**
  outcome (auto-approve the edit) instead of the current denied outcome. Chat
  mode keeps denying.
- Longer default timeout in execute mode (build + deploy can be slow):
  `EXECUTE_TIMEOUT` ~ 900s, still overridable by `--timeout`.
- Everything else (session, streaming, reply capture) is unchanged. Returns the
  agent's report as `reply`.

### 2. `scripts/seo_os_sync.py`: run execution on approval
- Add `run_acp_execute(profile, workspace, instruction, timeout)` -> `(report,
  session_id)`, same subprocess shape as `run_acp_chat` but passing `--execute`.
  Use a fresh session per execution (no `--session`) so it starts clean.
- Add `compose_execute_prompt(approval)` -> a precise instruction built from the
  approval fields (title, requested_action, evidence, source_url) that tells the
  agent: "You are EXECUTING a change the operator has already approved. Apply it
  fully in this repo: make the edits, build/QA, and deploy to production if the
  change warrants it. Do not ask for confirmation. When done, reply with a short
  factual summary of exactly what you changed and whether you deployed."
- In `apply_command` `execute_approved_task`: after resolving the approval and
  the client's `hermes_profile` + workspace, **run the execute turn**, then:
  - on success: converge approval to 'approved' with `decision_note` = the report
    (truncated), upsert the `agent_tasks` row as status 'done' with the report in
    notes, add an `activity_events` row, return `{status:'done', result:{report}}`.
  - on failure (subprocess/timeout/agent error): converge approval note with the
    error, upsert `agent_tasks` status 'failed', add an `activity_events` row,
    return `{status:'failed', error}`. The existing re-approve path re-drives to
    pending so the operator can retry.
  - The `agent_tasks` row is written in a TERMINAL state (done/failed), never
    'ready', so nothing else picks it up and double-executes.

### 3. `scripts/seo_os_sync.py`: chat prompt tweak (proposals are now executable)
- `compose_chat_prompt` keeps chat propose-only, but the proposal instructions
  gain: "Approving a proposal will EXECUTE it (including a production deploy if
  your requested_action implies one), so make requested_action complete and
  unambiguous, and set risk/production_gate to reflect whether it goes live."

### 4. Worker / frontend
- No new endpoints. The execute result already flows back via
  `POST /agent/commands/:id/complete`. Confirm the completion handler updates the
  approval status from the result and surfaces `decision_note`/summary on the card
  (small change only if it does not already). The card's existing fields (risk,
  production_gate) communicate "this will deploy."

## Safety model

- The approval card is the single human gate. Chat itself never executes; only an
  approved card does. Cards that will deploy say so via risk/production_gate.
- Execution needs no operator input once approved, so it runs to completion: no
  mid-turn wait, no deadlock.
- Isolation preserved: execution runs only in the approved client's profile +
  workspace (its own repo + boundaries + SOUL, which already say "no production
  changes without approval"; the approval IS that approval).
- Reviewable: all edits land in the client's git repo; a bad change is revertible.
- Kill switch: `SEO_OS_CHAT_ENABLED` still gates chat; a separate constant
  `EXECUTE_ENABLED` (env `SEO_OS_EXECUTE_ENABLED`, default off) gates execution so
  the two can be turned on independently. When execute is off, approving records
  the decision and creates a 'ready' task exactly like today (old behavior).

## Known tradeoffs

- A long build/deploy blocks the bridge command loop for its duration (other
  commands queue behind it). Acceptable for single-operator use; Stage 3
  (warm/concurrent sessions) addresses it.
- Re-derivation (not byte-exact replay) means the executed change is what the
  agent does from the approved instruction; mitigated by a precise instruction, a
  factual report, and git-tracked, revertible changes.

## Testing

- Unit (`scripts/tests/`):
  - `acp_chat.py`: execute mode makes `request_permission` return an allowed
    outcome; chat mode still denies. (Test the client method directly.)
  - `run_acp_execute` builds the right argv (`--execute`, profile, workspace) and
    parses `{ok,reply,session_id}` (subprocess mocked), and raises on `ok:false`.
  - `compose_execute_prompt` includes the approved title + requested_action and
    the "already approved / apply fully" framing.
  - `execute_approved_task` with execution mocked: success path converges approval
    to 'approved', writes a terminal agent_tasks row + activity event; failure path
    records the error and a 'failed' task; never leaves a 'ready' row.
- Integration (VPS, careful):
  - A benign approved action that edits a file in a test/client repo and does NOT
    deploy: verify the file changed and the report/records are written.
  - A real deploy is validated by the operator on a real card once the mechanism
    is proven, since it changes live production.

## Rollout

- Ship with `SEO_OS_EXECUTE_ENABLED` unset (off): behavior identical to today.
- Turn on by setting the env on the VPS bridge and restarting, same reversible
  pattern as `SEO_OS_CHAT_ENABLED`.
