// shared.js

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ──
function showToast(msg, type = 'success', duration = 3500) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

function formatDate(d) {
  if (!d) return null;
  try { return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }); }
  catch { return d; }
}

function initials(name) {
  return (name || '?').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function avatarHTML(m, size = 40) {
  const bg = `width:${size}px;height:${size}px;border-radius:50%;flex-shrink:0;`;
  if (m.photo_url && !m.hide_photo) {
    return `<img src="${escHtml(m.photo_url)}" style="${bg}object-fit:cover;" onerror="this.style.display='none'"/>`;
  }
  return `<div style="${bg}background:var(--brown-pale);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*.35)}px;font-weight:700;color:var(--brown-mid);">${initials(m.full_name)}</div>`;
}

function memberDetailStr(m, allMembers) {
  const parts = [];
  if (!m.hide_birth_date && m.birth_date) parts.push('Born ' + formatDate(m.birth_date));
  if (!m.hide_birth_place && m.birth_place) parts.push(m.birth_place);
  if (!m.is_living) parts.push('Deceased');
  if (allMembers && window._allRels) {
    const pids = window._allRels.filter(r => r.relationship_type==='parent' && r.person_b_id===m.id).map(r=>r.person_a_id);
    const pnames = pids.map(pid=>allMembers.find(x=>x.id===pid)?.full_name).filter(Boolean);
    if (pnames.length) parts.push('Child of '+pnames.join(' & '));
  }
  return parts.join(' · ') || 'No details';
}

function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const { contactName, contactEmail, contactFacebook } = SITE_CONFIG;
  el.innerHTML = `
    <div class="footer-contact">For any concerns, contact <strong>${escHtml(contactName)}</strong></div>
    <div class="footer-links">
      ${contactEmail?`<a href="mailto:${escHtml(contactEmail)}" class="footer-link">✉ ${escHtml(contactEmail)}</a>`:''}
      ${contactFacebook?`<a href="${escHtml(contactFacebook)}" target="_blank" rel="noopener" class="footer-link">f Facebook</a>`:''}
    </div>`;
}

function renderUserBar(user) {
  const bar = document.getElementById('user-bar');
  if (!bar || !user) return;
  bar.style.display = 'flex';
  const av = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.email;
  bar.innerHTML = `
    ${av?`<img src="${escHtml(av)}" alt="" onerror="this.style.display='none'"/>`:''}
    <span>Signed in as <span class="uname">${escHtml(name)}</span></span>
    <button class="usignout" onclick="signOutUser()">Sign out</button>`;
}

async function signOutUser() { await db.auth.signOut(); location.reload(); }

async function checkIfBanned(uid) {
  if (!uid) return false;
  try {
    const { data } = await db.from('banned_users').select('id').eq('uid', uid).limit(1);
    return !!(data && data.length);
  } catch { return false; }
}

async function checkIfAdmin(email) {
  if (!email) return false;
  try {
    const { data } = await db.from('admins').select('id').eq('email', email).limit(1);
    return !!(data && data.length);
  } catch { return false; }
}

// ── PersonPicker ──
const _pickers = {};

class PersonPicker {
  constructor(container, allMembers, onChange, placeholder = 'Search by name…') {
    this.allMembers = allMembers;
    this.onChange = onChange;
    this.selected = null;
    this.container = container;
    this.placeholder = placeholder;
    this._id = 'pp_' + Math.random().toString(36).slice(2);
    container._ppId = this._id;
    _pickers[this._id] = this;
    this._render();
  }

  _render() {
    this.container.innerHTML = '';
    this.container.className = 'person-picker';
    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.className = 'person-picker-input';
    this.inputEl.placeholder = this.placeholder;
    this.inputEl.autocomplete = 'off';
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'picker-dropdown';
    this.selectedEl = document.createElement('div');
    this.selectedEl.style.display = 'none';
    this.container.appendChild(this.inputEl);
    this.container.appendChild(this.dropdown);
    this.container.appendChild(this.selectedEl);
    this.inputEl.addEventListener('input', () => this._search(this.inputEl.value));
    this.inputEl.addEventListener('focus', () => { if (this.inputEl.value) this._search(this.inputEl.value); });
    document.addEventListener('click', e => { if (!this.container.contains(e.target)) this.dropdown.classList.remove('open'); });
  }

