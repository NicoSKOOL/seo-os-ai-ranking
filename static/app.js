const sections = [
  ['Command Center','grid'], ['Clients / Sites','building'], ['Approvals','shield'], ['Opportunities','trend'],
  ['Agent Tasks','list'], ['Content','edit'], ['Schedule','calendar'], ['CTR Tests','target'], ['Activity Log','pulse'], ['Reports','file'], ['Settings','settings']
];
let state = { section:'Command Center', client:'all', filter:'All', oppFilter:'All', schedView:'calendar', schedRange:'7', reportClient:null, data:null };

const $ = sel => document.querySelector(sel);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n || 0).toLocaleString();
const pct = n => `${Number(n || 0).toFixed(Math.abs(n) < 1 && n !== 0 ? 2 : 1)}%`;
const one = n => Number(n || 0).toFixed(1).replace(/\.0$/,'');
function icon(name, size=17){
  const paths = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    building:'<path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    trend:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    list:'<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    edit:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    target:'<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    pulse:'<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
    settings:'<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.2.38.5.7.9.9.33.17.7.25 1.1.25H21a2 2 0 1 1 0 4h-.09c-.4 0-.77.08-1.1.25-.4.2-.7.52-.9.9Z"/>',
    alert:'<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    refresh:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    bell:'<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
    lock:'<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.grid}</svg>`;
}

function clientName(id){
  if(id === 'all') return 'All Clients';
  const c = state.data?.clients.find(x => x.id === id);
  return c ? c.name : id;
}
function clientDot(id){ return id === 'demo-local' ? 'green' : id === 'demo-saas' ? 'blue' : id === 'setup-client' ? 'amber' : 'muted'; }
function classForStatus(status){
  if(['approved','ok','active','complete','done','connected','ready'].includes(status)) return 'green';
  if(['needs_review','waiting','waiting_for_approval','setup_needed','needs_setup','needs_changes'].includes(status)) return 'amber';
  if(['rejected','failed','blocked'].includes(status)) return 'red';
  if(['new','running','backlog'].includes(status)) return 'blue';
  return 'purple';
}
function label(s){ return esc(String(s || '').replaceAll('_',' ')); }

async function api(path, opts={}){
  const res = await fetch(path, {headers:{'Content-Type':'application/json'}, ...opts});
  if(!res.ok) throw new Error(await res.text());
  return res.json();
}
async function load(client=state.client){
  state.client = client;
  state.data = await api(`/api/summary?client=${encodeURIComponent(client)}`);
  render();
}

function renderNav(){
  $('#nav').innerHTML = sections.map(([name,ico]) => {
    const badge = name === 'Approvals' && state.data?.kpis?.pending_approvals ? `<span class="badge">${state.data.kpis.pending_approvals}</span>` : '';
    return `<button class="nav-item ${state.section===name?'active':''}" data-section="${name}"><span class="ico">${icon(ico,16)}</span>${name}${badge}</button>`;
  }).join('');
  document.querySelectorAll('.nav-item').forEach(b => b.onclick = () => { state.section=b.dataset.section; render(); });
}
function renderTabs(){
  const tabs = [`<span class="eyebrow">CLIENT</span><button class="pill ${state.client==='all'?'active':''}" data-client="all"><i></i>All Clients</button>`]
    .concat(state.data.clients.map(c => `<button class="pill ${state.client===c.id?'active':''}" data-client="${esc(c.id)}"><i></i>${esc(c.name)}</button>`));
  $('.client-tabs').innerHTML = tabs.join('') + `<button class="pill" data-section="Settings">+ Add Client</button>`;
  document.querySelectorAll('[data-client]').forEach(b => b.onclick = () => load(b.dataset.client));
  document.querySelector('[data-section="Settings"]').onclick = () => { state.section='Settings'; render(); };
}
function renderContext(){
  const d = state.data;
  $('#refreshed').textContent = `Refreshed ${new Date(d.generated_at).toLocaleString()}`;
  $('#contextName').textContent = clientName(state.client);
  const c = state.client === 'all' ? null : d.clients.find(x => x.id === state.client);
  $('#contextSubtitle').textContent = c ? `${c.domain} · Profile: ${c.hermes_profile} · ${c.telegram_topic}` : `${d.visible_clients.length} sites · Telegram → Hermes → SEO OS Dashboard`;
  $('#contextMetrics').innerHTML = [
    ['Sites', d.kpis.sites_monitored], ['Tasks', d.kpis.open_tasks], ['Opps', d.kpis.high_impact_opportunities], ['Jobs', d.kpis.active_jobs]
  ].map(([k,v]) => `<span class="mini"><span>${k}</span><b>${v}</b></span>`).join('');
  $('#approvalCount').textContent = `${d.kpis.pending_approvals} pending`;
  $('#routingHealth').textContent = d.kpis.system_health === 'OK' ? 'Managed scheduler healthy' : 'Needs attention';
  $('#routingHealth').className = `soft ${d.kpis.system_health === 'OK' ? 'green' : 'red'}`;
  $('#sideHealth').textContent = d.kpis.system_health === 'OK' ? 'Healthy' : 'Issue';
  $('#sideStatusText').textContent = `${d.kpis.active_jobs} managed jobs · ${d.kpis.pending_approvals} approval${d.kpis.pending_approvals===1?'':'s'}`;
}

