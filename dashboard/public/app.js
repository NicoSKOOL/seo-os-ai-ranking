/* ===========================================================================
   SEO OS : AI SEO Command Center (vanilla JS single-page app)
   Recreates the finished Claude Design template, wired to GET /api/summary.
   No framework, no build step. Served as static assets by the Worker.
   =========================================================================== */

'use strict';

/* Chat (Phase C) runs via the ACP relay: Telegram parity (full tools + memory, per
   client, inside the client's folder), file edits gated. Backend enable is the
   SEO_OS_CHAT_ENABLED env on the VPS bridge; this flag shows the chat button. */
const CHAT_UI_ENABLED = true;

/* ---------- tone palette (lifted verbatim from the design's helper script) -- */
const TONE = {
  green:  { bg:'#E7F5EC', fg:'#166337', dot:'#1F7A43' },
  amber:  { bg:'#FBF1DA', fg:'#8A6314', dot:'#D9A021' },
  red:    { bg:'#FBE7E4', fg:'#9E2B20', dot:'#C0392B' },
  blue:   { bg:'#E7EEFE', fg:'#1D4ED8', dot:'#2563EB' },
  purple: { bg:'#F1E9FB', fg:'#6D28D9', dot:'#7C3AED' },
  slate:  { bg:'#EDF1F4', fg:'#54636B', dot:'#7E8C8A' },
};

/* sidebar nav (label + icon key) : matches the spec's 13 sections */
const NAV = [
  ['Command Center','grid'], ['Clients / Sites','building'], ['Approvals','shield'],
  ['Opportunities','trend'], ['Agent Tasks','list'], ['Task Board','board'],
  ['Content','edit'], ['Schedule','calendar'], ['Activity Log','pulse'],
  ['CTR Tests','target'], ['Reviews','star'], ['Agent Capabilities','caps'],
  ['Settings','settings'],
];

/* stroke SVG inner-paths (use currentColor so they recolor with nav state) */
const ICONS = {
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  building:'<path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16"/><path d="M19 21V11a2 2 0 0 0-2-2h-2"/><path d="M9 7h2M9 11h2M9 15h2"/>',
  shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 11 2 2 4-4"/>',
  trend:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  list:'<path d="M3 6h11M3 12h11M3 18h8"/><path d="m17 6 1.5 1.5L22 4"/>',
  board:'<rect x="3" y="3" width="6" height="18" rx="1.5"/><rect x="11" y="3" width="6" height="12" rx="1.5"/><rect x="19" y="3" width="2.5" height="8" rx="1.25"/>',
  edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  pulse:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  target:'<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  star:'<polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9"/>',
  caps:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  settings:'<circle cx="12" cy="12" r="3.2"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  globe:'<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20A15 15 0 0 1 12 2z"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  bell:'<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  send:'<path d="m22 2-7 20-4-9-9-4 20-7z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  check:'<path d="M20 6 9 17l-5-5"/>',
  chev:'<path d="m9 18 6-6-6-6"/>',
  link:'<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  clock:'<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  sparkle:'<path d="m12 3 1.9 5.8a2 2 0 0 0 1.3 1.3L21 12l-5.8 1.9a2 2 0 0 0-1.3 1.3L12 21l-1.9-5.8a2 2 0 0 0-1.3-1.3L3 12l5.8-1.9a2 2 0 0 0 1.3-1.3z"/>',
  logout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
};

/* ---------- app state ---------- */
const state = {
  section:'Command Center',
  client:'all',
  apprFilter:'All',
  oppFilter:'All',
  reviewRange:'12m',
  reviewTheme:null,
  data:null,
  account:null,
};

/* ---------- tiny helpers ---------- */
const $ = sel => document.querySelector(sel);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString('en-US');
const ctrFmt = n => `${Number(n || 0).toFixed(2)}%`;
const pos1 = n => Number(n || 0).toFixed(1);
const label = s => { const t = String(s || '').replaceAll('_',' '); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; };
const trunc = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };

function pagePath(u){ try { return new URL(u).pathname; } catch (e) { return u || ''; } }
function friendlyTime(s){
  if(!s) return '·';
  const iso = String(s).includes('T') ? s : String(s).replace(' ','T') + 'Z';
  const d = new Date(iso);
  if(isNaN(d.getTime())) return String(s);
  return d.toLocaleString('en-US',{ month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false });
}

/* tone resolvers */
const GREEN = ['approved','ok','active','complete','completed','done','connected','ready','tracked','not_applicable','on'];
const AMBER = ['needs_review','waiting','waiting_for_approval','setup_needed','needs_setup','needs_changes','paused','task_created','needs_approval','not_connected','not_bound'];
const RED   = ['rejected','failed','blocked'];
const BLUE  = ['new','running','backlog'];
function statusTone(s){
  s = String(s || '').toLowerCase();
  if(GREEN.includes(s)) return 'green';
  if(AMBER.includes(s)) return 'amber';
  if(RED.includes(s)) return 'red';
  if(BLUE.includes(s)) return 'blue';
  return 'slate';
}
function priorityTone(p){ p = String(p || '').toLowerCase(); return p === 'high' ? 'red' : p === 'medium' ? 'amber' : 'slate'; }
function connTone(s){ return statusTone(s); }

/* client identity */
function byId(id){ return (state.data.clients || []).find(c => c.id === id); }
function clientName(id){ if(id === 'all') return 'All Clients'; const c = byId(id); return c ? c.name : (id || 'Unknown'); }
function clientTone(id){
  if(id === 'all') return 'slate';
  const c = byId(id);
  if(!c) return 'slate';
  if(c.status === 'setup') return 'amber';
  const actives = (state.data.clients || []).filter(x => x.status !== 'setup');
  const i = actives.findIndex(x => x.id === id);
  const palette = ['green','blue','purple','red','slate'];
  return palette[(i < 0 ? 0 : i) % palette.length];
}