  _search(query) {
    const q = query.toLowerCase().trim();
    if (!q) { this.dropdown.classList.remove('open'); return; }
    const matches = this.allMembers.filter(m =>
      (m.full_name||'').toLowerCase().includes(q) || (m.nickname||'').toLowerCase().includes(q)
    ).slice(0, 8);
    this.dropdown.innerHTML = '';
    if (!matches.length) {
      this.dropdown.innerHTML = '<div class="picker-no-results">No approved members found. They may need to be added first.</div>';
    } else {
      matches.forEach(m => {
        const opt = document.createElement('div');
        opt.className = 'picker-option';
        const av = document.createElement('div');
        av.className = 'picker-opt-av';
        if (m.photo_url && !m.hide_photo) {
          av.innerHTML = `<img src="${escHtml(m.photo_url)}" onerror="this.style.display='none'"/>`;
        } else { av.textContent = initials(m.full_name); }
        const info = document.createElement('div');
        info.innerHTML = `<div class="picker-opt-name">${escHtml(m.full_name)}${m.suffix?' '+escHtml(m.suffix):''}${m.nickname?' <span style="font-weight:400;color:var(--text-light);">"'+escHtml(m.nickname)+'"</span>':''}</div>
          <div class="picker-opt-detail">${escHtml(memberDetailStr(m, this.allMembers))}</div>`;
        opt.appendChild(av); opt.appendChild(info);
        opt.addEventListener('click', () => this._select(m));
        this.dropdown.appendChild(opt);
      });
    }
    this.dropdown.classList.add('open');
  }