function page(title, subtitle, body){
  return `<div class="page-title"><h1>${title}</h1><p>${subtitle}</p></div>${body}`;
}
function kpi(label,value,note,iconName,color){
  return `<div class="card kpi"><div class="kicon ${color}">${icon(iconName,17)}</div><span class="label">${label}</span><strong class="value">${value}</strong><div class="note ${color.includes('green')?'delta good':''}">${note}</div></div>`;
}
function section(title, subtitle, iconName, color, count, body, action=''){
  return `<div class="card section-card"><div class="section-head"><div class="section-title"><span class="icon ${color}">${icon(iconName,17)}</span><div><h2>${title}</h2><p>${subtitle}</p></div></div>${action || (count!==undefined?`<span class="count ${color}">${count}</span>`:'')}</div>${body}</div>`;
}
function simpleTable(headers, rows){
  if(!rows.length) return $('#emptyState').innerHTML;
  return `<div class="table-wrap"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

function commandCenter(){
  const d=state.data;
  const k=d.kpis;
  const kpis = `<div class="grid kpi-grid">
    ${kpi('Pending approvals', k.pending_approvals, k.pending_approvals ? 'needs human review' : 'nothing blocked', 'shield', k.pending_approvals?'amber':'green')}
    ${kpi('Open agent tasks', k.open_tasks, `across ${k.sites_monitored} site${k.sites_monitored===1?'':'s'}`, 'list', 'blue')}
    ${kpi('SEO opportunities', k.high_impact_opportunities, 'high priority', 'trend', 'green')}
    ${kpi('Managed jobs', k.active_jobs, 'SEO OS handles scheduling', 'calendar', 'blue')}
    ${kpi('Sites monitored', k.sites_monitored, 'client context active', 'building', 'purple')}
    ${kpi('System health', k.system_health, 'no failed jobs', 'pulse', k.system_health==='OK'?'green':'red')}
  </div>`;
  const needs = d.approvals.filter(a => ['needs_review','needs_changes'].includes(a.status)).slice(0,5).map(a => `<tr><td>${esc(clientName(a.client_id))}</td><td><strong>${esc(a.title)}</strong><div class="muted">${esc(a.requested_action)}</div></td><td><span class="tag purple">${label(a.type)}</span></td><td><span class="tag ${classForStatus(a.risk)}">${label(a.risk)}</span></td><td>${esc(a.evidence.slice(0,120))}...</td><td><button class="btn primary" data-open-approvals>Review</button></td></tr>`);
  const oppRows = d.opportunities.slice(0,6).map(o => `<tr><td>${esc(clientName(o.client_id))}</td><td><strong>${esc(new URL(o.page).pathname)}</strong><div class="url">${esc(o.page)}</div></td><td>${esc(o.problem)}</td><td><span class="tag ${classForStatus(o.priority)}">${label(o.priority)}</span></td><td>${fmt(o.impressions)}</td><td>${fmt(o.clicks)}</td><td>${pct(o.ctr)}</td><td>${Number(o.position).toFixed(1)}</td></tr>`);
  const healthRows = d.visible_clients.map(c => {
    const approvals = d.approvals.filter(a => a.client_id === c.id && a.status === 'needs_review').length;
    const tasks = d.tasks.filter(t => t.client_id === c.id && !['done','cancelled'].includes(t.status)).length;
    const opps = d.opportunities.filter(o => o.client_id === c.id).length;
    return `<tr><td><strong>${esc(c.name)}</strong><div class="muted">${esc(c.domain)}</div></td><td><span class="tag ${classForStatus(c.status)}">${c.health_score}% · ${label(c.status)}</span></td><td>${approvals}</td><td>${tasks}</td><td>${d.jobs.filter(j=>j.client_id===c.id).length}</td><td>${opps}</td><td>${esc(c.gsc_status)} / ${esc(c.ga4_status)}</td><td>${c.status==='setup'?'Connect GSC, GA4, review source':'Review top opportunity'}</td></tr>`;
  });
  const perf = `<div class="two-col">${d.metrics.map(m => `<div class="card perf-card"><h3><span class="dot ${clientDot(m.client_id)}"></span>${esc(clientName(m.client_id))}</h3><div class="perf-grid"><div class="perf-metric"><span>Clicks</span><strong>${fmt(m.clicks)}</strong><em class="delta ${m.clicks_delta>=0?'good':'bad'}">${m.clicks_delta>=0?'+':''}${fmt(m.clicks_delta)}</em></div><div class="perf-metric"><span>Impressions</span><strong>${fmt(m.impressions)}</strong><em class="delta ${m.impressions_delta>=0?'good':'bad'}">${m.impressions_delta>=0?'+':''}${fmt(m.impressions_delta)}</em></div><div class="perf-metric"><span>CTR</span><strong>${pct(m.ctr)}</strong><em class="delta ${m.ctr_delta>=0?'good':'bad'}">${m.ctr_delta>=0?'+':''}${one(m.ctr_delta)} pts</em></div><div class="perf-metric"><span>Avg rank</span><strong>${Number(m.avg_rank).toFixed(1)}</strong><em class="delta ${m.avg_rank_delta<=0?'good':'bad'}">${one(Math.abs(m.avg_rank_delta))} ${m.avg_rank_delta<=0?'better':'worse'}</em></div></div></div>`).join('')}</div>`;
  const activities = d.events.slice(0,7).map(e => `<tr><td>${new Date(e.created_at).toLocaleString()}</td><td>${esc(clientName(e.client_id))}</td><td><span class="tag blue">${label(e.source)}</span></td><td>${label(e.event_type)}</td><td>${esc(e.summary)}</td><td>${esc(e.next_action)}</td></tr>`);
  const body = `<div class="architecture"><span class="arch-pill blue">Telegram</span><span class="arrow">→</span><span class="arch-pill green">Google Sheet</span><span class="arrow">→</span><span class="arch-pill purple">Hermes Agents</span><span class="arrow">→</span><span class="arch-pill" style="background:#0f172a;color:#fff">SEO Dashboard</span></div>${kpis}
    ${section('Needs Your Attention Today','Decisions and approvals the agents are waiting on','alert','red',`${needs.length} items`, simpleTable(['Client','Item','Type','Priority','Why it matters','Action'], needs))}
    <h2>28-Day Performance <span class="muted" style="font-size:13px;font-weight:500">GSC-style snapshot · fake template data</span></h2>${perf}
    ${section('High-Impact SEO Opportunities','High impressions, weak clicks — ranked by impressions','trend','green',undefined, simpleTable(['Client','Page','Problem','Priority','Impr.','Clicks','CTR','Pos.'], oppRows), '<button class="link-action" data-open-opps>View all →</button>')}
    ${section('Client Health Summary','Workload and next action per site','building','blue',undefined, simpleTable(['Client','Status','Appr.','Tasks','Jobs','Opps','Connections','Recommended next action'], healthRows))}
    ${commandPreviews(d)}
    ${section('Agent Activity','Important outcomes only — not a Telegram transcript','pulse','mutedIcon',undefined, simpleTable(['Time','Client','Source','Type','What happened','Next action'], activities))}`;
  setTimeout(()=>document.querySelectorAll('[data-open-approvals]').forEach(b=>b.onclick=()=>{state.section='Approvals';render()}),0);
  setTimeout(()=>document.querySelectorAll('[data-open-opps]').forEach(b=>b.onclick=()=>{state.section='Opportunities';render()}),0);
  setTimeout(()=>document.querySelectorAll('[data-open-schedule]').forEach(b=>b.onclick=()=>{state.section='Schedule';render()}),0);
  return page('SEO OS Command Center','AI agents, SEO data, approvals, schedules, and client work in one operating layer.', body);
}

function commandPreviews(d){
  const appr = d.approvals.slice(0,3).map(a => `<div class="preview-row"><span class="dot ${clientDot(a.client_id)}"></span><div><strong>${esc(a.title)}</strong><small>${esc(clientName(a.client_id))} · ${label(a.type)}</small></div><span class="tag ${classForStatus(a.status)}">${label(a.status)}</span></div>`).join('');
  const jobs = d.jobs.slice(0,5).map(j => `<div class="preview-row"><span class="dot ${classForStatus(j.status)}"></span><div><strong>${esc(j.name)}</strong><small>${esc(clientName(j.client_id))}</small></div><div class="preview-time"><strong>${esc(j.next_run)}</strong><small>${esc(j.cadence)}</small></div></div>`).join('');
  return `<div class="preview-grid"><div>${section('Approval Inbox','Agent recommendations awaiting decision','shield','purple',undefined,`<div class="preview-list">${appr}</div>`, '<button class="link-action" data-open-approvals>Open →</button>')}</div><div>${section('Next Scheduled Work','Upcoming managed agent jobs','calendar','blue',undefined,`<div class="preview-list">${jobs}</div>`, '<button class="link-action" data-open-schedule>All →</button>')}</div></div>`;
}

function clientsView(){
  const cards = state.data.visible_clients.map(c => `<div class="card client-card"><h3>${esc(c.name)}</h3><div class="client-meta">${esc(c.domain)} · ${esc(c.role)}</div><div class="health"><i style="width:${c.health_score}%"></i></div><div class="connection-list"><div><span>Hermes profile</span><strong>${esc(c.hermes_profile)}</strong></div><div><span>Telegram</span><strong>${esc(c.telegram_topic)}</strong></div><div><span>GSC</span><strong>${label(c.gsc_status)}</strong></div><div><span>GA4</span><strong>${label(c.ga4_status)}</strong></div><div><span>review source</span><strong>${label(c.zernio_status)}</strong></div><div><span>Repo</span><strong>${label(c.repo_status)}</strong></div></div></div>`).join('');
  return page('Clients / Sites','Each client maps to a Hermes profile, workspace, data sources, and approval policy.', `<div class="grid client-grid">${cards}</div>`);
}

function approvalsView(){
  const filters=['All','Needs review','Approved'];
  const fhtml = `<div class="warning">🔒 <strong>Production changes remain approval-gated.</strong> Approving here updates state and creates a bounded task only. Publishing, deploys, redirects, noindex, canonicals, deletions, and outreach require separate explicit approval.</div><div class="filters">${filters.map(f=>`<button class="btn filter ${state.filter===f?'active':''}" data-filter="${f}">${f}</button>`).join('')}</div>`;
  let rows = state.data.approvals;
  if(state.filter==='Needs review') rows = rows.filter(a=>a.status==='needs_review');
  if(state.filter==='Approved') rows = rows.filter(a=>a.status==='approved');
  const cards = rows.map(a => `<div class="card approval-card"><div class="approval-top"><span class="tag purple">${label(a.type)}</span><span class="tag ${clientDot(a.client_id)}">${esc(clientName(a.client_id))}</span><span class="tag ${classForStatus(a.status)}">${label(a.status)}</span><span class="tag ${classForStatus(a.risk)}">${label(a.risk)} risk</span></div><h3>${esc(a.title)}</h3><p><strong>Requested action:</strong> ${esc(a.requested_action)}</p><div class="evidence"><strong>Evidence</strong><br>${esc(a.evidence)}<br><br><strong>Safety:</strong> ${esc(a.production_gate)}</div>${a.source_url?`<div class="url">${esc(a.source_url)}</div>`:''}<div class="btn-row" style="margin-top:16px">${a.status==='needs_review'?`<button class="btn primary" data-decision="approved" data-id="${a.id}">Approve</button><button class="btn" data-decision="needs_changes" data-id="${a.id}">Request Changes</button><button class="btn danger" data-decision="rejected" data-id="${a.id}">Reject</button>`:`<span class="tag ${classForStatus(a.status)}">${label(a.status)}</span>`}<button class="btn blue">Telegram</button></div></div>`).join('') || $('#emptyState').innerHTML;
  setTimeout(()=>{
    document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{state.filter=b.dataset.filter;render()});
    document.querySelectorAll('[data-decision]').forEach(b=>b.onclick=()=>decide(b.dataset.id,b.dataset.decision));
  },0);
  return page('Approvals','Human approval gate for strategy, content, publishing, outreach, and technical SEO.', fhtml + `<div class="approval-grid">${cards}</div>`);
}
async function decide(id, decision){
  try{
    const payload = await api(`/api/approvals/${id}/decision`, {method:'POST', body:JSON.stringify({decision, note:'Set from SEO OS dashboard prototype'})});
    state.data = payload.summary; toast(`Approval marked ${decision.replaceAll('_',' ')}`); render();
  }catch(e){ toast('Decision failed', true); console.error(e); }
}

function opportunitiesView(){
  const filters = ['All','Low CTR','SERP gap','Content refresh'];
  let opps = state.data.opportunities;
  if(state.oppFilter !== 'All') opps = opps.filter(o => o.opportunity_type === state.oppFilter);
  const chips = `<div class="opp-chips">${filters.map(f=>`<button class="opp-chip ${state.oppFilter===f?'active':''}" data-opp-filter="${f}">${f}</button>`).join('')}</div>`;
  const rows = opps.map((o,i) => `<tr><td class="rank-cell">${i+1}</td><td><span class="client-cell"><span class="dot ${clientDot(o.client_id)}"></span>${esc(clientName(o.client_id))}</span></td><td class="mono opp-page">${esc(new URL(o.page).pathname)}</td><td class="muted">${esc(o.problem)}</td><td><span class="tag ${classForStatus(o.priority)}">${label(o.priority)}</span></td><td style="text-align:right;font-variant-numeric:tabular-nums">${fmt(o.impressions)}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${fmt(o.clicks)}</td><td style="text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${pct(o.ctr)}</td><td style="text-align:right;font-variant-numeric:tabular-nums">${Number(o.position).toFixed(1)}</td><td class="muted" style="max-width:240px">${esc(o.recommended_workflow)}</td><td><span class="tag ${classForStatus(o.status)}">${label(o.status)}</span></td></tr>`);
  setTimeout(()=>document.querySelectorAll('[data-opp-filter]').forEach(b=>b.onclick=()=>{state.oppFilter=b.dataset.oppFilter;render()}),0);
  return `<div class="opp-title"><h1>SEO Opportunities</h1><p>The opportunity pipeline from Search Console — pages with high impressions but weak clicks, CTR, or ranking position.</p></div>${chips}<div class="card section-card"><div class="table-wrap"><table><thead><tr><th style="text-align:center">#</th><th>Client</th><th>Page</th><th>Problem</th><th>Priority</th><th style="text-align:right">Impr.</th><th style="text-align:right">Clicks</th><th style="text-align:right">CTR</th><th style="text-align:right">Pos.</th><th>Recommended workflow</th><th>Status</th></tr></thead><tbody>${rows.join('') || `<tr><td colspan="11" class="empty">No opportunities for this filter.</td></tr>`}</tbody></table></div></div>`;
}
function tasksView(){
  const rows = state.data.tasks.map(t => `<tr><td>${esc(clientName(t.client_id))}</td><td><strong>${esc(t.title)}</strong><div class="url">${esc(t.page_asset)}</div></td><td><span class="tag ${classForStatus(t.priority)}">${label(t.priority)}</span></td><td><span class="tag ${classForStatus(t.status)}">${label(t.status)}</span></td><td>${esc(t.owner_profile)}</td><td>${esc(t.source)}</td><td>${esc(t.next_action)}</td></tr>`);
  return page('Agent Tasks','Bounded execution queue created from opportunities and approvals.', section('Execution Queue','Dashboard approvals create tasks, not direct production changes','☰','blue',rows.length, simpleTable(['Client','Task','Priority','Status','Owner','Source','Next action'], rows)));
}