/* DOM fragment builders */
function svg(key, size = 17, strokeWidth = 1.9){
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key] || ICONS.grid}</svg>`;
}
function dot(tone = 'slate', size = 8, ring = false){
  const t = TONE[tone] || TONE.slate;
  return `<span class="dot" style="width:${size}px;height:${size}px;background:${t.dot}${ring ? `;box-shadow:0 0 0 3px ${t.bg}` : ''}"></span>`;
}
function badge(text, tone = 'slate'){ return `<span class="badge ${tone}">${esc(text)}</span>`; }
function clientCell(id){ return `<span class="client-cell">${dot(clientTone(id), 9)}<span>${esc(clientName(id))}</span></span>`; }

/* section-card header */
function secHead({ icon, tone = 'slate', title, sub, count, countTone, action, bordered }){
  const t = TONE[tone] || TONE.slate;
  const right = action
    ? `<div class="sec-action">${action}</div>`
    : (count !== undefined ? `<span class="sec-count ${countTone || ''}">${esc(count)}</span>` : '');
  return `<div class="sec-head${bordered ? ' bordered' : ''}">
    <span class="sec-icon" style="background:${t.bg};color:${t.fg}">${svg(icon, 17)}</span>
    <div class="sec-titles"><div class="sec-title">${esc(title)}</div>${sub ? `<div class="sec-sub">${esc(sub)}</div>` : ''}</div>
    ${right}
  </div>`;
}
function pageTitle(title, sub){ return `<div class="page-title"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>`; }
function table(headers, rows, colspan){
  const body = rows.length ? rows.join('') : `<tr><td class="empty-row" colspan="${colspan || headers.length}">Nothing here for this view yet.</td></tr>`;
  return `<div class="table-wrap"><table class="seo-table"><thead><tr>${headers.map(h =>
    `<th class="th${h.cls ? ' ' + h.cls : ''}">${esc(h.t)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* ---------- auth + data fetch ---------- */
async function boot(){
  state.account = null;
  try {
    const res = await fetch('/api/me', { headers:{ 'accept':'application/json' } });
    const data = await res.json();
    if(data && data.account){
      state.account = data.account;
      await load('all');
    } else {
      const setup = await fetch('/api/setup').then(r => r.json()).catch(() => ({setup_needed:false}));
      if(setup.setup_needed){ renderSetup(); return; }
      renderLogin();
    }
  } catch (err) {
    console.error('[SEO OS] auth check failed', err);
    renderLogin();
  }
}

async function load(client = state.client){
  state.client = client;
  try {
    const res = await fetch(`/api/summary?client=${encodeURIComponent(client)}`, { headers:{ 'accept':'application/json' } });
    if(res.status === 401){ state.account = null; state.data = null; renderLogin(); return; }
    if(!res.ok) throw new Error('HTTP ' + res.status);
    state.data = await res.json();
    renderApp();
  } catch (err) {
    console.error('[SEO OS] load failed', err);
    $('#app').className = '';
    $('#app').innerHTML = `<div style="padding:48px;font-family:'Plus Jakarta Sans',sans-serif;color:#9E2B20">Could not load SEO OS data (${esc(err.message)}). Is the Worker running?</div>`;
  }
}

async function doLogout(){
  try { await fetch('/api/logout', { method:'POST' }); }
  catch (err) { console.error('[SEO OS] logout request failed', err); }
  state.account = null;
  state.data = null;
  boot();
}

/* ---------- toast notifications ---------- */
function toast(msg, tone = 'slate'){
  let host = document.getElementById('toast-host');
  if(!host){ host = document.createElement('div'); host.id = 'toast-host'; document.body.appendChild(host); }
  const t = TONE[tone] || TONE.slate;
  const el = document.createElement('div');
  el.className = 'toast';
  el.style.borderLeftColor = t.dot;
  el.innerHTML = `<span class="toast-dot" style="background:${t.dot}"></span><span class="toast-msg">${esc(msg)}</span>`;
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 5200);
}

/* ---------- approval decision (POST /api/approvals/:id/decision) ---------- */
async function decide(id, decision, btn, editedReply){
  // optimistic: replace the card's actions with a "queued" pill so the operator sees
  // instant feedback even though Hermes applies the decision asynchronously on the VPS.
  const card = btn && btn.closest('.appr-card');
  if(card){
    card.querySelectorAll('[data-act="decision"]').forEach(b => { b.disabled = true; });
    const actions = card.querySelector('.appr-actions');
    if(actions){
      const word = decision === 'approved' ? 'Queued for Hermes' : 'Saving decision';
      actions.innerHTML = `<span class="queued-pill">${svg('clock', 13, 2)}${word}…</span>`;
    }
  }
  try {
    const res = await fetch(`/api/approvals/${encodeURIComponent(id)}/decision`, {
      method:'POST', headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ decision, note:'', edited_reply: editedReply || undefined })
    });
    if(res.status === 401){ state.account = null; state.data = null; renderLogin(); return; }
    if(!res.ok) throw new Error('HTTP ' + res.status);
    if(decision === 'approved'){
      toast('Approved. Hermes is picking this up now: a bounded task and a Telegram confirm appear within a few seconds.', 'green');
    } else {
      toast(`Decision saved: ${label(decision)}. Hermes will hold for your next instruction.`, 'slate');
    }
    await load(state.client);   // re-render with fresh server state
  } catch (err){
    console.error('[SEO OS] decision failed', err);
    toast('Could not save that decision. Please try again.', 'red');
    await load(state.client);   // re-render to restore the buttons
  }
}

/* ---------- task detail slide-over (Phase A) ---------- */
function closeTaskPanel(){ const e = document.getElementById('task-panel'); if(e) e.remove(); }
function openTaskPanel(id){
  const t = (state.data && state.data.tasks || []).find(x => x.id === id);
  if(!t) return;
  closeTaskPanel();
  const waiting = ['waiting_for_approval','needs_approval'].includes(t.status);
  const row = (k, v, cls) => v ? `<div class="so-row"><span class="so-k">${esc(k)}</span><span class="so-v ${cls || ''}">${esc(v)}</span></div>` : '';
  const el = document.createElement('div');
  el.id = 'task-panel';
  el.className = 'slideover-backdrop';
  el.innerHTML = `<aside class="slideover" role="dialog" aria-modal="true" aria-label="Task detail">
    <div class="slideover-head">
      <div class="so-badges">${badge(label(t.status), statusTone(t.status))}${badge(label(t.priority) + ' priority', priorityTone(t.priority))}</div>
      <button class="slideover-x" data-act="closePanel" aria-label="Close">${svg('logout', 15, 2)}</button>
    </div>
    <div class="slideover-body">
      <div class="so-client">${dot(clientTone(t.client_id), 9)}<span>${esc(clientName(t.client_id))}</span></div>
      <h2 class="so-title">${esc(t.title)}</h2>
      ${t.next_action ? `<div class="so-next"><div class="so-k">Next action</div><div class="so-next-v">${esc(t.next_action)}</div></div>` : ''}
      <div class="so-rows">
        ${row('Page / asset', t.page_asset, 'mono')}
        ${row('Owner profile', t.owner_profile, 'mono')}
        ${row('Source', t.source)}
        ${row('Created', friendlyTime(t.created_at))}
        ${row('Updated', friendlyTime(t.updated_at))}
      </div>
      ${t.notes ? `<div class="so-notes"><div class="so-k">Notes</div><p>${esc(t.notes)}</p></div>` : ''}
    </div>
    <div class="slideover-foot">
      ${waiting ? `<button class="btn primary" data-act="go" data-val="Approvals">Go to Approvals</button>` : ''}
      <button class="btn ghost" data-act="closePanel">Close</button>
    </div>
  </aside>`;
  document.body.appendChild(el);
}

/* ---------- Chat with Hermes (Phase C) ---------- */
const chat = { open:false, scope:null, messages:[], pending:false, sending:false, pollTimer:null };

function chatScopeLabel(){ return state.client === 'all' ? 'Orchestrator · all clients' : clientName(state.client); }
function stopChatPoll(){ if(chat.pollTimer){ clearTimeout(chat.pollTimer); chat.pollTimer = null; } }

async function chatFetch(){
  try {
    const res = await fetch(`/api/chat?client=${encodeURIComponent(state.client)}`, { headers:{ 'accept':'application/json' } });
    if(res.status === 401){ state.account = null; state.data = null; renderLogin(); return; }
    if(!res.ok) return;
    const data = await res.json();
    chat.messages = Array.isArray(data.messages) ? data.messages : [];
    chat.pending = !!data.pending;
  } catch(err){ console.error('[SEO OS] chat fetch failed', err); }
  renderChatBody();
  stopChatPoll();
  if(chat.open && chat.pending) chat.pollTimer = setTimeout(chatFetch, 3000);
}

function openChat(){
  chat.open = true;
  if(chat.scope !== state.client){ chat.scope = state.client; chat.messages = []; chat.pending = false; }
  renderChatPanel();
  chatFetch();
}
function closeChat(){ chat.open = false; stopChatPoll(); const e = document.getElementById('chat-panel'); if(e) e.remove(); }

function renderChatPanel(){
  let el = document.getElementById('chat-panel');
  if(!el){ el = document.createElement('div'); el.id = 'chat-panel'; document.body.appendChild(el); }
  el.innerHTML = `<div class="chat-win" role="dialog" aria-label="Chat with Hermes">
    <div class="chat-head">
      <span class="chat-head-ico"><img class="hermes-ico" src="/hermes-avatar.png" alt="Hermes"></span>
      <div class="chat-head-t"><div class="chat-title">Chat with Hermes</div><div class="chat-scope">${esc(chatScopeLabel())}</div></div>
      <button class="slideover-x" data-act="chatClose" aria-label="Close chat">${svg('logout', 15, 2)}</button>
    </div>
    <div class="chat-body" id="chat-body"></div>
    <form class="chat-composer" id="chat-form">
      <textarea id="chat-input" class="chat-input" rows="1" placeholder="Ask about ${esc(chatScopeLabel())}…"></textarea>
      <button class="chat-send" type="submit" aria-label="Send">${svg('send', 15, 2)}</button>
    </form>
  </div>`;
  renderChatBody();
}

function renderChatBody(){
  const b = document.getElementById('chat-body');
  if(!b) return;
  if(!chat.messages.length && !chat.pending){
    b.innerHTML = `<div class="chat-empty"><img class="hermes-ico" src="/hermes-avatar.png" alt="Hermes"><p>Ask Hermes about ${esc(chatScopeLabel())}. It reads your data, researches, and drafts. Anything actionable comes back as an approval card you tap, never a live change.</p></div>`;
    return;
  }
  const rows = chat.messages.map(m => {
    const who = m.role === 'assistant' ? 'a' : 'o';
    return `<div class="chat-msg ${who}${m.status === 'failed' ? ' failed' : ''}"><div class="chat-bubble">${esc(m.body)}</div></div>`;
  }).join('');
  const thinking = chat.pending ? `<div class="chat-msg a"><div class="chat-bubble thinking"><i></i><i></i><i></i></div></div>` : '';
  b.innerHTML = rows + thinking;
  b.scrollTop = b.scrollHeight;
}

async function chatSend(text){
  text = (text || '').trim();
  if(!text || chat.sending) return;
  chat.sending = true;
  chat.messages.push({ id:'tmp', role:'operator', body:text, status:'pending', created_at:new Date().toISOString() });
  chat.pending = true;
  renderChatBody();
  try {
    const res = await fetch('/api/chat/messages', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ client_id: state.client, section: state.section, body: text }) });
    if(res.status === 401){ state.account = null; state.data = null; renderLogin(); return; }
    if(!res.ok) throw new Error('HTTP ' + res.status);
    await chatFetch();
  } catch(err){
    console.error('[SEO OS] chat send failed', err);
    toast('Could not send that message. Please try again.', 'red');
  } finally { chat.sending = false; }
}

/* ---------- login screen ---------- */
const BRAND_LOGO = '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="4" height="8" rx="1" fill="#2E9155"/><rect x="10" y="8" width="4" height="13" rx="1" fill="#58B27A"/><rect x="17" y="3" width="4" height="18" rx="1" fill="#1F7A43"/></svg>';

function renderLogin(){
  const app = $('#app');
  app.className = '';
  app.innerHTML = `<div class="login-screen">
    <div class="card login-card">
      <div class="login-brand">${BRAND_LOGO}<div class="b-text"><span class="login-name">SEO OS</span><span class="login-sub">AI SEO Command Center</span></div></div>
      <form id="login-form" class="login-form" novalidate>
        <label class="field"><span class="field-label">Email</span><input id="login-email" class="input" type="email" autocomplete="email" placeholder="you@example.com" autofocus></label>
        <label class="field"><span class="field-label">Password</span><input id="login-password" class="input" type="password" autocomplete="current-password" placeholder="Your password"></label>
        <button id="login-btn" class="login-btn" type="submit">Sign in</button>
        <div id="login-error" class="login-error" role="alert" style="display:none"></div>
      </form>
    </div>
  </div>`;
  const email = document.getElementById('login-email');
  if(email) email.focus();
}

/* ---------- first-boot setup wizard ---------- */
function renderSetup(){
  const app = $('#app');
  app.className = '';
  app.innerHTML = `<div class="login-screen">
    <div class="card login-card">
      <div class="login-brand">${BRAND_LOGO}<div class="b-text"><span class="login-name">SEO OS</span><span class="login-sub">First-time setup</span></div></div>
      <p class="login-hint">Welcome! Your dashboard is deployed. Create the operator account to claim it.</p>
      <form id="setup-form" class="login-form" novalidate>
        <label class="field"><span class="field-label">Workspace name</span><input id="setup-name" class="input" type="text" placeholder="My SEO OS"></label>
        <label class="field"><span class="field-label">Email</span><input id="setup-email" class="input" type="email" autocomplete="email" placeholder="you@example.com" autofocus></label>
        <label class="field"><span class="field-label">Password (8+ characters)</span><input id="setup-password" class="input" type="password" autocomplete="new-password"></label>
        <label class="field"><span class="field-label">Repeat password</span><input id="setup-password2" class="input" type="password" autocomplete="new-password"></label>
        <button id="setup-btn" class="login-btn" type="submit">Create my dashboard</button>
        <div id="setup-error" class="login-error" role="alert" style="display:none"></div>
      </form>
    </div>
  </div>`;
  const name = document.getElementById('setup-name');
  if(name) name.focus();
}

function renderSetupDone(res){
  const app = $('#app');
  app.className = '';
  app.innerHTML = `<div class="login-screen">
    <div class="card login-card">
      <div class="login-brand">${BRAND_LOGO}<div class="b-text"><span class="login-name">SEO OS</span><span class="login-sub">One step left</span></div></div>
      <p class="login-hint"><strong>Save your agent token now.</strong> It is shown only once. Your VPS uses it to talk to this dashboard.</p>
      <label class="field"><span class="field-label">Agent token</span>
        <div class="copy-row"><code id="setup-token">${esc(res.agent_token)}</code>
        <button class="btn" data-act="copySetup" data-target="setup-token">Copy</button></div></label>
      <label class="field"><span class="field-label">Run this ONE command on your VPS (as root)</span>
        <div class="copy-row"><code id="setup-cmd">${esc(res.install_command)}</code>
        <button class="btn" data-act="copySetup" data-target="setup-cmd">Copy</button></div></label>
      <button class="login-btn" data-act="setupContinue">I saved both, open my dashboard</button>
    </div>
  </div>`;
}

/* =====================================================================
   SHELL: sidebar + topbar + context bar
   ===================================================================== */
function renderSidebar(){
  const d = state.data, k = d.kpis;
  const navHtml = NAV.map(([name, ico]) => {
    const active = state.section === name;
    const badgeHtml = (name === 'Approvals' && k.pending_approvals)
      ? `<span class="nav-badge">${k.pending_approvals}</span>` : '';
    return `<button class="nav-item${active ? ' active' : ''}" data-act="nav" data-val="${esc(name)}">
      <span class="ico">${svg(ico, 18, 1.7)}</span><span class="nav-label">${esc(name)}</span>${badgeHtml}</button>`;
  }).join('');

  const healthy = k.system_health === 'OK';
  const jobs = d.jobs || [];
  const onTime = jobs.filter(j => ['ok','running','paused'].includes(j.status)).length;
  const avg = (d.clients || []).length ? Math.round((d.clients.reduce((a, c) => a + (c.health_score || 0), 0)) / d.clients.length) : 0;
  const pct = Math.max(8, Math.min(100, avg || (healthy ? 92 : 50)));

  return `<aside class="sidebar">
    <div class="brand">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="4" height="8" rx="1" fill="#2E9155"/><rect x="10" y="8" width="4" height="13" rx="1" fill="#58B27A"/><rect x="17" y="3" width="4" height="18" rx="1" fill="#1F7A43"/></svg>
      <div class="b-text"><span class="b-name">SEO OS</span><span class="b-sub">AI SEO COMMAND CENTER</span></div>
    </div>
    <div class="nav">${navHtml}</div>
    <div class="sys-status">
      <div class="ss-head"><span class="ss-label">SYSTEM STATUS</span><span class="ss-state${healthy ? '' : ' bad'}">${healthy ? 'Healthy' : 'Issue'}</span></div>
      <div class="ss-bar"><i style="width:${pct}%"></i></div>
      <div class="ss-line"><span class="ss-dot"></span><span class="ss-text">Hermes ${healthy ? 'online' : 'needs attention'} · ${onTime} / ${jobs.length} jobs on time</span></div>
    </div>
    <div class="sidebar-version" id="sidebar-version">${versionInfo ? versionInfo.html : ''}</div>
  </aside>`;
}

/* ---------- version footer + update check (fetched once per page load; cached
   so re-renders from nav clicks don't wipe the sidebar footer or re-fetch) ---------- */
let versionInfo = null;
function checkVersion(){
  if(versionInfo) return;
  fetch('/api/health').then(r => r.json()).then(async h => {
    if(!h.version) return;
    versionInfo = { html: 'v' + esc(h.version) };
    const el = document.getElementById('sidebar-version');
    if(el) el.innerHTML = versionInfo.html;
    try {
      const res = await fetch('https://raw.githubusercontent.com/NicoSKOOL/seo-os-ai-ranking/main/VERSION');
      if (!res.ok) return;
      const up = (await res.text()).trim();
      if (!/^\d+\.\d+\.\d+$/.test(up)) return;
      if(up !== h.version){
        versionInfo.html = 'v' + esc(h.version) + ' &middot; <a href="https://github.com/NicoSKOOL/seo-os-ai-ranking/blob/main/UPDATING.md" target="_blank" rel="noopener">Update available (v' + esc(up) + ')</a>';
        const el2 = document.getElementById('sidebar-version');
        if(el2) el2.innerHTML = versionInfo.html;
      }
    } catch (e) { /* offline or blocked: stay silent */ }
  }).catch(() => {});
}

function renderTopbar(){
  const d = state.data, k = d.kpis;
  const pills = [`<button class="pill${state.client === 'all' ? ' active' : ''}" data-act="client" data-val="all">${dot('slate', 7)}All Clients</button>`]
    .concat((d.clients || []).map(c =>
      `<button class="pill${state.client === c.id ? ' active' : ''}" data-act="client" data-val="${esc(c.id)}">${dot(clientTone(c.id), 7)}${esc(c.name)}</button>`))
    .concat([`<button class="pill add" data-act="addClient"><span style="display:inline-flex">${svg('plus', 14, 2)}</span>Add Client</button>`]);

  const stamp = d.sync && d.sync.stale
    ? 'Demo data · worker not connected yet'
    : `Refreshed ${friendlyTime(d.sync && d.sync.last_agent_sync)} UTC`;
  const acctName = (state.account && state.account.name) ? state.account.name : (d.account && d.account.name) || 'SEO OS';
  const initial = acctName.charAt(0).toUpperCase();

  return `<div class="topbar-row">
    <span class="eyebrow">Client</span>
    <div class="client-pills">${pills.join('')}</div>
    <div class="topbar-right">
      <span class="refreshed">${esc(stamp)}</span>
      ${CHAT_UI_ENABLED ? `<button class="icon-btn chat-toggle" data-act="chatOpen" title="Chat with Hermes"><img class="hermes-ico" src="/hermes-avatar.png" alt="Hermes"></button>` : ''}
      <button class="icon-btn" data-act="noop" title="Notifications">${svg('bell', 17, 1.8)}<span class="dot-badge"></span></button>
      <div class="avatar-wrap">
        <button class="avatar avatar-btn" data-act="avatarMenu" aria-haspopup="true" aria-label="Account menu">${esc(initial)}</button>
        <div class="avatar-menu" id="avatar-menu" role="menu" hidden>
          <div class="am-name">Signed in as<b>${esc(acctName)}</b></div>
          <button class="am-item" data-act="logout" role="menuitem">${svg('logout', 15, 1.9)}Log out</button>
        </div>
      </div>
    </div>
  </div>${renderContext()}`;
}

function renderContext(){
  const d = state.data, k = d.kpis;
  const all = state.client === 'all';
  const c = all ? null : byId(state.client);
  const tone = clientTone(state.client);

  let title, domain, chips, status, statusSetup;
  if(all){
    title = 'All Clients';
    domain = `${k.sites_monitored} site${k.sites_monitored === 1 ? '' : 's'} · Telegram → Hermes → Dashboard`;
    chips = [
      ['Sites', k.sites_monitored, 'slate'],
      ['Tasks', k.open_tasks, 'blue'],
      ['Opps', (d.opportunities || []).length, 'green'],
      ['Jobs', k.active_jobs, 'blue'],
    ].map(([kk, vv, t]) => `<span class="chip">${dot(t, 7)}<span class="ck">${kk}</span><span class="cv">${esc(vv)}</span></span>`).join('');
    status = 'All active'; statusSetup = false;
  } else if(c){
    title = c.name; domain = c.domain;
    chips = [
      ['Hermes', c.hermes_profile, 'purple'],
      ['Telegram', label(c.telegram_topic), 'blue'],
      ['GSC', label(c.gsc_status), connTone(c.gsc_status)],
      ['GA4', label(c.ga4_status), connTone(c.ga4_status)],
      ['Repo', label(c.repo_status), connTone(c.repo_status)],
    ].map(([kk, vv, t]) => `<span class="chip">${dot(t, 7)}<span class="ck">${kk}</span><span class="cv">${esc(vv)}</span></span>`).join('');
    status = c.status === 'setup' ? 'Setup pending' : 'Active'; statusSetup = c.status === 'setup';
  } else { title = clientName(state.client); domain = ''; chips = ''; status = 'Active'; statusSetup = false; }

  const scoped = all ? '' : `<span class="ctx-scoped">${svg('lock', 12, 2)} Scoped to ${esc(c ? c.name : title)}</span>`;

  return `<div class="context">
    <div class="ctx-id">${dot(tone, 11)}<div><div class="ctx-title">${esc(title)}</div>${domain ? `<div class="ctx-domain mono">${esc(domain)}</div>` : ''}</div></div>
    <div class="ctx-divider"></div>
    <div class="ctx-chips">${chips}</div>
    <div class="ctx-right">
      ${scoped}
      <span class="ctx-status${statusSetup ? ' setup' : ''}"><i></i>${esc(status)}</span>
      <span class="ctx-appr"><i></i>${k.pending_approvals} pending</span>
      <button class="ctx-refresh" data-act="refresh">${svg('refresh', 14, 2)}Refresh data</button>
    </div>
  </div>`;
}

/* =====================================================================
   VIEW: Command Center
   ===================================================================== */
function viewCommandCenter(){
  const d = state.data, k = d.kpis;

  const arch = `<div class="arch">
    <span class="arch-pill blue"><i></i>Telegram</span><span class="arch-arrow">→</span>
    <span class="arch-pill purple"><i></i>Hermes Agents</span><span class="arch-arrow">→</span>
    <span class="arch-pill dark"><i></i>SEO Dashboard</span>
  </div>`;

  const needSetup = (d.jobs || []).filter(j => ['failed','setup_needed'].includes(j.status)).length;
  const activeCount = (d.visible_clients || []).filter(c => c.status === 'active').length;
  const kpis = [
    kpiCard('Pending Approvals', k.pending_approvals, 'purple', k.pending_approvals ? 'needs human review' : 'nothing waiting', k.pending_approvals ? 'amber' : 'green', 'shield'),
    kpiCard('Open Agent Tasks', k.open_tasks, 'blue', `across ${k.sites_monitored} site${k.sites_monitored === 1 ? '' : 's'}`, 'slate', 'list'),
    kpiCard('High-Impact Opportunities', k.high_impact_opportunities, 'green', 'high priority', 'green', 'trend'),
    kpiCard('Active Scheduled Jobs', k.active_jobs, 'blue', needSetup ? `${needSetup} need setup` : 'all on time', needSetup ? 'amber' : 'green', 'calendar'),
    kpiCard('Sites Monitored', k.sites_monitored, 'slate', `${activeCount} active`, 'green', 'globe'),
    kpiCard('System Health', k.system_health, k.system_health === 'OK' ? 'green' : 'red', k.system_health === 'OK' ? 'no failed jobs' : 'check jobs', k.system_health === 'OK' ? 'green' : 'red', 'pulse'),
  ].join('');

  return `<div>
    <div class="cc-head">
      <div style="min-width:0">
        <h1 style="margin:0;font-size:27px;font-weight:800;letter-spacing:-0.025em;color:#0E1414">SEO OS Command Center</h1>
        <p style="margin:7px 0 0;font-size:14px;color:#5A6968;max-width:560px;line-height:1.5">AI agents, SEO data, approvals, schedules, and client work in one operating layer.</p>
      </div>
      ${arch}
    </div>
    <div class="kpi-grid">${kpis}</div>
    ${ccNeedsAttention()}
    ${ccPerformance()}
    ${ccOpportunities()}
    ${ccClientHealth()}
    ${ccPreviews()}
    ${ccActivity()}
  </div>`;
}

function kpiCard(lbl, value, tone, sub, subTone, icon){
  const t = TONE[tone] || TONE.slate, st = TONE[subTone] || TONE.slate;
  return `<div class="card kpi">
    <div class="kpi-top"><span class="kpi-label">${esc(lbl)}</span><span class="kpi-ico" style="background:${t.bg};color:${t.dot}">${svg(icon, 16)}</span></div>
    <div class="kpi-value">${esc(value)}</div>
    <div class="kpi-sub" style="color:${st.dot}">${esc(sub)}</div>
  </div>`;
}

/* Needs Attention = open approvals + broken/setup jobs + blocked tasks */
function ccNeedsAttention(){
  const d = state.data;
  const rows = [];
  (d.approvals || []).filter(a => ['needs_review','needs_changes'].includes(a.status)).forEach(a => {
    rows.push({ cid:a.client_id, item:a.title, type:'Approval', typeTone:'purple',
      prio: a.risk === 'high' ? 'high' : 'medium', why:a.evidence, action:'Review', actCls:'primary', go:'Approvals' });
  });
  (d.jobs || []).filter(j => ['failed','setup_needed'].includes(j.status)).forEach(j => {
    const broken = j.status === 'failed';
    rows.push({ cid:j.client_id, item: broken ? `${j.name} failed` : `${j.name} needs setup`,
      type: broken ? 'Broken job' : 'Setup', typeTone: broken ? 'red' : 'amber', prio: broken ? 'high' : 'medium',
      why: j.latest_result || 'Agent cannot run this workflow until it is connected.',
      action: broken ? 'Fix' : 'Connect', actCls: broken ? 'danger' : 'ghost', go:'Schedule' });
  });
  (d.tasks || []).filter(t => t.status === 'blocked').forEach(t => {
    rows.push({ cid:t.client_id, item:t.title, type:'Blocker', typeTone:'red', prio:t.priority,
      why:t.next_action, action:'Open', actCls:'ghost', go:'Agent Tasks' });
  });

  const trs = rows.map(r => `<tr>
    <td class="td pl">${clientCell(r.cid)}</td>
    <td class="td" style="font-weight:600;color:#2C3837">${esc(r.item)}</td>
    <td class="td">${badge(r.type, r.typeTone)}</td>
    <td class="td">${badge(label(r.prio), priorityTone(r.prio))}</td>
    <td class="td why">${esc(trunc(r.why, 130))}</td>
    <td class="td pr" style="text-align:right"><button class="btn sm ${r.actCls}" data-act="go" data-val="${esc(r.go)}">${esc(r.action)}</button></td>
  </tr>`);

  return `<div class="card section-card">
    ${secHead({ icon:'alert', tone:'red', title:'Needs Your Attention Today', sub:'Decisions and approvals the agents are waiting on', count:`${rows.length} items`, countTone:'red' })}
    ${table([{t:'Client',cls:'pl'},{t:'Item'},{t:'Type'},{t:'Priority'},{t:'Why it matters'},{t:'Action',cls:'pr r'}], trs, 6)}
  </div>`;
}

function ccPerformance(){
  const d = state.data;
  const visibleIds = new Set((d.visible_clients || []).map(c => c.id));
  const metrics = (d.metrics || []).filter(m => visibleIds.has(m.client_id) && Number(m.impressions) > 0);
  if(!metrics.length) return '';
  const cols = Math.min(metrics.length, 3);
  const cards = metrics.map(m => {
    const cells = [
      ['Clicks', fmt(m.clicks), `${m.clicks_delta >= 0 ? '+' : ''}${fmt(m.clicks_delta)}`, m.clicks_delta >= 0],
      ['Impressions', fmt(m.impressions), `${m.impressions_delta >= 0 ? '+' : ''}${fmt(m.impressions_delta)}`, m.impressions_delta >= 0],
      ['CTR', ctrFmt(m.ctr), `${m.ctr_delta >= 0 ? '+' : ''}${Number(m.ctr_delta).toFixed(2)} pts`, m.ctr_delta >= 0],
      ['Avg rank', pos1(m.avg_rank), `${Math.abs(m.avg_rank_delta).toFixed(1)} ${m.avg_rank_delta <= 0 ? 'better' : 'worse'}`, m.avg_rank_delta <= 0],
    ].map(([l, v, dl, good]) =>
      `<div><div class="pm-label">${l}</div><div class="pm-value">${v}</div><div class="pm-delta ${good ? 'good' : 'bad'}">${dl}</div></div>`).join('');
    return `<div class="card perf-card"><h3>${dot(clientTone(m.client_id), 10)}${esc(clientName(m.client_id))}</h3><div class="perf-metrics">${cells}</div></div>`;
  }).join('');
  return `<div class="perf-wrap">
    <div class="perf-head"><h2>28-Day Performance</h2><span>GSC snapshot vs previous 28 days</span></div>
    <div class="perf-grid" style="grid-template-columns:repeat(${cols},1fr)">${cards}</div>
  </div>`;
}

function ccOpportunities(){
  const d = state.data;
  const opps = (d.opportunities || []).slice().sort((a, b) => b.impressions - a.impressions).slice(0, 6);
  const trs = opps.map(o => `<tr>
    <td class="td pl">${clientCell(o.client_id)}</td>
    <td class="td page mono">${esc(pagePath(o.page))}</td>
    <td class="td muted">${esc(o.problem)}</td>
    <td class="td">${badge(label(o.priority), priorityTone(o.priority))}</td>
    <td class="td r tnum">${fmt(o.impressions)}</td>
    <td class="td r tnum">${fmt(o.clicks)}</td>
    <td class="td r tnum" style="font-weight:600">${ctrFmt(o.ctr)}</td>
    <td class="td pr r tnum">${pos1(o.position)}</td>
  </tr>`);
  return `<div class="card section-card">
    ${secHead({ icon:'trend', tone:'green', title:'High-Impact SEO Opportunities', sub:'High impressions, weak clicks (ranked by impressions)',
      action:`<button class="link-action green" data-act="go" data-val="Opportunities">View all →</button>` })}
    ${table([{t:'Client',cls:'pl'},{t:'Page'},{t:'Problem'},{t:'Priority'},{t:'Impr.',cls:'r'},{t:'Clicks',cls:'r'},{t:'CTR',cls:'r'},{t:'Pos.',cls:'pr r'}], trs, 8)}
  </div>`;
}

function ccClientHealth(){
  const d = state.data;
  const trs = (d.visible_clients || []).map(c => {
    const approvals = (d.approvals || []).filter(a => a.client_id === c.id && a.status === 'needs_review').length;
    const tasks = (d.tasks || []).filter(t => t.client_id === c.id && t.status !== 'done').length;
    const jobs = (d.jobs || []).filter(j => j.client_id === c.id).length;
    const opps = (d.opportunities || []).filter(o => o.client_id === c.id).length;
    return `<tr>
      <td class="td pl"><span style="display:inline-flex;align-items:center;gap:9px;white-space:nowrap">${dot(clientTone(c.id), 9)}<span style="display:flex;flex-direction:column;line-height:1.25"><span style="font-weight:700;color:#1A2322">${esc(c.name)}</span><span class="mono" style="font-size:11px;color:#7E8C8A">${esc(c.domain)}</span></span></span></td>
      <td class="td">${badge(`${c.health_score}% · ${label(c.status)}`, statusTone(c.status))}</td>
      <td class="td c" style="font-weight:700;color:#6D28D9">${approvals}</td>
      <td class="td c" style="font-weight:600">${tasks}</td>
      <td class="td c" style="font-weight:600">${jobs}</td>
      <td class="td c" style="font-weight:600;color:#166337">${opps}</td>
      <td class="td muted">${esc(trunc(lastActivity(c.id), 48))}</td>
      <td class="td pr" style="font-weight:600;color:#166337;max-width:280px">${esc(trunc(nextAction(c), 70))}</td>
    </tr>`;
  });
  return `<div class="card section-card">
    ${secHead({ icon:'building', tone:'blue', title:'Client Health Summary', sub:'Workload and next action per site' })}
    ${table([{t:'Client',cls:'pl'},{t:'Status'},{t:'Appr.',cls:'c'},{t:'Tasks',cls:'c'},{t:'Jobs',cls:'c'},{t:'Opps',cls:'c'},{t:'Last activity'},{t:'Recommended next action',cls:'pr'}], trs, 8)}
  </div>`;
}
function lastActivity(cid){
  const evs = (state.data.events || []).filter(e => e.client_id === cid);
  if(!evs.length) return '·';
  evs.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  return evs[0].summary;
}
function nextAction(c){
  if(c.status === 'setup') return 'Connect GSC, GA4, and review source';
  const opp = (state.data.opportunities || []).filter(o => o.client_id === c.id).sort((a, b) => b.impressions - a.impressions)[0];
  if(opp && opp.recommended_workflow) return opp.recommended_workflow;
  const task = (state.data.tasks || []).find(t => t.client_id === c.id && t.next_action);
  if(task) return task.next_action;
  return 'Review the latest opportunities';
}

function ccPreviews(){
  const d = state.data;
  const appr = (d.approvals || []).filter(a => a.type !== 'policy').slice(0, 3).map(a =>
    `<div class="preview-row">${dot(clientTone(a.client_id), 8)}<div class="pr-main"><div class="pr-title">${esc(a.title)}</div><div class="pr-sub">${esc(clientName(a.client_id))} · ${esc(label(a.type))}</div></div>${badge(label(a.status), statusTone(a.status))}</div>`).join('') || emptyPreview('No approvals waiting.');
  const jobs = (d.jobs || []).slice(0, 6).map(j =>
    `<div class="preview-row">${dot(statusTone(j.status), 8, true)}<div class="pr-main"><div class="pr-title">${esc(j.name)}</div><div class="pr-sub">${esc(clientName(j.client_id))}</div></div><div class="pr-time"><b>${esc(j.next_run)}</b><small>${esc(j.cadence)}</small></div></div>`).join('') || emptyPreview('No scheduled jobs.');

  return `<div class="two-col">
    <div class="card preview-card">
      ${secHead({ icon:'shield', tone:'purple', title:'Approval Inbox', sub:'Agent recommendations awaiting decision', bordered:true, action:`<button class="link-action purple" data-act="go" data-val="Approvals">Open →</button>` })}
      <div class="preview-list">${appr}</div>
    </div>
    <div class="card preview-card">
      ${secHead({ icon:'calendar', tone:'blue', title:'Next Scheduled Work', sub:'Upcoming recurring agent jobs', bordered:true, action:`<button class="link-action blue" data-act="go" data-val="Schedule">All →</button>` })}
      <div class="preview-list">${jobs}</div>
    </div>
  </div>`;
}
function emptyPreview(msg){ return `<div class="preview-row"><div class="pr-main"><div class="pr-sub">${esc(msg)}</div></div></div>`; }

function ccActivity(){
  const d = state.data;
  const trs = (d.events || []).slice(0, 7).map(e => activityRow(e, false));
  return `<div class="card section-card" style="margin-bottom:0">
    ${secHead({ icon:'pulse', tone:'slate', title:'Agent Activity', sub:'Important outcomes only, not a Telegram transcript' })}
    ${table([{t:'Time',cls:'pl'},{t:'Client'},{t:'Source'},{t:'Type'},{t:'What happened'},{t:'Next action',cls:'pr'}], trs, 6)}
  </div>`;
}
function activitySourceTone(s){ s = String(s || '').toLowerCase(); if(s === 'telegram') return 'blue'; if(s === 'approval') return 'purple'; if(s === 'managed_job') return 'blue'; return 'slate'; }
function activityRow(e, withStatus){
  return `<tr>
    <td class="td pl" style="color:#7E8C8A;white-space:nowrap">${esc(friendlyTime(e.created_at))}</td>
    <td class="td">${clientCell(e.client_id)}</td>
    <td class="td">${badge(label(e.source), activitySourceTone(e.source))}</td>
    <td class="td">${badge(label(e.event_type), statusTone(e.status))}</td>
    ${withStatus ? `<td class="td">${badge(label(e.status), statusTone(e.status))}</td>` : ''}
    <td class="td" style="color:#2C3837">${esc(e.summary)}</td>
    <td class="td muted pr" style="max-width:340px">${esc(e.next_action)}</td>
  </tr>`;
}

/* =====================================================================
   VIEW: Clients / Sites
   ===================================================================== */
function viewClients(){
  const d = state.data;
  const cards = (d.visible_clients || []).map(c => {
    const tasks = (d.tasks || []).filter(t => t.client_id === c.id && t.status !== 'done').length;
    const opps = (d.opportunities || []).filter(o => o.client_id === c.id).length;
    const jobs = (d.jobs || []).filter(j => j.client_id === c.id).length;
    const approvals = (d.approvals || []).filter(a => a.client_id === c.id && a.status === 'needs_review').length;
    const fields = [
      ['Role', esc(c.role), ''],
      ['Hermes profile', esc(c.hermes_profile), 'mono'],
      ['Telegram topic', esc(label(c.telegram_topic)), ''],
      ['Workspace', esc(c.workspace), 'mono'],
      ['Search Console', esc(label(c.gsc_status)), '', 'GSC', connTone(c.gsc_status)],
      ['Analytics', esc(label(c.ga4_status)), '', 'GA4', connTone(c.ga4_status)],
      ['Repo / workspace', esc(label(c.repo_status)), '', 'Repo', connTone(c.repo_status)],
      ['Review source', esc(label(c.zernio_status)), '', 'Reviews', connTone(c.zernio_status)],
    ].map(([fk, fv, cls, tag, tagTone]) =>
      `<div class="cc-field"><span class="fk">${fk}</span><span class="fv ${cls}">${fv}</span>${tag ? badge(tag, tagTone) : ''}</div>`).join('');
    const setup = c.status === 'setup';
    return `<div class="card cc-card">
      <div class="cc-hd">${dot(clientTone(c.id), 12)}<div style="flex:1;min-width:0"><div class="cc-name">${esc(c.name)}</div><div class="cc-domain mono">${esc(c.domain)}</div></div>${badge(setup ? 'Setup' : 'Active', setup ? 'amber' : 'green')}</div>
      <div class="cc-fields">${fields}</div>
      <div class="cc-stats">
        <div class="cc-stat"><b>${tasks}</b><span>Open tasks</span></div>
        <div class="cc-stat"><b>${opps}</b><span>Opportunities</span></div>
        <div class="cc-stat"><b>${jobs}</b><span>Active jobs</span></div>
        <div class="cc-stat"><b class="appr">${approvals}</b><span>Pending appr.</span></div>
      </div>
    </div>`;
  }).join('');
  return pageTitle('Clients & Sites', 'Each site maps to the systems Hermes needs to route work safely: workspace, repo, data sources, and Telegram topic.')
    + `<div class="client-grid">${cards}</div>`;
}

/* =====================================================================
   VIEW: Approvals
   ===================================================================== */
function viewApprovals(){
  const d = state.data;
  const filters = ['All','Needs review','Approved'];
  const chips = filters.map(f => `<button class="fchip${state.apprFilter === f ? ' active' : ''}" data-act="apprFilter" data-val="${esc(f)}">${esc(f)}</button>`).join('');

  let rows = d.approvals || [];
  if(state.apprFilter === 'Needs review') rows = rows.filter(a => a.status === 'needs_review');
  if(state.apprFilter === 'Approved') rows = rows.filter(a => a.status === 'approved');

  const cards = rows.map(a => {
    const pending = a.status === 'needs_review';
    const approved = a.status === 'approved';
    const policy = a.type === 'policy';
    let foot;
    if(policy) foot = `<span class="appr-policy">${svg('lock', 15, 2)}Non-negotiable guardrail</span>`;
    else if(approved) foot = `<span class="appr-done">${svg('check', 15, 2.2)}Approved · plan cleared to run</span>`;
    else if(pending) foot = `<button class="btn primary" data-act="decision" data-val="approved" data-id="${esc(a.id)}">Approve</button>
        <button class="btn ghost" data-act="decision" data-val="needs_changes" data-id="${esc(a.id)}">Request Changes</button>
        <button class="btn danger" data-act="decision" data-val="rejected" data-id="${esc(a.id)}">Reject</button>`;
    else foot = badge(label(a.status), statusTone(a.status));
    const tgBtn = `<button class="btn tg ml-auto" data-act="telegram" data-id="${esc(a.id)}">${svg('send', 13, 2)}Telegram</button>`;

    return `<div class="card appr-card"><div class="appr-body">
      <div class="appr-top">${badge(label(a.type), 'purple')}<span class="appr-client">${dot(clientTone(a.client_id), 8)}${esc(clientName(a.client_id))}</span>${badge(label(a.status), statusTone(a.status))}${badge(`${label(a.risk)} risk`, statusTone(a.risk))}</div>
      <div class="appr-title">${esc(a.title)}</div>
      <div class="appr-req"><b>Requested action: </b>${esc(a.requested_action)}</div>
      ${a.evidence ? `<div class="appr-evidence"><b style="color:#0E1414">Evidence: </b>${esc(a.evidence)}${a.production_gate ? `<br><br><b style="color:#0E1414">Safety: </b>${esc(a.production_gate)}` : ''}</div>` : ''}
      ${a.source_url ? `<div class="appr-url">${svg('link', 13, 2)}<span class="u mono">${esc(a.source_url)}</span></div>` : ''}
      <div class="appr-actions">${foot}${tgBtn}</div>
    </div></div>`;
  }).join('') || `<div class="card" style="grid-column:1/-1;padding:28px;color:#7E8C8A">No approvals match this filter.</div>`;

  return pageTitle('Approvals', 'Human approval gate for anything that changes strategy, content, publishing, outreach, or technical SEO. Approving here updates state only.')
    + `<div class="warn-banner">${svg('lock', 16, 2)}<div class="wt"><b>Production changes remain approval-gated.</b> <span>Publishing, deploys, redirects, noindex, canonical changes, and outreach require explicit human approval. This is a non-negotiable guardrail.</span></div></div>`
    + `<div class="filters">${chips}</div>`
    + `<div class="appr-grid">${cards}</div>`;
}

/* =====================================================================
   VIEW: Opportunities
   ===================================================================== */
function viewOpportunities(){
  const d = state.data;
  const filters = ['All','high','medium','low'];
  const chips = filters.map(f => `<button class="fchip${state.oppFilter === f ? ' active' : ''}" data-act="oppFilter" data-val="${esc(f)}">${esc(f === 'All' ? 'All priorities' : label(f) + ' priority')}</button>`).join('');
  let opps = (d.opportunities || []).slice().sort((a, b) => b.impressions - a.impressions);
  if(state.oppFilter !== 'All') opps = opps.filter(o => String(o.priority).toLowerCase() === state.oppFilter);

  const trs = opps.map((o, i) => `<tr>
    <td class="td pl c" style="font-weight:800;color:#AAB5B3">${i + 1}</td>
    <td class="td">${clientCell(o.client_id)}</td>
    <td class="td page mono">${esc(pagePath(o.page))}</td>
    <td class="td muted">${esc(o.problem)}</td>
    <td class="td">${badge(label(o.priority), priorityTone(o.priority))}</td>
    <td class="td r tnum">${fmt(o.impressions)}</td>
    <td class="td r tnum">${fmt(o.clicks)}</td>
    <td class="td r tnum" style="font-weight:600">${ctrFmt(o.ctr)}</td>
    <td class="td r tnum">${pos1(o.position)}</td>
    <td class="td muted" style="max-width:240px">${esc(o.recommended_workflow)}</td>
    <td class="td pr">${badge(label(o.status), statusTone(o.status))}</td>
  </tr>`);

  return pageTitle('SEO Opportunities', 'The opportunity pipeline from Search Console: pages with high impressions but weak clicks, CTR, or ranking position.')
    + `<div class="filters">${chips}</div>`
    + `<div class="card section-card" style="margin-bottom:0">${table([
        {t:'#',cls:'pl c'},{t:'Client'},{t:'Page'},{t:'Problem'},{t:'Priority'},{t:'Impr.',cls:'r'},{t:'Clicks',cls:'r'},{t:'CTR',cls:'r'},{t:'Pos.',cls:'r'},{t:'Recommended workflow'},{t:'Status',cls:'pr'}
      ], trs, 11)}</div>`;
}

/* =====================================================================
   VIEW: Agent Tasks
   ===================================================================== */
function viewTasks(){
  const d = state.data;
  const tasks = d.tasks || [];
  const countBy = s => tasks.filter(t => t.status === s).length;
  const stats = [
    ['Ready', countBy('ready'), 'slate'],
    ['Backlog', countBy('backlog'), 'blue'],
    ['Waiting on approval', countBy('waiting_for_approval'), 'amber'],
    ['Running', countBy('running'), 'blue'],
    ['Blocked', countBy('blocked'), 'red'],
    ['Done', countBy('done'), 'green'],
  ].map(([l, c, t]) => `<div class="stat-chip">${dot(t, 8)}<b>${c}</b><span>${l}</span></div>`).join('');

  const trs = tasks.map(t => `<tr class="rowlink" data-act="taskDetail" data-id="${esc(t.id)}">
    <td class="td pl">${clientCell(t.client_id)}</td>
    <td class="td" style="font-weight:600;color:#2C3837;max-width:360px">${esc(t.title)}<div class="url mono">${esc(pagePath(t.page_asset))}</div></td>
    <td class="td">${badge(label(t.priority), priorityTone(t.priority))}</td>
    <td class="td muted">${esc(t.source)}</td>
    <td class="td muted" style="max-width:300px">${esc(t.next_action)}</td>
    <td class="td pr">${badge(label(t.status), statusTone(t.status))}</td>
  </tr>`);

  return pageTitle('Agent Tasks', 'The execution queue for Hermes: what needs doing, where, and the next action. Dashboard approvals create bounded tasks, not direct production changes.')
    + `<div class="stat-chips">${stats}</div>`
    + `<div class="card section-card" style="margin-bottom:0">${table([
        {t:'Client',cls:'pl'},{t:'Task'},{t:'Priority'},{t:'Source'},{t:'Next action'},{t:'Status',cls:'pr'}
      ], trs, 6)}</div>`;
}

/* =====================================================================
   VIEW: Task Board (kanban : visual only this milestone)
   ===================================================================== */
function viewBoard(){
  const d = state.data;
  const cols = [
    { name:'To Do', tone:'slate', match: s => ['ready','backlog','blocked'].includes(s) },
    { name:'In Progress', tone:'blue', match: s => s === 'running' },
    { name:'Needs Approval', tone:'purple', match: s => ['waiting_for_approval','needs_approval'].includes(s) },
    { name:'Done', tone:'green', match: s => s === 'done' },
  ];
  const tasks = d.tasks || [];
  const colsHtml = cols.map(col => {
    const cards = tasks.filter(t => col.match(t.status)).map(t => `<div class="kcard" data-act="taskDetail" data-id="${esc(t.id)}">
      <div class="kcard-top">${dot(clientTone(t.client_id), 8)}<span class="kcard-client">${esc(clientName(t.client_id))}</span><span class="ml-auto">${badge(label(t.priority), priorityTone(t.priority))}</span></div>
      <div class="kcard-title">${esc(t.title)}</div>
      <div class="kcard-page mono">${esc(pagePath(t.page_asset))}</div>
    </div>`).join('') || `<div class="kcol-empty">No tasks</div>`;
    const n = tasks.filter(t => col.match(t.status)).length;
    return `<div class="kcol"><div class="kcol-head">${dot(col.tone, 8)}<span class="kname">${esc(col.name)}</span><span class="kcol-count">${n}</span></div>${cards}</div>`;
  }).join('');

  return `<div class="board-head">
    <div style="min-width:0">
      <h1 style="margin:0;font-size:27px;font-weight:800;letter-spacing:-0.025em;color:#0E1414">Task Board</h1>
      <p style="margin:7px 0 0;font-size:14px;color:#5A6968;max-width:680px;line-height:1.5">Everything Hermes is running per client, as a board. Cards are grouped by stage. Moving cards saves in a later milestone.</p>
    </div>
    <div class="board-note">${svg('board', 15, 1.7)}<span>${tasks.length} tasks shown</span></div>
  </div>
  <div class="kanban">${colsHtml}</div>`;
}

/* =====================================================================
   VIEW: Content (derived list + on-brand placeholder)
   ===================================================================== */
function viewContent(){
  const d = state.data;
  const items = (d.opportunities || []).filter(o => ['Content refresh','SERP gap','Striking distance'].includes(o.opportunity_type));
  const list = items.map(o => `<tr>
    <td class="td pl">${clientCell(o.client_id)}</td>
    <td class="td page mono">${esc(pagePath(o.page))}</td>
    <td class="td">${badge(label(o.opportunity_type), 'slate')}</td>
    <td class="td">${badge(label(o.priority), priorityTone(o.priority))}</td>
    <td class="td muted" style="max-width:320px">${esc(o.recommended_workflow)}</td>
    <td class="td pr">${badge('Approval-gated', 'amber')}</td>
  </tr>`);
  return pageTitle('Content Pipeline', 'Content and refresh work Hermes can draft for clients. Drafts are approval-gated before any page goes live.')
    + `<div class="card lead-card"><span class="lead-icon slate">${svg('edit', 24, 1.7)}</span><div><h2>Full content pipeline lands in a later milestone</h2><p>The idea → drafting → review → scheduled → published board ships once the content agents are wired in. For now, content opportunities surfaced from Search Console are listed below so nothing is lost.</p></div></div>`
    + `<div class="card section-card" style="margin-bottom:0">${secHead({ icon:'edit', tone:'purple', title:'Content Opportunities', sub:'Refresh existing URLs first. Avoid duplicate or cannibalizing content.' })}${table([
        {t:'Client',cls:'pl'},{t:'Page'},{t:'Content work'},{t:'Priority'},{t:'Recommended workflow'},{t:'Gate',cls:'pr'}
      ], list, 6)}</div>`;
}

/* =====================================================================
   VIEW: Schedule (jobs list)
   ===================================================================== */
function viewSchedule(){
  const d = state.data;
  const jobs = d.jobs || [];
  const behind = jobs.filter(j => ['failed','setup_needed'].includes(j.status));
  const overdue = behind.length
    ? `<div class="overdue">${svg('clock', 15, 2)}<span><b>${behind.length} job${behind.length === 1 ? '' : 's'} behind schedule:</b> ${esc(behind.map(j => j.name).join(', '))}</span></div>`
    : '';
  const trs = jobs.map(j => `<tr>
    <td class="td pl">${clientCell(j.client_id)}</td>
    <td class="td" style="font-weight:600;color:#2C3837;max-width:340px">${esc(j.name)}</td>
    <td class="td muted" style="white-space:nowrap">${esc(j.cadence)}</td>
    <td class="td" style="font-weight:600;color:#1A2322;white-space:nowrap">${esc(j.next_run)}</td>
    <td class="td" style="color:#7E8C8A;white-space:nowrap">${esc(j.last_run)}</td>
    <td class="td pr">${badge(label(j.status), statusTone(j.status))}</td>
  </tr>`);
  return pageTitle('Schedule', 'Recurring agent work managed by the SEO OS scheduler. Job IDs and scripts stay inside Hermes.')
    + overdue
    + `<div class="card section-card" style="margin-bottom:0">${table([
        {t:'Client',cls:'pl'},{t:'Job'},{t:'Cadence'},{t:'Next run'},{t:'Last run'},{t:'Status',cls:'pr'}
      ], trs, 6)}</div>`;
}

/* =====================================================================
   VIEW: Activity Log
   ===================================================================== */
function viewActivity(){
  const d = state.data;
  const trs = (d.events || []).map(e => activityRow(e, true));
  return pageTitle('Activity Log', 'Important outcomes: decisions, approvals, completed work, blockers, and artifacts. Not a chat transcript.')
    + `<div class="card section-card" style="margin-bottom:0">${table([
        {t:'Time',cls:'pl'},{t:'Client'},{t:'Source'},{t:'Type'},{t:'Status'},{t:'What happened'},{t:'Next action',cls:'pr'}
      ], trs, 7)}</div>`;
}

/* =====================================================================
   VIEW: CTR Tests (derived from low-CTR opportunities)
   ===================================================================== */
function viewCtr(){
  const d = state.data;
  const opps = (d.opportunities || []).filter(o => o.opportunity_type === 'Low CTR' || Number(o.ctr) < 2).slice(0, 8);
  const cards = opps.map(o => `<div class="card ctr-card"><div class="ctr-body">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px"><span class="appr-client">${dot(clientTone(o.client_id), 8)}${esc(clientName(o.client_id))}</span>${badge('Awaiting approval', 'purple')}</div>
    <div class="ctr-page mono">${esc(pagePath(o.page))}</div>
    <div class="ctr-target">Target: ${esc(o.problem)}</div>
    <div class="ctr-proposed"><div class="lbl">Proposed title / meta workflow</div><p>${esc(o.recommended_workflow)}</p></div>
    <div class="ctr-metrics">
      <div class="ctr-metric"><b>${ctrFmt(o.ctr)}</b><span>Start CTR</span></div>
      <div class="ctr-metric"><b>${fmt(o.clicks)}</b><span>Clicks</span></div>
      <div class="ctr-metric"><b>${fmt(o.impressions)}</b><span>Impr.</span></div>
    </div>
    <div class="ctr-foot"><span class="note">Position ${pos1(o.position)}. Hermes requests approval before starting.</span><button class="btn primary" data-act="go" data-val="Approvals">Request approval</button></div>
  </div></div>`).join('') || `<div class="card" style="grid-column:1/-1;padding:28px;color:#7E8C8A">No CTR tests or low-CTR opportunities for this view.</div>`;
  return pageTitle('CTR Tests', 'Title and meta tests. Hermes suggests a test, you approve, baseline metrics lock, it runs until there is enough data, then Hermes reports the winner.')
    + `<div class="ctr-grid">${cards}</div>`;
}

/* =====================================================================
   VIEW: Reviews (KPIs, feed, inline draft approve/edit)
   ===================================================================== */
function reviewsFor(d){
  const rows = d.reviews || [];
  return state.client === 'all' ? rows : rows.filter(r => r.client_id === state.client);
}
function starRow(rating){
  let s = '<span class="stars">';
  for(let i=1;i<=5;i++) s += `<span class="${i<=rating?'':'off'}">★</span>`;
  return s + '</span>';
}
/* kpiCard escapes both `value` and `sub` (they go through esc()), so the HTML
   produced by starRow() can't be passed into it: it would render as literal
   angle-bracket text instead of styled stars. This plain-text variant (just
   the ★/☆ characters, no markup) is safe to pass through esc() untouched. */
function starText(rating){
  const r = Math.round(rating);
  return '★'.repeat(r) + '☆'.repeat(5 - r);
}
function bucketReviews(rows, range){
  const now = Date.now(), DAY = 864e5;
  const cfg = range === '30d' ? { n:4, span:7*DAY, label:idx=>`Week ${idx+1}` }
    : range === '12w' ? { n:12, span:7*DAY, label:idx=>`W${idx+1}` }
    : { n:12, span:null, label:null };
  const buckets = [];
  if(cfg.span){
    // idx 0 = oldest bucket, so "Week 1" is the earliest and the newest is last
    for(let i=cfg.n-1;i>=0;i--){
      const end = now - i*cfg.span, start = end - cfg.span;
      buckets.push({ start, end, label: cfg.label(cfg.n-1-i) });
    }
  } else {
    for(let i=11;i>=0;i--){
      const d = new Date(now); d.setUTCDate(1); d.setUTCHours(0,0,0,0); d.setUTCMonth(d.getUTCMonth()-i);
      const e = new Date(d); e.setUTCMonth(e.getUTCMonth()+1);
      buckets.push({ start:d.getTime(), end:e.getTime(), label:d.toLocaleString('en',{month:'short',timeZone:'UTC'}) });
    }
  }
  return buckets.map(b => {
    const inB = rows.filter(r => { const t = new Date(r.published_at).getTime(); return t >= b.start && t < b.end; });
    return { label:b.label, count:inB.length, rating: inB.length ? inB.reduce((a,r)=>a+r.rating,0)/inB.length : null };
  });
}
function reviewTrend(rows){
  const data = bucketReviews(rows, state.reviewRange);
  const W = 800, PAD_L = 26, PAD_R = 8, GREEN = '#1F7A43', AMBER = '#A17015';
  const n = data.length, slot = (W-PAD_L-PAD_R)/n, bw = Math.min(26, slot*0.45);
  const maxC = Math.max(...data.map(d => d.count), 1);
  // panel 1: bars
  let bars = `<svg viewBox="0 0 ${W} 110" role="img" aria-label="Reviews received per period">`;
  [0, maxC].forEach(v => { const y = 92 - (v/maxC)*80;
    bars += `<line class="grid" x1="${PAD_L}" y1="${y}" x2="${W-PAD_R}" y2="${y}"/><text x="${PAD_L-6}" y="${y+3}" text-anchor="end">${v}</text>`; });
  data.forEach((d,i) => {
    const x = PAD_L + slot*i + (slot-bw)/2, h = (d.count/maxC)*80, y = 92 - h;
    bars += d.count > 0
      ? `<path fill="${GREEN}" d="M${x} 92 V${y+3} Q${x} ${y} ${x+3} ${y} H${x+bw-3} Q${x+bw} ${y} ${x+bw} ${y+3} V92 Z"><title>${esc(d.label)} · ${d.count} review${d.count===1?'':'s'}${d.rating?` · ${d.rating.toFixed(1)}★ avg`:''}</title></path>`
      : `<rect x="${x}" y="90" width="${bw}" height="2" rx="1" fill="#DDE3E1"/>`;
    if(i === n-1 && d.count > 0) {
      const labelY = y >= 24 ? y - 5 : y + 14;
      const style = y >= 24 ? '' : ' style="fill:#fff"';
      bars += `<text class="dl" x="${x+bw/2}" y="${labelY}" text-anchor="middle"${style}>${d.count}</text>`;
    }
    bars += `<text x="${PAD_L+slot*i+slot/2}" y="106" text-anchor="middle">${esc(d.label)}</text>`;
  });
  bars += '</svg>';
  // panel 2: rating line, fixed 1..5, gaps on empty buckets
  const ry = v => 82 - ((v-1)/4)*72;
  let line = `<svg viewBox="0 0 ${W} 100" role="img" aria-label="Average rating per period, scale 1 to 5">`;
  [1,3,5].forEach(v => { const y = ry(v);
    line += `<line class="grid" x1="${PAD_L}" y1="${y}" x2="${W-PAD_R}" y2="${y}"/><text x="${PAD_L-6}" y="${y+3}" text-anchor="end">${v}★</text>`; });
  let seg = [], polys = '', last = null;
  data.forEach((d,i) => {
    const x = PAD_L + slot*i + slot/2;
    if(d.rating === null){ if(seg.length > 1) polys += `<polyline fill="none" stroke="${AMBER}" stroke-width="2" points="${seg.join(' ')}"/>`; seg = []; return; }
    seg.push(`${x},${ry(d.rating)}`); last = { x, y:ry(d.rating), r:d.rating };
  });
  if(seg.length > 1) polys += `<polyline fill="none" stroke="${AMBER}" stroke-width="2" points="${seg.join(' ')}"/>`;
  line += polys;
  data.forEach((d,i) => { if(d.rating === null) return; const x = PAD_L + slot*i + slot/2;
    line += `<circle cx="${x}" cy="${ry(d.rating)}" r="4" fill="${AMBER}" stroke="#fff" stroke-width="2"><title>${esc(d.label)} · ${d.rating.toFixed(1)}★ avg of ${d.count}</title></circle>`; });
  if(last) {
    const labelY = last.y >= 24 ? last.y - 9 : last.y + 18;
    line += `<circle cx="${last.x}" cy="${last.y}" r="5.5" fill="${AMBER}" stroke="#fff" stroke-width="2"/><text class="dl" x="${last.x}" y="${labelY}" text-anchor="middle">${last.r.toFixed(1)}★</text>`;
  }
  line += '</svg>';
  const chip = (id, lbl) => `<button class="rchip${state.reviewRange===id?' active':''}" data-act="revRange" data-val="${id}">${lbl}</button>`;
  return `<div class="section-label trend-label">Review trend <span class="range-chips">${chip('30d','30 days')}${chip('12w','12 weeks')}${chip('12m','12 months')}</span></div>
  <div class="card trend-card">
    <div class="trend-panel"><div class="tp-title">Reviews received</div>${bars}</div>
    <div class="trend-panel"><div class="tp-title">Average rating <span class="tp-hint">buckets with no reviews leave a gap</span></div>${line}</div>
  </div>`;
}
function reviewThemes(rows){
  const map = {};
  rows.forEach(r => (r.themes||'').split(',').map(t => t.trim()).filter(Boolean).forEach(t => {
    (map[t] = map[t] || { n:0, sum:0, latest:null }).n++;
    map[t].sum += r.rating;
    if(!map[t].latest || r.published_at > map[t].latest.published_at) map[t].latest = r;
  }));
  const themes = Object.entries(map).map(([name,v]) => ({ name, n:v.n, avg:v.sum/v.n, quote:v.latest ? v.latest.text.slice(0,90) : '' }))
    .sort((a,b) => b.n - a.n);
  if(!themes.length) return '';
  const maxN = themes[0].n;
  const tone = a => a >= 4 ? 'good' : (a >= 3 ? 'mid' : 'bad');
  const best = themes.filter(t => t.avg >= 4).sort((a,b) => b.n - a.n)[0];
  const worst = themes.slice().sort((a,b) => a.avg - b.avg)[0];
  const insight = best && worst && worst.avg < best.avg
    ? `<div class="theme-insight"><span class="ti-ico">${svg('sparkle',13,2)}</span>Customers praise <b>${esc(best.name)}</b> most. <b>${esc(worst.name)}</b> is the theme dragging the rating: ${worst.n} mention${worst.n===1?'':'s'} averaging ${worst.avg.toFixed(1)}★.</div>` : '';
  const rowsHtml = themes.map(t => `<div class="theme-row" data-act="revTheme" data-val="${esc(t.name)}" role="button" title="Click to filter the feed">
    <div class="th-name">${esc(t.name)}${t === worst && t.avg < 3 ? ' ' + badge('Biggest drag','red') : ''}</div>
    <div class="th-bar"><span class="th-fill ${tone(t.avg)}" style="width:${Math.round(t.n/maxN*100)}%"></span></div>
    <div class="th-n">${t.n} mention${t.n===1?'':'s'}</div>
    <div class="th-rate ${tone(t.avg)}">${t.avg.toFixed(1)}★</div>
    <div class="th-quote">"${esc(t.quote)}"</div>
  </div>`).join('');
  return `<div class="section-label">Themes customers mention</div>
  <div class="card themes-card">${insight}${rowsHtml}
    <div class="chip-hint">Bar length = how often the theme comes up. Color = how those reviews rate you. Click a row to filter the feed below.</div>
  </div>`;
}
function reviewCard(r, showClient){
  const initials = esc(r.reviewer.split(/\s+/).map(w => w[0]).join('').slice(0,2).toUpperCase());
  const toneBg = r.rating >= 4 ? '#1F7A43' : (r.rating >= 3 ? '#8A6314' : '#9E2B20');
  const statusBadge = r.reply_status === 'replied' ? badge('Replied','green')
    : r.reply_status === 'draft_ready' ? badge('Draft ready','amber') : badge('Needs reply','amber');
  const tags = (r.themes || '').split(',').filter(Boolean).map(t => `<span class="tag">${esc(t.trim())}</span>`).join('');
  let body = '';
  if(r.reply_status === 'replied'){
    body = `<div class="reply"><div class="rl">Your reply</div><p>${esc(r.reply_text)}</p></div>`;
  } else if(r.reply_status === 'draft_ready'){
    body = `<div class="draft" data-approval="${esc(r.approval_id || '')}">
      <div class="dl">${svg('sparkle',13,2)} Hermes drafted this reply</div>
      <p class="draft-text">${esc(r.reply_text)}</p>
      <div class="draft-actions">
        <button class="btn primary" data-act="revApprove" data-val="${esc(r.approval_id || '')}">Approve reply</button>
        <button class="btn" data-act="revEdit">Edit reply</button>
      </div>
      <div class="learn-note">${svg('edit',12,2)} Your edits teach Hermes your voice. The next draft sounds more like you.</div>
    </div>`;
  } else {
    body = `<div class="waiting">${svg('clock',13,2)} Hermes will draft a reply on its next pass.</div>`;
  }
  return `<div class="card rev">
    <div class="rev-head">
      <div class="avat" style="background:${toneBg}">${initials}</div>
      <div class="rev-who">
        <div class="rev-name">${esc(r.reviewer)}${showClient ? ` <span class="tag">${esc(clientName(r.client_id))}</span>` : ''}</div>
        <div class="rev-meta">${starRow(r.rating)} · ${esc((r.published_at || '').slice(0,10))} · ${esc(label(r.source))}</div>
      </div>
      ${statusBadge}
    </div>
    <p class="rev-text">${esc(r.text)}</p>
    ${tags ? `<div class="tags">${tags}</div>` : ''}
    ${body}
  </div>`;
}
function viewReviews(){
  const d = state.data;
  const rows = reviewsFor(d);
  if(!rows.length){
    return pageTitle('Review Management', 'Hermes watches each connected Google Business Profile, clusters what customers mention, and drafts a reply for every review that has none. Nothing posts without your approval.')
      + `<div class="card lead-card"><span class="lead-icon slate">${svg('star', 24, 1.7)}</span><div><h2>No reviews yet for this view</h2><p>Reviews activate when this client's agent is connected to a Google Business Profile (postproxy.dev) and starts writing reviews to its SEO OS database. See HERMES-INTEGRATION.md for the wiring.</p></div></div>`
      + `<div class="section-label">How Hermes handles reviews</div>
      <div class="how-grid">
        <div class="card how-card"><div style="display:flex;align-items:center;gap:8px"><span class="stars">★★★★★</span>${badge('Approval required', 'amber')}</div><h3>Positive review</h3><p>Thank them, mention the service naturally, and invite them back. Hermes drafts it; you approve before it posts.</p></div>
        <div class="card how-card"><div style="display:flex;align-items:center;gap:8px"><span class="stars">★★★☆☆</span>${badge('Approval required', 'amber')}</div><h3>Neutral review</h3><p>Acknowledge the mixed experience and show what improves next. Drafted for your approval.</p></div>
        <div class="card how-card"><div style="display:flex;align-items:center;gap:8px"><span class="stars">★★☆☆☆</span>${badge('Approval required', 'amber')}</div><h3>Negative review</h3><p>Own the miss, stay non-defensive, and offer a concrete next step. Always held for your approval.</p></div>
      </div>`;
  }
  const total = rows.length;
  const replied = rows.filter(r => r.reply_status === 'replied').length;
  const needs = total - replied;
  const drafts = rows.filter(r => r.reply_status === 'draft_ready').length;
  const avg = (rows.reduce((a,r) => a + r.rating, 0) / total);
  const dist = [5,4,3,2,1].map(n => rows.filter(r => r.rating === n).length);
  const distMax = Math.max(...dist, 1);
  const distCard = `<div class="card kpi"><div class="kpi-label">Rating breakdown</div><div class="dist">${
    [5,4,3,2,1].map((n,i) => `<div class="dr"><b>${n}</b><span class="tr"><span class="fl${n<=2?' low':''}" style="width:${Math.round(dist[i]/distMax*100)}%"></span></span><span class="n">${dist[i]}</span></div>`).join('')
  }</div></div>`;
  const feedRows = state.reviewTheme ? rows.filter(r => (r.themes||'').split(',').map(t=>t.trim()).includes(state.reviewTheme)) : rows;
  const feed = feedRows.map(r => reviewCard(r, state.client === 'all')).join('');
  const filterNote = state.reviewTheme ? `<div class="chip-hint">Showing reviews mentioning <b>${esc(state.reviewTheme)}</b> · <button class="link-action" data-act="revTheme" data-val="">clear</button></div>` : '';
  return pageTitle('Review Management', 'Hermes watches each connected Google Business Profile, clusters what customers mention, and drafts a reply for every review that has none. Nothing posts without your approval.')
    + `<div class="kpi-grid kpi-grid-5">`
    + kpiCard('Average rating', avg.toFixed(1), 'green', starText(avg), 'green', 'star')
    + kpiCard('Total reviews', total, 'blue', `${rows.filter(r => (r.published_at||'') > new Date(Date.now()-30*864e5).toISOString()).length} new this month`, 'slate', 'trend')
    + kpiCard('Response rate', total ? Math.round(replied/total*100) + '%' : '0%', 'green', `${replied} of ${total} replied`, replied === total ? 'green' : 'slate', 'shield')
    + kpiCard('Needs reply', needs, needs ? 'amber' : 'green', drafts ? `${drafts} drafts ready for approval` : 'all caught up', needs ? 'amber' : 'green', 'edit')
    + distCard
    + `</div>`
    + reviewTrend(rows)
    + reviewThemes(rows)
    + `<div class="section-label">Reviews · newest first</div>${filterNote}<div class="feed">${feed}</div>`;
}

