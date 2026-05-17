// shared.js — utilities used across all pages

// ── Supabase client (singleton) ──
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { redirectTo: SITE_CONFIG.siteURL + '/submit.html' }
});

// ── Toast ──
function showToast(msg, type = 'success', duration = 3500) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

// ── Format date ──
function formatDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ── Get initials ──
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ── Escape HTML ──
function escHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Capitalize ──
function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : ''; }

// ── Build member detail string (for picker cards) ──
function memberDetail(m, allMembers) {
  const parts = [];
  if (!m.hide_birth_date && m.birth_date) parts.push('Born ' + formatDate(m.birth_date));
  if (!m.hide_birth_place && m.birth_place) parts.push(m.birth_place);
  if (!m.is_living) parts.push('Deceased');

  // Find parents
  if (allMembers) {
    const parents = (window._relationships || [])
      .filter(r => r.person_b_id === m.id && r.relationship_type === 'parent')
      .map(r => allMembers.find(x => x.id === r.person_a_id)?.full_name)
      .filter(Boolean);
    if (parents.length) parts.push('Child of ' + parents.join(' & '));
  }

  return parts.join(' · ') || 'No details available';
}

// ── Render footer ──
function renderFooter() {
  const el = document.getElementById('site-footer');
  if (!el) return;
  const { contactName, contactEmail, contactFacebook } = SITE_CONFIG;
  el.innerHTML = `
    <div class="footer-contact">
      For any concerns, please contact <strong>${escHtml(contactName)}</strong>
    </div>
    <div class="footer-links">
      ${contactEmail ? `<a href="mailto:${escHtml(contactEmail)}" class="footer-link">✉ ${escHtml(contactEmail)}</a>` : ''}
      ${contactFacebook ? `<a href="${escHtml(contactFacebook)}" target="_blank" rel="noopener" class="footer-link">f Facebook</a>` : ''}
    </div>
  `;
}

// ── Person Picker component ──
// Usage: new PersonPicker(containerEl, allMembers, onChange)
class PersonPicker {
  constructor(container, allMembers, onChange, placeholder = 'Search by name…') {
    this.allMembers = allMembers;
    this.onChange = onChange;
    this.selected = null;
    this.container = container;
    this.placeholder = placeholder;
    this._render();
  }

  _render() {
    this.container.innerHTML = '';
    this.container.className = 'person-picker';

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.className = 'person-picker-input';
    this.inputEl.placeholder = this.placeholder;

    this.dropdown = document.createElement('div');
    this.dropdown.className = 'picker-dropdown';

    this.selectedEl = document.createElement('div');
    this.selectedEl.style.display = 'none';

    this.container.appendChild(this.inputEl);
    this.container.appendChild(this.dropdown);
    this.container.appendChild(this.selectedEl);

    this.inputEl.addEventListener('input', () => this._search(this.inputEl.value));
    this.inputEl.addEventListener('focus', () => { if (this.inputEl.value) this._search(this.inputEl.value); });
    document.addEventListener('click', (e) => {
      if (!this.container.contains(e.target)) this.dropdown.classList.remove('open');
    });
  }

  _search(query) {
    const q = query.toLowerCase().trim();
    if (!q) { this.dropdown.classList.remove('open'); return; }

    const matches = this.allMembers.filter(m =>
      (m.full_name || '').toLowerCase().includes(q) ||
      (m.nickname || '').toLowerCase().includes(q)
    ).slice(0, 8);

    this.dropdown.innerHTML = '';
    if (matches.length === 0) {
      this.dropdown.innerHTML = `<div class="picker-no-results">No approved members found with that name.<br>They may need to be added first.</div>`;
    } else {
      matches.forEach(m => {
        const opt = document.createElement('div');
        opt.className = 'picker-option';
        const detail = memberDetail(m, this.allMembers);
        const av = m.photo_url && !m.hide_photo
          ? `<img src="${m.photo_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'"/>`
          : `<div class="member-avatar" style="width:36px;height:36px;font-size:13px;">${initials(m.full_name)}</div>`;
        opt.innerHTML = `
          <div style="display:flex;gap:10px;align-items:center;">
            ${av}
            <div>
              <div class="picker-option-name">${escHtml(m.full_name)}${m.suffix ? ' ' + m.suffix : ''}${m.nickname ? ' <span style="font-weight:400;color:var(--text-light);">"'+escHtml(m.nickname)+'"</span>' : ''}</div>
              <div class="picker-option-detail">${escHtml(detail)}</div>
            </div>
          </div>`;
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
      <div class="picker-selected-name">${escHtml(m.full_name)}${m.suffix ? ' ' + m.suffix : ''}</div>
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