function contentView(){
  const d = state.data;
  const columns = [
    {stage:'Ideas', color:'blue', items:[
      ['Demo SaaS feature page intent expansion','Demo SaaS Company','From striking-distance query cluster','Course landing page'],
      ['Demo service FAQ block','Demo Local Roofing','From high impressions, zero clicks','Feature page']
    ]},
    {stage:'Brief', color:'purple', items:[
      ['SERP gap brief for demo comparison article','Demo Local Roofing','Approved plan, needs draft approval','Blog refresh']
    ]},
    {stage:'Drafting', color:'amber', items:[
      ['Example service page refresh','Demo SaaS Company','Waiting for approval before staging','Blog refresh']
    ]},
    {stage:'Review', color:'green', items:[
      ['Internal-link pass for demo service pages','Demo Local Roofing','Agent can prepare suggestions safely','Internal links']
    ]},
    {stage:'Published / Monitor', color:'muted', items:[
      ['Published changes get 28-day follow-up','All Clients','Locks baseline metrics before publishing','Measurement']
    ]}
  ];
  const stats = `<div class="stat-row"><span><b>5</b> active content items</span><span><b>2</b> approval-gated drafts</span><span><b>3</b> refreshes, not new URLs</span><span><b>0</b> auto-publish actions</span></div>`;
  const board = `<div class="kanban-board">${columns.map(col => `<div class="kanban-col"><div class="kanban-head"><span class="dot ${col.color}"></span><strong>${col.stage}</strong><span>${col.items.length}</span></div>${col.items.map(([title,client,source,type]) => `<div class="kanban-card"><span class="tag ${col.color==='muted'?'blue':col.color}">${type}</span><h3>${esc(title)}</h3><p>${esc(source)}</p><div class="kanban-meta"><span class="dot ${client.includes('Demo Local')?'green':client.includes('Demo SaaS Company')?'blue':'muted'}"></span>${esc(client)}<small>Approval-gated</small></div></div>`).join('')}</div>`).join('')}</div>`;
  const rows = d.opportunities.filter(o => ['Content refresh','SERP gap','Striking distance'].includes(o.opportunity_type)).map(o => `<tr><td>${esc(clientName(o.client_id))}</td><td><strong>${esc(new URL(o.page).pathname)}</strong><div class="url">${esc(o.page)}</div></td><td>${label(o.opportunity_type)}</td><td><span class="tag ${classForStatus(o.priority)}">${label(o.priority)}</span></td><td>${esc(o.recommended_workflow)}</td><td><span class="tag amber">Needs approval before publish</span></td></tr>`);
  return page('Content Pipeline','Everything Hermes is drafting or has queued for clients. Drafts are approval-gated before any page goes live.', stats + board + section('Content Opportunities','Refresh existing URLs first. Avoid duplicate or cannibalizing content.','edit','purple',rows.length, simpleTable(['Client','Page','Content work','Priority','Recommended workflow','Gate'], rows)));
}