/* =====================================================================
   VIEW: Agent Capabilities (derived from scheduled jobs)
   ===================================================================== */
function viewCaps(){
  const d = state.data;
  const areaFor = jt => ({ data_refresh:'SEO data', reviews:'Reviews', opportunity:'Opportunities', content:'Content', crawl:'Site health' }[jt] || label(jt));
  const approvalFor = jt => (jt === 'data_refresh' ? 'No' : jt === 'reviews' ? 'Every reply' : 'Yes');
  const trs = (d.jobs || []).map(j => `<tr>
    <td class="td pl">${clientCell(j.client_id)}</td>
    <td class="td muted" style="white-space:nowrap">${esc(areaFor(j.job_type))}</td>
    <td class="td" style="font-weight:600;color:#2C3837;max-width:340px">${esc(j.name)}</td>
    <td class="td muted" style="white-space:nowrap">${esc(j.cadence)}</td>
    <td class="td">${badge(approvalFor(j.job_type), approvalFor(j.job_type) === 'No' ? 'green' : 'amber')}</td>
    <td class="td pr">${badge(label(j.status), statusTone(j.status))}</td>
  </tr>`);
  return pageTitle('Agent Capabilities', 'What the SEO agents can own for each client, in plain English. No job IDs or scripts.')
    + `<div class="card section-card" style="margin-bottom:0">${table([
        {t:'Client',cls:'pl'},{t:'Area'},{t:'Responsibility'},{t:'Cadence'},{t:'Approval'},{t:'Status',cls:'pr'}
      ], trs, 6)}</div>`;
}

