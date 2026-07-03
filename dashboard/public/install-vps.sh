#!/usr/bin/env bash
# SEO OS: connect this VPS to your dashboard. Usage:
#   bash install-vps.sh <DASHBOARD_URL> <AGENT_TOKEN>       first install
#   bash install-vps.sh --update                            refresh scripts + restart
set -euo pipefail

ENV_FILE=/root/.seo-os-sync.env
DATA_DIR=/root/seo-os-dashboard/data
DB_PATH=$DATA_DIR/seo-os.sqlite
SERVICE=seo-os-sync

say(){ printf '\n== %s\n' "$*"; }
die(){ printf 'ERROR: %s\n' "$*" >&2; exit 1; }

if [[ "${1:-}" == "--update" ]]; then
  [[ -f $ENV_FILE ]] || die "No $ENV_FILE found. Run the full install first."
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  say "Refreshing bridge scripts from $SEO_OS_URL"
  for f in seo_os_sync.py acp_chat.py; do
    [[ -f /root/$f ]] && cp "/root/$f" "/root/$f.bak-$(date +%Y%m%d%H%M%S)"
    curl -fsSL "$SEO_OS_URL/$f" -o "/root/$f" || die "Download of $f failed."
  done
  systemctl restart "$SERVICE"
  say "Updated. Service status:"; systemctl --no-pager --lines=3 status "$SERVICE" || true
  exit 0
fi

DASH_URL=${1:-}; TOKEN=${2:-}
[[ -n $DASH_URL ]] || { read -rp "Dashboard URL (https://....workers.dev): " DASH_URL; }
[[ -n $TOKEN    ]] || { read -rp "Agent token (starts with seo_os_): " TOKEN; }
DASH_URL=${DASH_URL%/}

say "Checking prerequisites"
command -v python3 >/dev/null || die "python3 is required."
command -v systemctl >/dev/null || die "systemd is required."
command -v hermes >/dev/null || die "Hermes not found on PATH. Install Hermes v0.17+ first."
HERMES_BIN=$(command -v hermes)
# The chat/execute runner needs Hermes's bundled venv python (it imports 'acp').
VENV_PY=""
for cand in /usr/local/lib/hermes-agent/venv/bin/python3 "$(dirname "$(readlink -f "$HERMES_BIN")")/python3"; do
  [[ -x $cand ]] && "$cand" -c 'import acp' 2>/dev/null && VENV_PY=$cand && break
done
if [[ -z $VENV_PY ]]; then
  read -rp "Path to Hermes venv python (python3 that can 'import acp'), or Enter to skip chat: " VENV_PY
fi

say "Downloading the bridge from your dashboard"
for f in seo_os_sync.py acp_chat.py; do
  curl -fsSL "$DASH_URL/$f" -o "/root/$f" || die "Download of $f failed. Is $DASH_URL correct?"
done

say "Creating the local database (if absent)"
mkdir -p "$DATA_DIR"
if [[ ! -f $DB_PATH ]]; then
  curl -fsSL "$DASH_URL/local-schema.sql" -o /tmp/seo-os-local-schema.sql \
    || die "Download of local-schema.sql failed."
  python3 - "$DB_PATH" /tmp/seo-os-local-schema.sql <<'PYEOF'
import sqlite3, sys, pathlib
db = sqlite3.connect(sys.argv[1])
db.executescript(pathlib.Path(sys.argv[2]).read_text())
db.commit(); print("db created:", sys.argv[1])
PYEOF
fi

say "Registering your clients"
echo "Your Hermes profiles:"; hermes profile list 2>/dev/null || echo "(could not list profiles)"
while true; do
  read -rp "Add a client? (y/n): " yn; [[ $yn == y* ]] || break
  read -rp "  Client name: " CNAME
  read -rp "  Domain (example.com): " CDOMAIN
  read -rp "  Hermes profile for this client: " CPROFILE
  read -rp "  Workspace folder on this VPS: " CWORKSPACE
  CID=$(echo "$CDOMAIN" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9' '-' | sed 's/-*$//;s/^-*//')
  python3 - "$DB_PATH" "$CID" "$CNAME" "$CDOMAIN" "$CPROFILE" "$CWORKSPACE" <<'PYEOF'
import sqlite3, sys, datetime
db = sqlite3.connect(sys.argv[1]); now = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
db.execute("""INSERT INTO clients (id,name,domain,role,status,hermes_profile,workspace,created_at,updated_at)
              VALUES (?,?,?,?,?,?,?,?,?)
              ON CONFLICT(id) DO UPDATE SET name=excluded.name, hermes_profile=excluded.hermes_profile,
                workspace=excluded.workspace, updated_at=excluded.updated_at""",
           (sys.argv[2], sys.argv[3], sys.argv[4], "client", "active", sys.argv[5], sys.argv[6], now, now))
db.commit(); print("client saved:", sys.argv[2])
PYEOF
done

say "Writing $ENV_FILE"
[[ -f $ENV_FILE ]] && cp "$ENV_FILE" "$ENV_FILE.bak-$(date +%Y%m%d%H%M%S)"
cat > "$ENV_FILE" <<EOF
SEO_OS_URL=$DASH_URL
SEO_OS_TOKEN=$TOKEN
SEO_OS_DB=$DB_PATH
SEO_OS_CHAT_ENABLED=true
SEO_OS_EXECUTE_ENABLED=false
HERMES_VENV_PY=$VENV_PY
EOF
chmod 600 "$ENV_FILE"

say "Installing systemd service"
cat > /etc/systemd/system/$SERVICE.service <<EOF
[Unit]
Description=SEO OS dashboard sync bridge
After=network-online.target

[Service]
Type=simple
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/python3 /root/seo_os_sync.py --interval 120
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now $SERVICE

say "First push"
set -a; source "$ENV_FILE"; set +a
python3 /root/seo_os_sync.py --once && say "SUCCESS. Refresh your dashboard: your clients are live." \
  || die "First push failed. Check: systemctl status $SERVICE"

echo
echo "Approve-to-execute is OFF (safe default). To turn it on later:"
echo "  sed -i 's/SEO_OS_EXECUTE_ENABLED=false/SEO_OS_EXECUTE_ENABLED=true/' $ENV_FILE && systemctl restart $SERVICE"