function ctrView(){
  const tests = [
    {client:'Demo SaaS Company', page:'https://demo-saas.example/blog/demo-topic/', query:'demo target keyword', status:'Needs approval', color:'amber', proposed:'Demo Page Title Variant for Higher CTR', note:'High impressions, 0.23% CTR, avg position 11.2. Safe first loop: approve test, lock baseline, stage title/meta only.'},
    {client:'Demo Local Roofing', page:'https://www.demo-localseo.com/features/reporting/', query:'demo comparison keyword', status:'Ready to brief', color:'blue', proposed:'Demo Comparison Page Title | Demo SaaS Company', note:'Position 3.5 but CTR under 1%. Needs SERP snippet comparison before approval.'},
    {client:'Demo Local Roofing', page:'https://www.demo-localseo.com/roof-repair/', query:'demo service keyword', status:'New opportunity', color:'green', proposed:'Demo Service Page Title | Demo Local Roofing', note:'Zero clicks from 1,308 impressions. Cheap model can draft variants after raw data pull.'}
  ];
  const cards = `<div class="ctr-grid">${tests.map(t=>`<div class="card ctr-card"><div class="approval-top"><span class="tag ${t.color}">${t.status}</span><span class="tag ${t.client.includes('Demo Local')?'green':'blue'}">${t.client}</span></div><h3>${esc(new URL(t.page).pathname)}</h3><div class="muted">Target: ${esc(t.query)}</div><div class="proposed"><small>Proposed title / meta test</small><p>${esc(t.proposed)}</p></div><div class="metric-strip"><div><b>—</b><span>Start CTR</span></div><div><b>—</b><span>Clicks</span></div><div><b>—</b><span>Impr.</span></div></div><div class="ctr-footer"><span>${esc(t.note)}</span><button class="btn primary" data-open-approvals>Request approval</button></div></div>`).join('')}</div>`;
  setTimeout(()=>document.querySelectorAll('[data-open-approvals]').forEach(b=>b.onclick=()=>{state.section='Approvals';render()}),0);
  return page('CTR Tests','Title and meta tests. Hermes suggests a test, the user approves, baseline metrics lock, then SEO OS monitors the winner.', cards);
}