/* =====================================================================
   VIEW: Settings & Routing
   ===================================================================== */
function viewSettings(){
  const d = state.data, s = d.settings || {};
  const clients = (d.visible_clients && d.visible_clients.length ? d.visible_clients : d.clients) || [];

  const routing = clients.map(c => {
    const rows = [
      ['Topic', label(c.telegram_topic)],
      ['Profile', c.hermes_profile],
      ['Workspace', c.workspace],
      ['Routing', c.telegram_topic === 'not_bound' ? 'not bound' : 'active'],
    ].map(([k, v]) => `<div class="routing-row"><span class="rk">${esc(k)}</span><span class="rv mono">${esc(v)}</span></div>`).join('');
    const bound = c.telegram_topic !== 'not_bound';
    return `<div class="card routing-card">
      <div class="routing-head"><span class="routing-icon">${svg('send', 17)}</span><div style="flex:1;min-width:0"><div class="routing-name">${esc(c.name)}</div><div class="routing-topic">${esc(c.domain)}</div></div>${badge(bound ? 'Active' : 'Not bound', bound ? 'green' : 'amber')}</div>
      ${rows}
    </div>`;
  }).join('');

  const conn = (st) => `<span class="conn-line" style="color:${TONE[connTone(st)].fg}">${dot(connTone(st), 7)}${esc(label(st))}</span>`;
  const intRows = clients.map(c => `<tr>
    <td class="td pl">${clientCell(c.id)}</td>
    <td class="td">${conn(c.gsc_status)}</td>
    <td class="td">${conn(c.ga4_status)}</td>
    <td class="td">${conn(c.zernio_status)}</td>
    <td class="td mono" style="color:#2C3837">${esc(c.hermes_profile)}</td>
    <td class="td pr">${badge(label(c.repo_status), connTone(c.repo_status))}</td>
  </tr>`);

  const policy = `<div class="policy-grid" style="margin-bottom:24px">
    <div class="card policy-card"><h3>Scheduler</h3><p>${esc(s.scheduler_mode || 'SEO OS managed scheduler')}</p></div>
    <div class="card policy-card"><h3>Onboarding goal</h3><p>${esc(s.onboarding_goal || '')}</p></div>
    <div class="card policy-card"><h3>Model policy</h3><p>${esc(s.model_policy || '')}</p></div>
    <div class="card policy-card"><h3>Safe actions</h3><p>${esc(s.safe_actions || '')}</p></div>
  </div>`;

  return pageTitle('Settings & Routing', 'Telegram topic routing and integrations. Each topic maps to one client so work never leaks between sites.')
    + `<div class="section-label">Policy</div>${policy}`
    + `<div class="section-label">Telegram routing</div><div class="settings-grid">${routing || ''}</div>`
    + `<div class="section-label">Integrations</div><div class="card section-card" style="margin-bottom:0">${table([
        {t:'Client',cls:'pl'},{t:'Search Console'},{t:'Analytics (GA4)'},{t:'Review source'},{t:'Hermes profile'},{t:'Repo / workspace',cls:'pr'}
      ], intRows, 6)}</div>`;
}

