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
  try { return new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' }); }
  catch { return d; }
}

function initials(name) {
  return (name || '?').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

function avatarHTML(m, size = 42) {
  if (m.photo_url && !m.hide_photo) {
    return `<img src="${escHtml(m.photo_url)}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.outerHTML='<div style=width:${size}px;height:${size}px;border-radius:50%;background:var(--brown-pale);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.35)}px;font-weight:700;color:var(--brown-mid);flex-shrink:0>${initials(m.full_name)}</div>'"/>`;
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:var(--brown-pale);display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.35)}px;font-weight:700;color:var(--brown-mid);flex-shrink:0;">${initials(m.full_name)}</div>`;
}

function memberDetail(m, allMembers) {
  const parts = [];
  if (!m.hide_birth_date && m.birth_date) parts.push('Born ' + formatDate(m.birth_date));
  if (!m.hide_birth_place && m.birth_place) parts.push(m.birth_place);
  if (!m.is_living) parts.push('Deceased');
  if (allMembers && window._allRelationships) {
    const parentIds = window._allRelationships
      .filter(r => r.person_b_id === m.id && r.relationship_type === 'parent')
      .map(r => r.person_a_id);
    const parentNames = parentIds.map(pid => allMembers.find(x => x.id === pid)?.full_name).filter(Boolean);
    if (parentNames.length) parts.push('Child of ' + parentNames.join(' & '));
  }
  return parts.join(' · ') || 'No details available';
}

function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const { contactName, contactEmail, contactFacebook } = SITE_CONFIG;
  el.innerHTML = `
    <div class="footer-contact">For any concerns, contact <strong>${escHtml(contactName)}</strong></div>
    <div class="footer-links">
      ${contactEmail ? `<a href="mailto:${escHtml(contactEmail)}" class="footer-link">✉ ${escHtml(contactEmail)}</a>` : ''}
      ${contactFacebook ? `<a href="${escHtml(contactFacebook)}" target="_blank" rel="noopener" class="footer-link">f Facebook</a>` : ''}
    </div>`;
}

function renderUserBar(user) {
  const bar = document.getElementById('user-bar');
  if (!bar || !user) return;
  bar.style.display = 'flex';
  const av = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.email;
  bar.innerHTML = `
    ${av ? `<img src="${escHtml(av)}" alt="" onerror="this.style.display='none'"/>` : ''}
    <span>Signed in as <span class="uname">${escHtml(name)}</span></span>
    <button class="usignout" onclick="signOutUser()">Sign out</button>`;
}

async function signOutUser() {
  await db.auth.signOut();
  location.reload();
}

// ── PersonPicker ──
// Instances stored by element id for reliable value retrieval
const _pickers = {};

class PersonPicker {
  constructor(container, allMembers, onChange, placeholder = 'Search by name…') {
    this.allMembers = allMembers;
    this.onChange = onChange;
    this.selected = null;
    this.container = container;
    this.placeholder = placeholder;
    this._id = 'pp_' + Math.random().toString(36).slice(2);
    container._pickerId = this._id;
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
      (m.full_name||'').toLowerCase().includes(q) ||
      (m.nickname||'').toLowerCase().includes(q)
    ).slice(0, 8);

    this.dropdown.innerHTML = '';
    if (!matches.length) {
      this.dropdown.innerHTML = '<div class="picker-no-results">No approved members found. They may need to be added first.</div>';
    } else {
      matches.forEach(m => {
        const opt = document.createElement('div');
        opt.className = 'picker-option';
        const avEl = document.createElement('div');
        avEl.className = 'picker-opt-avatar';
        if (m.photo_url && !m.hide_photo) {
          avEl.innerHTML = `<img src="${escHtml(m.photo_url)}" onerror="this.style.display='none'"/>`;
        } else {
          avEl.textContent = initials(m.full_name);
        }
        const info = document.createElement('div');
        info.innerHTML = `<div class="picker-opt-name">${escHtml(m.full_name)}${m.suffix?' '+escHtml(m.suffix):''}${m.nickname?' <span style="font-weight:400;color:var(--text-light);">"'+escHtml(m.nickname)+'"</span>':''}</div>
          <div class="picker-opt-detail">${escHtml(memberDetail(m, this.allMembers))}</div>`;
        opt.appendChild(avEl);
        opt.appendChild(info);
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
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
        ${avatarHTML(m, 28)}
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
  updateMembers(members) { this.allMembers = members; }
}

// ── Relationship helpers ──
const REL_TYPES = [
  ['parent','Parent'],['child','Child'],['spouse','Spouse / Partner'],
  ['sibling','Sibling'],['cousin','Cousin'],['aunt_uncle','Aunt / Uncle'],
  ['niece_nephew','Niece / Nephew'],['grandparent','Grandparent'],['grandchild','Grandchild'],
];

let _connCounter = 0;

function createConnRow(listId, allMembers, removable = true) {
  _connCounter++;
  const n = _connCounter;
  const rowId = 'conn-row-' + n;
  const div = document.createElement('div');
  div.className = 'conn-row'; div.id = rowId;

  const typeDiv = document.createElement('div'); typeDiv.className = 'field';
  typeDiv.innerHTML = '<label>Relationship to me</label>';
  const sel = document.createElement('select'); sel.id = 'conn-type-' + n;
  REL_TYPES.forEach(([v,l]) => { const o = document.createElement('option'); o.value=v; o.textContent=l; sel.appendChild(o); });
  typeDiv.appendChild(sel);

  const pickerDiv = document.createElement('div'); pickerDiv.className = 'field';
  pickerDiv.innerHTML = '<label>Family member</label>';
  const pc = document.createElement('div'); pc.id = 'conn-picker-' + n;
  pickerDiv.appendChild(pc);
  new PersonPicker(pc, allMembers, null, 'Search approved members…');

  div.appendChild(typeDiv);
  div.appendChild(pickerDiv);

  if (removable) {
    const rmBtn = document.createElement('button'); rmBtn.type = 'button'; rmBtn.className = 'conn-remove';
    rmBtn.innerHTML = '×'; rmBtn.onclick = () => document.getElementById(rowId).remove();
    div.appendChild(rmBtn);
  }

  document.getElementById(listId).appendChild(div);
  return n;
}

function collectConnRows(listId) {
  const rows = document.querySelectorAll('#' + listId + ' .conn-row');
  const conns = [];
  rows.forEach(row => {
    const n = row.id.replace('conn-row-','');
    const sel = document.getElementById('conn-type-' + n);
    const pc = document.getElementById('conn-picker-' + n);
    if (!pc || !sel) return;
    const pickerId = pc._pickerId;
    const picker = pickerId ? _pickers[pickerId] : null;
    const m = picker?.getValue();
    if (m) conns.push({ memberId: m.id, memberName: m.full_name, type: sel.value });
  });
  return conns;
}

// ── Ban check ──
async function checkIfBanned(uid) {
  if (!uid) return false;
  try {
    const { data } = await db.from('banned_users').select('id').eq('uid', uid).limit(1);
    return data && data.length > 0;
  } catch { return false; }
}
