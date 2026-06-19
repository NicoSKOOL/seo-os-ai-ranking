#!/usr/bin/env python3
"""Create a basic SEO OS Google Sheet from tab definitions.

This is intentionally minimal. It creates the tabs and starter headers, then future
scripts can apply richer formatting or pull real data.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

DEFAULT_GAPI = Path('/root/.hermes/skills/productivity/productivity-document-workflows/references/absorbed/google-workspace/scripts/google_api.py')
if DEFAULT_GAPI.exists():
    sys.path.insert(0, str(DEFAULT_GAPI.parent))
try:
    from google_api import build_service  # type: ignore
except Exception as exc:  # pragma: no cover
    raise SystemExit(f'Google API helper not available. Configure Google Workspace auth first. Error: {exc}')

ROOT = Path(__file__).resolve().parents[1]
TABS_PATH = ROOT / 'templates' / 'google-sheet' / 'sheet-tabs.json'

STARTER_HEADERS = {
    'Control Center': ['Action needed','Client','Item','Status','How to handle it','Where','Why / context','Related URL'],
    'Clients': ['Client','Domain','Role','Operating status','SEO OS home','Home status','Site repo','Repo status','Hermes profile','Telegram topic'],
    'Agent Responsibilities': ['Client','Area','Responsibility','What the agent does','Cadence / trigger','Output the user sees','Approval needed?','Status'],
    'Schedule': ['Client','Job','What it does','Cadence','Next run','Last run','Status','Latest result'],
    'Activity Log': ['Date','Client','Source','Type','What happened','Next action','Related item'],
    'Approvals': ['Client','Approval item','Type','Risk','Status','Requested action','URL / asset','Notes'],
    'SEO Opportunities': ['Client','URL / page','Problem','Priority','Impressions','Clicks','CTR','Position','Recommended workflow','Status'],
    'CTR Tests': ['Client','Page / URL','Target query or cluster','Current title/meta','Proposed title/meta','Start date','End / review date','Starting clicks','Starting impressions','Starting CTR','Status','Result / next action'],
    'Review Management': ['Client','Platform','Review date','Rating','Review summary','Suggested response','Approval needed?','Status','Owner notes','Next action'],
    'Agent Tasks': ['Client','Task','Priority','Status','Source','Page / asset','Next action','Notes / blocker'],
    'Telegram Routing': ['Client','Telegram target/topic','Hermes profile','Purpose','Status'],
    'Performance Snapshot': ['Client','Current period','Previous period','Clicks','Clicks Δ','Impressions','Impressions Δ','CTR','CTR Δ pts','Ranking keywords','Keyword Δ','Avg keyword rank','Rank Δ'],
    'Content & Expertise': ['Client','Month','Topic','Content type','Priority','SME input needed?','Question status','Client response status','Response quality','Knowledge saved?','Draft status','Next action'],
}


def main() -> None:
    tabs = json.loads(TABS_PATH.read_text())['tabs']
    sheets = build_service('sheets', 'v4')
    spreadsheet = sheets.spreadsheets().create(body={
        'properties': {'title': 'SEO OS Control Center'},
        'sheets': [{'properties': {'title': tabs[0]}}]
    }, fields='spreadsheetId,spreadsheetUrl,sheets.properties').execute()
    spreadsheet_id = spreadsheet['spreadsheetId']

    existing = {spreadsheet['sheets'][0]['properties']['title']}
    requests = []
    for tab in tabs[1:]:
        if tab not in existing:
            requests.append({'addSheet': {'properties': {'title': tab}}})
    if requests:
        sheets.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body={'requests': requests}).execute()

    for tab in tabs:
        values = [[tab], [], STARTER_HEADERS.get(tab, [])]
        sheets.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"'{tab}'!A1",
            valueInputOption='USER_ENTERED',
            body={'values': values},
        ).execute()

    print(json.dumps({'spreadsheet_id': spreadsheet_id, 'url': spreadsheet['spreadsheetUrl'], 'tabs': tabs}, indent=2))

if __name__ == '__main__':
    main()