/* =====================================================================
   render dispatcher
   ===================================================================== */
const VIEWS = {
  'Command Center': viewCommandCenter,
  'Clients / Sites': viewClients,
  'Approvals': viewApprovals,
  'Opportunities': viewOpportunities,
  'Agent Tasks': viewTasks,
  'Task Board': viewBoard,
  'Content': viewContent,
  'Schedule': viewSchedule,
  'Activity Log': viewActivity,
  'CTR Tests': viewCtr,
  'Reviews': viewReviews,
  'Agent Capabilities': viewCaps,
  'Settings': viewSettings,
};

function renderApp(){
  const app = $('#app');
  app.className = '';
  const view = (VIEWS[state.section] || viewCommandCenter)();
  app.innerHTML = `<div class="app">${renderSidebar()}<div class="main"><header class="topbar">${renderTopbar()}</header><div class="workspace">${view}</div></div></div>`;
  checkVersion();
}

/* ---------- delegated events (bound once) ---------- */
document.addEventListener('click', e => {
  // Close the account menu when clicking outside of it or its trigger.
  const menu = document.getElementById('avatar-menu');
  if(menu && !menu.hidden && !e.target.closest('#avatar-menu') && !e.target.closest('[data-act="avatarMenu"]')){
    menu.hidden = true;
  }
  // Click on the slide-over backdrop (outside the panel itself) closes it.
  const panel = document.getElementById('task-panel');
  if(panel && e.target === panel){ closeTaskPanel(); return; }
  const t = e.target.closest('[data-act]');
  if(!t) return;
  const act = t.dataset.act, val = t.dataset.val, id = t.dataset.id;
  switch(act){
    case 'client': load(val); if(chat.open) openChat(); break;
    case 'nav': state.section = val; renderApp(); break;
    case 'go': closeTaskPanel(); state.section = val; renderApp(); break;
    case 'taskDetail': openTaskPanel(id); break;
    case 'closePanel': closeTaskPanel(); break;
    case 'chatOpen': openChat(); break;
    case 'chatClose': closeChat(); break;
    case 'addClient': state.section = 'Settings'; renderApp(); break;
    case 'apprFilter': state.apprFilter = val; renderApp(); break;
    case 'oppFilter': state.oppFilter = val; renderApp(); break;
    case 'refresh': load(state.client); break;
    case 'avatarMenu': if(menu) menu.hidden = !menu.hidden; break;
    case 'logout': doLogout(); break;
    case 'decision': decide(id, val, t); break;
    case 'revApprove': {
      const draft = t.closest('.draft');
      const ta = draft ? draft.querySelector('textarea') : null;
      const edited = ta ? ta.value.trim() : '';
      decide(t.dataset.val, 'approved', t, edited || undefined);
      break;
    }
    case 'revEdit': {
      const draft = t.closest('.draft');
      if(draft.querySelector('textarea')) break;
      const p = draft.querySelector('.draft-text');
      const ta = document.createElement('textarea');
      ta.className = 'draft-editor'; ta.value = p.textContent; ta.dataset.orig = p.textContent;
      p.replaceWith(ta); ta.focus();
      t.textContent = 'Cancel'; t.dataset.act = 'revCancel';
      const ap = draft.querySelector('[data-act="revApprove"]');
      if(ap) ap.textContent = 'Approve edited reply';
      break;
    }
    case 'revCancel': {
      const draft = t.closest('.draft');
      const ta = draft.querySelector('textarea');
      const p = document.createElement('p');
      p.className = 'draft-text'; p.textContent = ta.dataset.orig || ta.defaultValue;
      ta.replaceWith(p);
      t.textContent = 'Edit reply'; t.dataset.act = 'revEdit';
      const ap = draft.querySelector('[data-act="revApprove"]');
      if(ap) ap.textContent = 'Approve reply';
      break;
    }
    case 'revRange': { state.reviewRange = t.dataset.val; renderApp(); break; }
    case 'revTheme': { const v = t.dataset.val || null; state.reviewTheme = (state.reviewTheme === v) ? null : v; renderApp(); break; }
    case 'telegram': console.log('[SEO OS] send to Telegram (wiring is a later milestone):', id); break;
    case 'noop': console.log('[SEO OS] action not wired yet'); break;
    case 'copySetup': {
      const target = document.getElementById(t.dataset.target);
      if(target && navigator.clipboard) navigator.clipboard.writeText(target.textContent || '').catch(() => {});
      break;
    }
    case 'setupContinue': location.reload(); break;
  }
});