  _select(m) {
    this.selected = m;
    this.dropdown.classList.remove('open');
    this.inputEl.style.display = 'none';
    this.selectedEl.style.display = 'flex';
    this.selectedEl.className = 'picker-selected';
    this.selectedEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:7px;flex:1;min-width:0;">
        ${avatarHTML(m, 26)}
        <span class="picker-selected-name">${escHtml(m.full_name)}${m.suffix?' '+escHtml(m.suffix):''}</span>
      </div>
      <button class="picker-clear" title="Clear">×</button>`;
    this.selectedEl.querySelector('.picker-clear').addEventListener('click', () => this._clear());
    if (this.onChange) this.onChange(m);
  }

  _clear() {
    this.selected = null;
    this.inputEl.style.display = '';
    this.inputEl.value = '';
    this.selectedEl.style.display = 'none';
    if (this.onChange) this.onChange(null);
  }

  getValue() { return this.selected; }
  setValue(m) { if (m) this._select(m); }
  updateMembers(m) { this.allMembers = m; }
}

// ── Connection rows (parent/child only for users) ──
const _pcPickerMap = {};
let _pcSeq = 0;

const PC_TYPES = [['parent','My parent'],['child','My child']];
const FULL_REL_TYPES = [
  ['parent','Parent'],['child','Child'],['spouse','Spouse / Partner'],
  ['sibling','Sibling'],['cousin','Cousin'],['aunt_uncle','Aunt / Uncle'],
  ['niece_nephew','Niece / Nephew'],['grandparent','Grandparent'],['grandchild','Grandchild'],
];

function createConnRow(listId, allMembers, adminMode = false) {
  _pcSeq++;
  const n = _pcSeq;
  const rowId = 'cr-' + n;
  const div = document.createElement('div');
  div.className = 'conn-row'; div.id = rowId;

  const typeDiv = document.createElement('div'); typeDiv.className = 'field';
  typeDiv.innerHTML = '<label>Relationship</label>';
  const sel = document.createElement('select'); sel.id = 'cr-type-' + n;
  const types = adminMode ? FULL_REL_TYPES : PC_TYPES;
  types.forEach(([v,l]) => { const o = document.createElement('option'); o.value=v; o.textContent=l; sel.appendChild(o); });
  typeDiv.appendChild(sel);

  const pickerDiv = document.createElement('div'); pickerDiv.className = 'field';
  pickerDiv.innerHTML = '<label>Family member</label>';
  const pc = document.createElement('div'); pc.id = 'cr-picker-' + n;
  pickerDiv.appendChild(pc);
  const picker = new PersonPicker(pc, allMembers, null, 'Search approved members…');

  const rmBtn = document.createElement('button'); rmBtn.type = 'button'; rmBtn.className = 'conn-remove';
  rmBtn.innerHTML = '×';
  rmBtn.onclick = () => { document.getElementById(rowId)?.remove(); delete _pcPickerMap[n]; };

  div.appendChild(typeDiv); div.appendChild(pickerDiv); div.appendChild(rmBtn);
  document.getElementById(listId).appendChild(div);
  _pcPickerMap[n] = { picker, selEl: sel };
  return n;
}

function collectConnRows(listId) {
  const rows = document.querySelectorAll('#' + listId + ' .conn-row');
  const conns = [];
  rows.forEach(row => {
    const n = row.id.replace('cr-', '');
    const entry = _pcPickerMap[n];
    if (!entry) return;
    const m = entry.picker.getValue();
    if (m) conns.push({ memberId: m.id, memberName: m.full_name, type: entry.selEl.value });
  });
  return conns;
}

// ── Tree Layout Engine ──
// Builds a proper node-link layout with SVG connecting lines.
// Handles multiple disconnected components side by side.

const CARD_W = 160;
const CARD_H = 190;
const GAP_X  = 50;   // horizontal gap between sibling cards
const GAP_Y  = 90;   // vertical gap between generations
const GROUP_GAP = 120; // horizontal gap between disconnected groups

function buildTreeLayout(members, parentChildRels) {
  // Build adjacency: parentId -> [childIds]
  const childrenOf = {};
  const parentOf = {}; // childId -> [parentIds]
  members.forEach(m => { childrenOf[m.id] = []; parentOf[m.id] = []; });
  parentChildRels.forEach(r => {
    if (childrenOf[r.person_a_id] !== undefined && parentOf[r.person_b_id] !== undefined) {
      if (!childrenOf[r.person_a_id].includes(r.person_b_id)) childrenOf[r.person_a_id].push(r.person_b_id);
      if (!parentOf[r.person_b_id].includes(r.person_a_id)) parentOf[r.person_b_id].push(r.person_a_id);
    }
  });

  // Find connected components (undirected)
  const memberIds = new Set(members.map(m => m.id));
  const visited = new Set();
  const components = [];

  function bfs(startId) {
    const comp = [];
    const queue = [startId];
    while (queue.length) {
      const id = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id); comp.push(id);
      [...(childrenOf[id]||[]), ...(parentOf[id]||[])].forEach(nid => {
        if (memberIds.has(nid) && !visited.has(nid)) queue.push(nid);
      });
    }
    return comp;
  }

  members.forEach(m => { if (!visited.has(m.id)) components.push(bfs(m.id)); });

  // Layout each component independently, then place side by side
  const nodePositions = {}; // id -> {x, y}
  const lines = []; // {x1,y1,x2,y2,type}
  const groupBounds = []; // {x, y, w, h, label}
  let groupOffsetX = 0;

  components.forEach((compIds, compIdx) => {
    const compMembers = compIds.map(id => members.find(m => m.id === id)).filter(Boolean);

    // Roots of this component = members with no parents in this component
    const compSet = new Set(compIds);
    const roots = compMembers.filter(m => !(parentOf[m.id]||[]).some(pid => compSet.has(pid)));

    // Assign depth via BFS from roots
    const depthMap = {};
    const rootQueue = roots.map(m => ({ id: m.id, depth: 0 }));
    const depthVisited = new Set();
    while (rootQueue.length) {
      const { id, depth } = rootQueue.shift();
      if (depthVisited.has(id)) continue;
      depthVisited.add(id);
      depthMap[id] = depth;
      (childrenOf[id]||[]).filter(cid => compSet.has(cid)).forEach(cid => {
        if (!depthVisited.has(cid)) rootQueue.push({ id: cid, depth: depth + 1 });
      });
    }
    // Assign remaining (cycles/orphans)
    compIds.forEach(id => { if (depthMap[id] === undefined) depthMap[id] = 0; });

    // Group by depth
    const byDepth = {};
    compIds.forEach(id => {
      const d = depthMap[id];
      if (!byDepth[d]) byDepth[d] = [];
      byDepth[d].push(id);
    });
    const depths = Object.keys(byDepth).map(Number).sort((a,b)=>a-b);

    // Calculate subtree width for each node (bottom-up)
    function subtreeWidth(id) {
      const children = (childrenOf[id]||[]).filter(cid => compSet.has(cid));
      if (!children.length) return CARD_W;
      const childWidths = children.map(subtreeWidth);
      return Math.max(CARD_W, childWidths.reduce((s,w)=>s+w,0) + GAP_X*(children.length-1));
    }

    // Assign X positions top-down
    const nodeX = {};
    function assignX(id, leftEdge) {
      const children = (childrenOf[id]||[]).filter(cid => compSet.has(cid));
      const tw = subtreeWidth(id);
      nodeX[id] = leftEdge + tw/2 - CARD_W/2;
      if (!children.length) return;
      let cx = leftEdge;
      children.forEach(cid => {
        const cw = subtreeWidth(cid);
        assignX(cid, cx);
        cx += cw + GAP_X;
      });
    }

    // Start each root
    let compWidth = 0;
    roots.forEach(root => {
      assignX(root.id, compWidth);
      compWidth += subtreeWidth(root.id) + GAP_X;
    });
    compWidth = Math.max(compWidth - GAP_X, CARD_W);

    // Assign Y
    const nodeY = {};
    compIds.forEach(id => { nodeY[id] = depthMap[id] * (CARD_H + GAP_Y); });

    // Store absolute positions (offset by group)
    compIds.forEach(id => {
      nodePositions[id] = {
        x: groupOffsetX + (nodeX[id] || 0),
        y: nodeY[id] || 0,
      };
    });

    // Draw connecting lines for this component
    compIds.forEach(parentId => {
      const children = (childrenOf[parentId]||[]).filter(cid => compSet.has(cid));
      if (!children.length) return;
      const px = nodePositions[parentId].x + CARD_W/2;
      const py = nodePositions[parentId].y + CARD_H;
      // Vertical line down from parent
      const midY = py + GAP_Y/2;

      if (children.length === 1) {
        const cid = children[0];
        const cx = nodePositions[cid].x + CARD_W/2;
        const cy = nodePositions[cid].y;
        lines.push({ x1:px, y1:py, x2:px, y2:midY, type:'v' });
        lines.push({ x1:px, y1:midY, x2:cx, y2:midY, type:'h' });
        lines.push({ x1:cx, y1:midY, x2:cx, y2:cy, type:'v' });
      } else {
        // Horizontal bar across all children
        const xs = children.map(cid => nodePositions[cid].x + CARD_W/2);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        lines.push({ x1:px, y1:py, x2:px, y2:midY, type:'v' });
        lines.push({ x1:minX, y1:midY, x2:maxX, y2:midY, type:'h' });
        children.forEach(cid => {
          const cx = nodePositions[cid].x + CARD_W/2;
          const cy = nodePositions[cid].y;
          lines.push({ x1:cx, y1:midY, x2:cx, y2:cy, type:'v' });
        });
      }
    });

    // Compute group bounds
    const xs = compIds.map(id => nodePositions[id].x);
    const ys = compIds.map(id => nodePositions[id].y);
    const gw = Math.max(...xs) + CARD_W - Math.min(...xs);
    const gh = Math.max(...ys) + CARD_H - Math.min(...ys);

    groupBounds.push({
      x: groupOffsetX,
      y: 0,
      w: compWidth,
      h: gh + (depths.length > 1 ? GAP_Y : 0),
      label: components.length > 1 ? `Group ${compIdx + 1}` : null,
      isDisconnected: components.length > 1,
    });

    groupOffsetX += compWidth + GROUP_GAP;
  });

  const totalW = groupOffsetX - (components.length > 0 ? GROUP_GAP : 0);
  const totalH = Math.max(...Object.values(nodePositions).map(p => p.y + CARD_H + GAP_Y), CARD_H + 100);

  return { nodePositions, lines, groupBounds, totalW, totalH };
}