function scheduleButton(label, active, attrs){
  return `<button class="seg-btn ${active?'active':''}" ${attrs}>${label}</button>`;
}
function scheduleView(){
  const showCal = state.schedView !== 'list';
  const range7 = state.schedRange !== '30';
  const rows = state.data.jobs.map(j => `<tr><td><span class="client-cell"><span class="dot ${clientDot(j.client_id)}"></span>${esc(clientName(j.client_id))}</span></td><td><strong>${esc(j.name)}</strong></td><td>${esc(j.cadence)}</td><td><strong>${esc(j.next_run)}</strong></td><td><span class="muted">${esc(j.last_run)}</span></td><td><span class="tag ${classForStatus(j.status)}">${label(j.status)}</span></td></tr>`);
  const scheduleRows = section('Managed Jobs','Recurring work list view from the design handoff.','calendar','blue',rows.length, simpleTable(['Client','Job','Cadence','Next run','Last run','Status'], rows));
  const jobs = state.data.jobs;
  const weekDays = [
    {short:'Mon', num:'19', events:[jobs.find(j=>j.id==='job_dw_data'), jobs.find(j=>j.id==='job_ai_data')]},
    {short:'Tue', num:'20', events:[jobs.find(j=>j.id==='job_dw_opp')]},
    {short:'Wed', num:'21', events:[jobs.find(j=>j.id==='job_reviews')]},
    {short:'Thu', num:'22', events:[jobs.find(j=>j.id==='job_dw_data')]},
    {short:'Fri', num:'23', events:[jobs.find(j=>j.id==='job_ai_data')]},
    {short:'Sat', num:'24', events:[]},
    {short:'Sun', num:'25', events:[]}
  ];
  const week = `<div class="sched-week">${weekDays.map((d,i)=>`<div class="sched-day"><div class="sched-day-head ${i===0?'today':''}"><span>${d.short}</span><b>${d.num}</b></div>${d.events.filter(Boolean).map(j=>`<div class="sched-card ${j.status==='setup_needed'?'behind':''}"><div>${esc(j.next_run.includes('Tonight') ? j.next_run.replace('Tonight ','') : j.next_run)}</div><p>${esc(j.name)}</p><span><i class="dot ${clientDot(j.client_id)}"></i>${esc(clientName(j.client_id))}</span></div>`).join('') || '<div class="sched-empty">—</div>'}</div>`).join('')}</div>`;
  const monthCells = Array.from({length:35}, (_,i) => {
    const day = i + 1;
    const event = day===2 ? jobs[0] : day===3 ? jobs[2] : day===5 ? jobs[1] : day===9 ? jobs[3] : null;
    return `<div class="month-cell ${day>30?'muted-cell':''}"><div class="month-num">${day<=30?day:''}</div>${event?`<div class="month-bar"><b>${esc(event.next_run.split(' ').pop())}</b> ${esc(event.name)}</div>`:''}</div>`;
  }).join('');
  const month = `<div class="month-cal"><div class="month-dow">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(h=>`<div>${h}</div>`).join('')}</div><div class="month-grid">${monthCells}</div></div>`;
  const overdue = jobs.some(j=>j.status==='setup_needed') ? `<div class="sched-overdue">${icon('calendar',15)}<span><b>1 job behind schedule —</b> review source review monitor is waiting for setup.</span></div>` : '';
  const header = `<div class="sched-page-head"><div><h1>Schedule</h1><p>Recurring agent work for the week ahead. Job IDs and scripts stay inside Hermes.</p></div><div class="sched-controls">${showCal?`<div class="segmented">${scheduleButton('7 days', range7, 'data-sched-range="7"')}${scheduleButton('30 days', !range7, 'data-sched-range="30"')}</div>`:''}<div class="segmented">${scheduleButton('Calendar', showCal, 'data-sched-view="calendar"')}${scheduleButton('List', !showCal, 'data-sched-view="list"')}</div></div></div>`;
  setTimeout(()=>{
    document.querySelectorAll('[data-sched-view]').forEach(b=>b.onclick=()=>{state.schedView=b.dataset.schedView;render()});
    document.querySelectorAll('[data-sched-range]').forEach(b=>b.onclick=()=>{state.schedRange=b.dataset.schedRange;render()});
  },0);
  return header + overdue + (showCal ? (range7 ? week : month) : scheduleRows);
}
function activityView(){
  const rows = state.data.events.map(e => `<tr><td>${new Date(e.created_at).toLocaleString()}</td><td>${esc(clientName(e.client_id))}</td><td><span class="tag blue">${label(e.source)}</span></td><td>${label(e.event_type)}</td><td><span class="tag ${classForStatus(e.status)}">${label(e.status)}</span></td><td>${esc(e.summary)}</td><td>${esc(e.next_action)}</td></tr>`);
  return page('Activity Log','Important operational outcomes only. Not a Telegram transcript.', section('Timeline','Requests, decisions, refreshes, blockers, artifacts, and next actions','⌁','purple',rows.length, simpleTable(['Time','Client','Source','Type','Status','What happened','Next action'], rows)));
}
function reportProfileCard(c){
  const m = state.data.metrics.find(x => x.client_id === c.id) || {clicks:0, clicks_delta:0};
  const delta = Number(m.clicks_delta || 0);
  return `<button class="report-profile-card" data-report-client="${esc(c.id)}"><span class="dot big ${clientDot(c.id)}"></span><div><strong>${esc(c.name)}</strong><span class="mono">${esc(c.domain)}</span></div><div class="report-headline"><b>${fmt(m.clicks)}</b><em class="delta ${delta>=0?'good':'bad'}">${delta>=0?'+':''}${fmt(delta)}</em><small>clicks · 28d</small></div><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#AAB5B3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></button>`;
}
function reportsIndex(){
  const profiles = state.data.visible_clients.map(reportProfileCard).join('');
  const reportRows = state.data.artifacts.map(a => `<tr><td><span class="client-cell"><span class="dot ${clientDot(a.client_id)}"></span>${esc(clientName(a.client_id))}</span></td><td><strong>${esc(a.title)}</strong></td><td><span class="tag purple">${label(a.artifact_type)}</span></td><td><span class="muted">${new Date(a.updated_at).toLocaleString()}</span></td><td><span class="tag ${classForStatus(a.status)}">${label(a.status)}</span></td><td style="text-align:right"><button class="open-report-btn">Open ${icon('file',12)}</button></td></tr>`);
  const body = `<div class="reports-title"><h1>Reports & Artifacts</h1><p>Open a website profile for a full performance snapshot, or browse generated reports and recent agent runs below.</p></div><div class="report-label">Website profiles</div><div class="report-profile-grid">${profiles}</div><div class="report-label">All reports & runs</div><div class="card section-card"><div class="table-wrap"><table><thead><tr><th>Client</th><th>Title</th><th>Type</th><th>Updated</th><th>Status</th><th style="text-align:right">Open</th></tr></thead><tbody>${reportRows.join('')}</tbody></table></div></div>`;
  setTimeout(()=>document.querySelectorAll('[data-report-client]').forEach(b=>b.onclick=()=>{state.reportClient=b.dataset.reportClient;render()}),0);
  return body;
}
function reportsDetail(){
  const c = state.data.clients.find(x => x.id === state.reportClient) || state.data.visible_clients[0];
  const m = state.data.metrics.find(x => x.client_id === c.id) || {clicks:0,clicks_delta:0,impressions:0,impressions_delta:0,ctr:0,ctr_delta:0,avg_rank:0,avg_rank_delta:0,conversions:0};
  const metricCards = [
    ['Clicks', fmt(m.clicks), `${m.clicks_delta>=0?'+':''}${fmt(m.clicks_delta)}`, m.clicks_delta>=0],
    ['Impressions', fmt(m.impressions), `${m.impressions_delta>=0?'+':''}${fmt(m.impressions_delta)}`, m.impressions_delta>=0],
    ['CTR', pct(m.ctr), `${m.ctr_delta>=0?'+':''}${m.ctr_delta} pts`, m.ctr_delta>=0],
    ['Avg position', Number(m.avg_rank).toFixed(1), `${Math.abs(m.avg_rank_delta)} ${m.avg_rank_delta<=0?'better':'worse'}`, m.avg_rank_delta<=0],
    ['Conversions', fmt(m.conversions), 'tracked', true]
  ].map(([label,value,delta,good]) => `<div class="snap-metric"><span>${label}</span><b>${value}</b><em class="delta ${good?'good':'bad'}">${delta}</em></div>`).join('');
  const opps = state.data.opportunities.filter(o=>o.client_id===c.id).slice(0,5);
  const topPages = opps.map(o=>`<tr><td class="mono" style="color:#1D4ED8;font-weight:600">${esc(new URL(o.page).pathname)}</td><td style="text-align:right">${fmt(o.impressions)}</td><td style="text-align:right">${fmt(o.clicks)}</td><td style="text-align:right;font-weight:600">${pct(o.ctr)}</td><td style="text-align:right">${Number(o.position).toFixed(1)}</td></tr>`);
  const health = [['Search Console',c.gsc_status],['Analytics',c.ga4_status],['Repository',c.repo_status],['review source',c.zernio_status],['Hermes profile',c.hermes_profile],['Workspace',c.workspace]].map(([k,v])=>`<div class="health-row"><span class="dot ${String(v).includes('connected')?'green':'amber'}"></span><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  const body = `<button class="back-report" data-back-reports>${icon('list',14)}All reports</button><div class="snapshot-head"><div><h1>${esc(c.name)} — SEO Snapshot</h1><p><span class="mono">${esc(c.domain)}</span> · ${esc(m.period_label || 'Last 28 days')}</p></div><button class="export-report">${icon('file',14)}Export report</button></div><div class="snap-metrics">${metricCards}</div><div class="snapshot-grid"><div class="card chart-card"><div><span>Clicks · last 28 days</span><em class="delta ${m.clicks_delta>=0?'good':'bad'}">${m.clicks_delta>=0?'+':''}${fmt(m.clicks_delta)}</em></div><svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="0,78 12,72 25,66 38,70 50,52 62,43 75,39 88,28 100,20" fill="none" stroke="#1F7A43" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"></polyline><polyline points="0,100 0,78 12,72 25,66 38,70 50,52 62,43 75,39 88,28 100,20 100,100" fill="#1F7A43" fill-opacity=".1" stroke="none"></polyline></svg></div><div class="card site-health"><div class="report-label" style="margin:0 0 6px">Site health</div>${health}</div></div><div class="card section-card"><div class="report-table-title">Top pages by impressions</div>${simpleTable(['Page','Impressions','Clicks','CTR','Avg position'], topPages)}</div>`;
  setTimeout(()=>document.querySelector('[data-back-reports]')?.addEventListener('click',()=>{state.reportClient=null;render()}),0);
  return body;
}
function reportsView(){
  return state.reportClient ? reportsDetail() : reportsIndex();
}
function settingsView(){
  const s=state.data.settings;
  const clientRows = state.data.clients.map(c => `<div class="delete-client-row"><div><strong>${esc(c.name)}</strong><span>${esc(c.domain)} · ${esc(c.hermes_profile)}</span></div><button class="btn danger" data-delete-client="${esc(c.id)}">Delete client</button></div>`).join('');
  const body = `<div class="grid" style="grid-template-columns:1.1fr .9fr"><div class="card settings-card"><h3>Onboarding model</h3><p>For the people we give SEO OS to, setup should be: connect GSC, GA4, and review source, then let SEO OS create the managed jobs. No manual cron setup.</p><div class="connection-list"><div><span>Scheduler</span><strong>${esc(s.scheduler_mode)}</strong></div><div><span>Model policy</span><strong>Cheap by default</strong></div><div><span>Approval safety</span><strong>State first, production later</strong></div></div></div><div class="card settings-card"><h3>Recommended v1 config</h3><div class="codebox">clients.yaml\n  client_id\n  domain\n  gsc_property\n  ga4_property\n  zernio_account\n  hermes_profile\n  telegram_topic\n\nseo-os.sqlite\n  approvals\n  opportunities\n  tasks\n  jobs\n  reports\n  activity_events</div></div><div class="card settings-card" style="grid-column:1/-1"><h3>Safe action policy</h3><p>${esc(s.safe_actions)}</p><p><strong>Model policy:</strong> ${esc(s.model_policy)}</p><p><strong>Product setup goal:</strong> ${esc(s.onboarding_goal)}</p></div><div class="card settings-card danger-zone" style="grid-column:1/-1"><h3>Danger zone: delete client</h3><p>Settings-only destructive control. This removes the client and client-scoped prototype rows from SQLite. Production v1 should archive/export first, then require a stronger confirmation.</p><div class="delete-client-list">${clientRows}</div></div></div>`;
  setTimeout(()=>document.querySelectorAll('[data-delete-client]').forEach(b=>b.onclick=()=>deleteClient(b.dataset.deleteClient)),0);
  return page('Settings & Routing','Client routing, data integrations, model policy, and safe action rules.', body);
}

async function deleteClient(clientId){
  const client = state.data.clients.find(c => c.id === clientId);
  if(!client) return;
  const ok = window.confirm(`Delete ${client.name} from SEO OS? This removes its prototype tasks, jobs, approvals, opportunities, reports, and activity rows. Type DELETE in the next prompt to confirm.`);
  if(!ok) return;
  const typed = window.prompt(`Type DELETE to permanently remove ${client.name} from this prototype:`);
  if(typed !== 'DELETE') { toast('Client deletion cancelled'); return; }
  try{
    const payload = await api(`/api/clients/${encodeURIComponent(clientId)}/delete`, {method:'POST', body:JSON.stringify({confirm:'DELETE'})});
    state.client = 'all';
    state.data = payload.summary;
    toast(`Deleted client: ${client.name}`);
    render();
  }catch(e){ toast('Client deletion failed', true); console.error(e); }
}

function renderView(){
  const map = {'Command Center':commandCenter,'Clients / Sites':clientsView,'Approvals':approvalsView,'Opportunities':opportunitiesView,'Agent Tasks':tasksView,'Content':contentView,'Schedule':scheduleView,'CTR Tests':ctrView,'Activity Log':activityView,'Reports':reportsView,'Settings':settingsView};
  $('#view').innerHTML = (map[state.section] || commandCenter)();
}
function render(){ renderNav(); renderTabs(); renderContext(); renderView(); }
function toast(msg, error=false){
  const el=document.createElement('div'); el.className=`toast ${error?'error':''}`; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2600);
}
$('#refreshBtn').onclick = async () => {
  try { const r = await api('/api/refresh',{method:'POST',body:JSON.stringify({client_id:state.client})}); state.data=r.summary; toast('Dashboard data refreshed'); render(); }
  catch(e){ toast('Refresh failed', true); console.error(e); }
};
load().catch(e => { console.error(e); $('#view').innerHTML = `<div class="warning">Could not load SEO OS data. Is server.py running?</div>`; });