/* ---------- keyboard: Esc closes the task slide-over; Enter sends a chat message ---------- */
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') closeTaskPanel();
  if(e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'chat-input'){
    e.preventDefault();
    const text = e.target.value; e.target.value = '';
    chatSend(text);
  }
});

/* ---------- chat + login form submit (delegated, survives re-renders) ---------- */
document.addEventListener('submit', async e => {
  if(e.target && e.target.id === 'chat-form'){
    e.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input ? input.value : '';
    if(input) input.value = '';
    chatSend(text);
    return;
  }
  if(e.target && e.target.id === 'setup-form'){
    e.preventDefault();
    const err = document.getElementById('setup-error');
    err.style.display = 'none';
    const p1 = document.getElementById('setup-password').value || '';
    const p2 = document.getElementById('setup-password2').value || '';
    if(p1 !== p2){ err.textContent = 'Passwords do not match.'; err.style.display = 'block'; return; }
    const btn = document.getElementById('setup-btn');
    const orig = btn.textContent;
    btn.disabled = true; btn.textContent = 'Creating...';
    try {
      const res = await fetch('/api/setup', { method:'POST', headers:{ 'content-type':'application/json' },
        body: JSON.stringify({ name: document.getElementById('setup-name').value,
          email: document.getElementById('setup-email').value, password: p1 }) });
      const data = await res.json();
      if(!res.ok){ err.textContent = data.error || 'Setup failed.'; err.style.display = 'block'; btn.disabled = false; btn.textContent = orig; return; }
      renderSetupDone(data);
    } catch(_){
      err.textContent = 'Could not reach the server, please try again.'; err.style.display = 'block';
      btn.disabled = false; btn.textContent = orig;
    }
    return;
  }
  if(!e.target || e.target.id !== 'login-form') return;
  e.preventDefault();
  const email = (document.getElementById('login-email').value || '').trim();
  const password = document.getElementById('login-password').value || '';
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  err.style.display = 'none';
  if(!email || !password){ err.textContent = 'Email and password are required.'; err.style.display = 'block'; return; }
  const orig = btn.textContent;
  btn.disabled = true; btn.textContent = 'Signing in...';
  try {
    const res = await fetch('/api/login', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ email, password }) });
    if(res.ok){ await boot(); return; }
    err.textContent = res.status === 401 ? 'Wrong email or password.' : 'Could not sign in, please try again.';
  } catch(_){
    err.textContent = 'Could not sign in, please try again.';
  }
  err.style.display = 'block';
  btn.disabled = false; btn.textContent = orig;
});

/* ---------- boot ---------- */
boot();
