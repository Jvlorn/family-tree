// shared.js

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Helpers ──
function showToast(msg, type='success', dur=3500) {
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';t.className='toast';document.body.appendChild(t);}
  t.textContent=msg; t.className='toast '+type+' show';
  clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),dur);
}
function formatDate(d){
  if(!d) return null;
  try{return new Date(d).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'});}catch{return d;}
}
function initials(name){return (name||'?').split(' ').filter(Boolean).map(w=>w[0]).join('').slice(0,2).toUpperCase();}
function escHtml(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function cap(s){return s?s[0].toUpperCase()+s.slice(1):'';}
function renderFooter(){
  const el=document.getElementById('site-footer'); if(!el) return;
  const{contactName,contactEmail,contactFacebook}=SITE_CONFIG;
  el.innerHTML=`<div class="footer-contact">For any concerns, contact <strong>${escHtml(contactName)}</strong></div>
    <div class="footer-links">
      ${contactEmail?`<a href="mailto:${escHtml(contactEmail)}" class="footer-link">✉ ${escHtml(contactEmail)}</a>`:''}
      ${contactFacebook?`<a href="${escHtml(contactFacebook)}" target="_blank" rel="noopener" class="footer-link">f Facebook</a>`:''}
    </div>`;
}
function renderUserBar(user){
  const bar=document.getElementById('user-bar'); if(!bar||!user) return;
  bar.classList.add('visible');
  const av=user.user_metadata?.avatar_url;
  const name=user.user_metadata?.full_name||user.email;
  bar.innerHTML=`${av?`<img src="${escHtml(av)}" alt="" onerror="this.style.display='none'"/>`:''}
    <span>Signed in as <span class="uname">${escHtml(name)}</span></span>
    <button class="usignout" onclick="signOutUser()">Sign out</button>`;
}
async function signOutUser(){await db.auth.signOut();location.reload();}
async function checkIfBanned(uid){
  if(!uid) return false;
  try{const{data}=await db.from('banned_users').select('id').eq('uid',uid).limit(1);return data&&data.length>0;}catch{return false;}
}
async function checkIsAdmin(email){
  if(!email) return false;
  try{const{data}=await db.from('admins').select('id').eq('email',email).limit(1);return data&&data.length>0;}catch{return false;}
}

// ── Person Picker ──
const _pickers={};
class PersonPicker{
  constructor(container,members,onChange,placeholder='Search by name…'){
    this.members=members; this.onChange=onChange; this.selected=null;
    this.container=container; this.placeholder=placeholder;
    this._id='pp_'+Math.random().toString(36).slice(2);
    container._pickerId=this._id; _pickers[this._id]=this; this._render();
  }
  _render(){
    this.container.innerHTML=''; this.container.className='person-picker';
    this.inp=document.createElement('input'); this.inp.type='text';
    this.inp.className='person-picker-input'; this.inp.placeholder=this.placeholder; this.inp.autocomplete='off';
    this.dd=document.createElement('div'); this.dd.className='picker-dropdown';
    this.selEl=document.createElement('div'); this.selEl.style.display='none';
    this.container.appendChild(this.inp); this.container.appendChild(this.dd); this.container.appendChild(this.selEl);
    this.inp.addEventListener('input',()=>this._search(this.inp.value));
    this.inp.addEventListener('focus',()=>{if(this.inp.value)this._search(this.inp.value);});
    document.addEventListener('click',e=>{if(!this.container.contains(e.target))this.dd.classList.remove('open');});
  }
  _search(q){
    q=q.toLowerCase().trim(); if(!q){this.dd.classList.remove('open');return;}
    const m=this.members.filter(m=>(m.full_name||'').toLowerCase().includes(q)||(m.nickname||'').toLowerCase().includes(q)).slice(0,8);
    this.dd.innerHTML='';
    if(!m.length){this.dd.innerHTML='<div class="picker-no-results">No approved members found.</div>';}
    else m.forEach(p=>{
      const opt=document.createElement('div'); opt.className='picker-option';
      const av=document.createElement('div'); av.className='picker-opt-av';
      if(p.photo_url&&!p.hide_photo) av.innerHTML=`<img src="${escHtml(p.photo_url)}" onerror="this.style.display='none'"/>`;
      else av.textContent=initials(p.full_name);
      const info=document.createElement('div');
      info.innerHTML=`<div class="picker-opt-name">${escHtml(p.full_name)}${p.suffix?' '+escHtml(p.suffix):''}${p.nickname?' <span style="font-weight:400;color:var(--text-light);">"'+escHtml(p.nickname)+'"</span>':''}</div>
        <div class="picker-opt-detail">${escHtml(this._detail(p))}</div>`;
      opt.appendChild(av); opt.appendChild(info);
      opt.addEventListener('click',()=>this._select(p)); this.dd.appendChild(opt);
    });
    this.dd.classList.add('open');
  }
  _detail(m){
    const p=[];
    if(!m.hide_birth_date&&m.birth_date) p.push('Born '+formatDate(m.birth_date));
    if(!m.hide_birth_place&&m.birth_place) p.push(m.birth_place);
    if(!m.is_living) p.push('Deceased');
    return p.join(' · ')||'No details';
  }
  _select(m){
    this.selected=m; this.dd.classList.remove('open'); this.inp.style.display='none';
    this.selEl.style.display='flex'; this.selEl.className='picker-selected';
    const avH=m.photo_url&&!m.hide_photo?`<img src="${escHtml(m.photo_url)}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;" onerror="this.style.display='none'"/>`
      :`<div style="width:26px;height:26px;border-radius:50%;background:var(--brown-pale);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--brown-mid);">${initials(m.full_name)}</div>`;
    this.selEl.innerHTML=`<div style="display:flex;align-items:center;gap:7px;flex:1;">${avH}<span class="picker-selected-name">${escHtml(m.full_name)}${m.suffix?' '+escHtml(m.suffix):''}</span></div>
      <button class="picker-clear" title="Clear">×</button>`;
    this.selEl.querySelector('.picker-clear').addEventListener('click',()=>this._clear());
    if(this.onChange) this.onChange(m);
  }
  _clear(){this.selected=null;this.inp.style.display='';this.inp.value='';this.selEl.style.display='none';if(this.onChange)this.onChange(null);}
  getValue(){return this.selected;}
  setValue(m){if(m)this._select(m);}
  updateMembers(m){this.members=m;}
}

// ── Connection row helpers ──
// Only parent/child and spouse now
const CONN_TYPES=[['parent','Their parent (they are the parent of me)'],['child','Their child (I am the parent of them)'],['spouse','Spouse / Partner']];
const ADOPT_TYPES=[['parent','Their parent (they are the parent of me)'],['child','Their child (I am the parent of them)']];
let _connSeq=0;
const _connPickerMap={};

function createConnRow(listId,members){
  _connSeq++;
  const n=_connSeq; const rowId='cr-'+n;
  const div=document.createElement('div'); div.className='conn-row'; div.id=rowId;
  // type select
  const td=document.createElement('div'); td.className='field'; td.innerHTML='<label>Relationship</label>';
  const sel=document.createElement('select'); sel.id='ct-'+n;
  CONN_TYPES.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;sel.appendChild(o);});
  td.appendChild(sel);
  // adopted checkbox (only for parent/child)
  const adoptWrap=document.createElement('div'); adoptWrap.className='field'; adoptWrap.id='adopt-wrap-'+n;
  adoptWrap.innerHTML=`<label style="visibility:hidden;font-size:10px;">Adopted</label><label class="check-row"><input type="checkbox" id="ca-${n}"/> Adopted child</label>`;
  sel.addEventListener('change',()=>{
    adoptWrap.style.display=sel.value==='spouse'?'none':'';
  });
  // picker
  const pd=document.createElement('div'); pd.className='field';
  pd.innerHTML='<label>Family member</label>';
  const pc=document.createElement('div'); pc.id='cp-'+n; pd.appendChild(pc);
  const picker=new PersonPicker(pc,members,null,'Search approved members…');
  _connPickerMap[n]={picker,selEl:sel,adoptId:'ca-'+n};
  // remove btn
  const rm=document.createElement('button'); rm.type='button'; rm.className='conn-remove';
  rm.innerHTML='×'; rm.onclick=()=>{document.getElementById(rowId)?.remove();delete _connPickerMap[n];};
  div.appendChild(td); div.appendChild(adoptWrap); div.appendChild(pd); div.appendChild(rm);
  document.getElementById(listId).appendChild(div);
  return n;
}

function collectConnRows(listId){
  const rows=document.querySelectorAll('#'+listId+' .conn-row');
  const result=[];
  rows.forEach(row=>{
    const n=row.id.replace('cr-','');
    const entry=_connPickerMap[n]; if(!entry) return;
    const m=entry.picker.getValue(); if(!m) return;
    const type=entry.selEl.value;
    const adopted=type!=='spouse'&&document.getElementById(entry.adoptId)?.checked;
    result.push({memberId:m.id,memberName:m.full_name,type,adopted:!!adopted});
  });
  return result;
}

// ── Admin conn row (for admin modal) ──
const _adminConnMap={};
let _adminConnSeq=0;
function createAdminConnRow(listId,members){
  _adminConnSeq++;
  const n=_adminConnSeq; const rowId='acr-'+n;
  const div=document.createElement('div'); div.className='conn-row'; div.id=rowId;
  const td=document.createElement('div'); td.className='field'; td.innerHTML='<label>Relationship</label>';
  const sel=document.createElement('select'); sel.id='act-'+n;
  CONN_TYPES.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;sel.appendChild(o);});
  td.appendChild(sel);
  const pd=document.createElement('div'); pd.className='field'; pd.innerHTML='<label>Family member</label>';
  const pc=document.createElement('div'); pc.id='acp-'+n; pd.appendChild(pc);
  const picker=new PersonPicker(pc,members,null,'Search members…');
  _adminConnMap[n]={picker,selEl:sel};
  const rm=document.createElement('button'); rm.type='button'; rm.className='conn-remove';
  rm.innerHTML='×'; rm.onclick=()=>{document.getElementById(rowId)?.remove();delete _adminConnMap[n];};
  div.appendChild(td); div.appendChild(pd); div.appendChild(rm);
  document.getElementById(listId).appendChild(div);
}
function collectAdminConnRows(listId){
  const rows=document.querySelectorAll('#'+listId+' .conn-row');
  const result=[];
  rows.forEach(row=>{
    const n=row.id.replace('acr-','');
    const entry=_adminConnMap[n]; if(!entry) return;
    const m=entry.picker.getValue(); if(!m) return;
    result.push({memberId:m.id,memberName:m.full_name,type:entry.selEl.value});
  });
  return result;
}
function clearAdminConnRows(listId){
  document.getElementById(listId).innerHTML='';
  Object.keys(_adminConnMap).forEach(k=>delete _adminConnMap[k]);
}

// ─────────────────────────────────────────────
// ── FAMILY TREE RENDERER ──
// ─────────────────────────────────────────────
// Renders proper SVG family tree with:
// - Spouse pairs side by side with horizontal marriage line
// - Children hanging below with T-bar connector
// - Single parent: straight vertical line
// - Disconnected groups shown in separate branches
// - Deceased nodes visually distinct
// ─────────────────────────────────────────────

const NODE_W = 140;
const NODE_H = 175;  // photo + body + optional deceased banner
const H_GAP  = 30;   // horizontal gap between sibling nodes
const V_GAP  = 80;   // vertical gap between generations
const SP_GAP = 20;   // gap between spouses
const LINE_COLOR = '#b8a898';
const LINE_W = 2;

class FamilyTreeRenderer {
  constructor(members, relationships, marriages) {
    this.members = members;
    this.rels = relationships;
    this.marriages = marriages;
    this.memberMap = {};
    members.forEach(m => this.memberMap[m.id] = m);

    // Build parent→children map (person_a is parent, person_b is child)
    this.childrenOf = {}; // parentId → [childId]
    this.parentsOf  = {}; // childId  → [parentId]
    relationships.filter(r => r.relationship_type === 'parent').forEach(r => {
      if (!this.childrenOf[r.person_a_id]) this.childrenOf[r.person_a_id] = [];
      this.childrenOf[r.person_a_id].push({childId: r.person_b_id, adopted: !r.is_biological});
      if (!this.parentsOf[r.person_b_id]) this.parentsOf[r.person_b_id] = [];
      this.parentsOf[r.person_b_id].push(r.person_a_id);
    });

    // Build spouse pairs
    this.spouseOf = {}; // personId → [{spouseId, marriageId, status}]
    marriages.forEach(mar => {
      if (!this.spouseOf[mar.person1_id]) this.spouseOf[mar.person1_id] = [];
      if (!this.spouseOf[mar.person2_id]) this.spouseOf[mar.person2_id] = [];
      this.spouseOf[mar.person1_id].push({spouseId: mar.person2_id, status: mar.status, id: mar.id});
      this.spouseOf[mar.person2_id].push({spouseId: mar.person1_id, status: mar.status, id: mar.id});
    });
  }

  // Find connected components (groups of people linked by any relationship)
  getComponents() {
    const visited = new Set();
    const components = [];
    const memberIds = this.members.map(m => m.id);

    const visit = (id, comp) => {
      if (visited.has(id)) return;
      visited.add(id); comp.add(id);
      // Parents
      (this.parentsOf[id] || []).forEach(pid => visit(pid, comp));
      // Children
      (this.childrenOf[id] || []).forEach(({childId}) => visit(childId, comp));
      // Spouses
      (this.spouseOf[id] || []).forEach(({spouseId}) => visit(spouseId, comp));
    };

    memberIds.forEach(id => {
      if (!visited.has(id)) {
        const comp = new Set();
        visit(id, comp);
        components.push([...comp].map(id => this.memberMap[id]).filter(Boolean));
      }
    });
    return components;
  }

  // Find root nodes of a component (people with no parents in this set)
  getRoots(compIds) {
    const idSet = new Set(compIds);
    return compIds.filter(id => {
      const parents = (this.parentsOf[id] || []).filter(pid => idSet.has(pid));
      return parents.length === 0;
    });
  }

  // Layout a component into positioned nodes
  // Returns {nodes:[{id,x,y}], width, height}
  layoutComponent(compMembers) {
    const compIds = compMembers.map(m => m.id);
    const idSet = new Set(compIds);
    const pos = {}; // id → {x, y}
    let maxX = 0, maxY = 0;

    const roots = this.getRoots(compIds);
    if (!roots.length) return { nodes: [], width: 0, height: 0 };

    // Assign generation levels
    const genLevel = {};
    const queue = roots.map(id => ({ id, gen: 0 }));
    const visited = new Set();
    while (queue.length) {
      const { id, gen } = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id); genLevel[id] = gen;
      (this.childrenOf[id] || []).forEach(({ childId }) => {
        if (idSet.has(childId) && !visited.has(childId)) queue.push({ id: childId, gen: gen + 1 });
      });
      // Spouse same generation
      (this.spouseOf[id] || []).forEach(({ spouseId }) => {
        if (idSet.has(spouseId) && !visited.has(spouseId)) queue.push({ id: spouseId, gen });
      });
    }
    compIds.filter(id => genLevel[id] === undefined).forEach(id => genLevel[id] = 0);

    // Group by generation
    const byGen = {};
    compIds.forEach(id => {
      const g = genLevel[id];
      if (!byGen[g]) byGen[g] = [];
      byGen[g].push(id);
    });

    // Lay out each generation, handling spouse pairs together
    const genNums = Object.keys(byGen).map(Number).sort((a,b) => a-b);
    const placed = new Set();

    genNums.forEach(g => {
      let xCursor = 0;
      const members = byGen[g];

      // Group into spouse pairs + singles
      const groups = [];
      const addedToGroup = new Set();
      members.forEach(id => {
        if (addedToGroup.has(id)) return;
        const spouses = (this.spouseOf[id] || []).map(s => s.spouseId).filter(sid => members.includes(sid) && !addedToGroup.has(sid));
        if (spouses.length) {
          groups.push([id, spouses[0]]);
          addedToGroup.add(id); addedToGroup.add(spouses[0]);
        } else {
          groups.push([id]);
          addedToGroup.add(id);
        }
      });

      const y = g * (NODE_H + V_GAP);
      groups.forEach(group => {
        group.forEach((id, i) => {
          const x = xCursor + i * (NODE_W + SP_GAP);
          pos[id] = { x, y };
          placed.add(id);
        });
        xCursor += group.length * NODE_W + (group.length > 1 ? SP_GAP : 0) + H_GAP;
      });
    });

    // Second pass: center children under their parents
    let changed = true;
    let iters = 0;
    while (changed && iters < 10) {
      changed = false; iters++;
      genNums.slice(1).forEach(g => {
        byGen[g].forEach(childId => {
          const parents = (this.parentsOf[childId] || []).filter(pid => idSet.has(pid) && pos[pid]);
          if (!parents.length) return;
          const parentXs = parents.map(pid => pos[pid].x + NODE_W / 2);
          const midX = parentXs.reduce((a, b) => a + b, 0) / parentXs.length - NODE_W / 2;
          if (Math.abs(pos[childId].x - midX) > 2) {
            pos[childId].x = midX; changed = true;
          }
        });
      });
    }

    // Collect result
    const nodes = compIds.filter(id => pos[id]).map(id => ({ id, ...pos[id] }));
    nodes.forEach(n => { maxX = Math.max(maxX, n.x + NODE_W); maxY = Math.max(maxY, n.y + NODE_H); });

    return { nodes, width: maxX, height: maxY };
  }

  // Render to a container element, returns the rendered element
  render(container) {
    container.innerHTML = '';
    const components = this.getComponents();
    if (!components.length) return;

    components.forEach((compMembers, idx) => {
      if (idx > 0) {
        // Branch divider
        const div = document.createElement('div');
        div.className = 'branch-divider';
        div.innerHTML = `<div class="branch-divider-line"></div>
          <div class="branch-divider-label">Unconnected branch — will merge when link is found</div>
          <div class="branch-divider-line"></div>`;
        container.appendChild(div);
      }

      const { nodes, width, height } = this.layoutComponent(compMembers);
      if (!nodes.length) return;

      const PADDING = 30;
      const totalW = width + PADDING * 2;
      const totalH = height + PADDING * 2;

      const wrap = document.createElement('div');
      wrap.style.cssText = `position:relative;width:${totalW}px;height:${totalH}px;flex-shrink:0;`;

      // SVG for lines
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', totalW);
      svg.setAttribute('height', totalH);
      svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;overflow:visible;';

      const posMap = {};
      nodes.forEach(n => posMap[n.id] = { x: n.x + PADDING, y: n.y + PADDING });

      // Draw marriage lines (horizontal line between spouses)
      this.marriages.forEach(mar => {
        const p1 = posMap[mar.person1_id], p2 = posMap[mar.person2_id];
        if (!p1 || !p2) return;
        const left = Math.min(p1.x, p2.x) + NODE_W;
        const right = Math.max(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y) + NODE_H / 2;
        if (right <= left) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const isDivorced = ['divorced','separated','annulled'].includes(mar.status);
        line.setAttribute('x1', left); line.setAttribute('y1', y);
        line.setAttribute('x2', right); line.setAttribute('y2', y);
        line.setAttribute('stroke', isDivorced ? '#f87171' : LINE_COLOR);
        line.setAttribute('stroke-width', LINE_W);
        if (isDivorced) line.setAttribute('stroke-dasharray', '5,3');
        svg.appendChild(line);
      });

      // Draw parent→children lines
      const parentIds = [...new Set(
        this.rels.filter(r => r.relationship_type === 'parent' && posMap[r.person_a_id] && posMap[r.person_b_id]).map(r => r.person_a_id)
      )];

      parentIds.forEach(parentId => {
        const children = (this.childrenOf[parentId] || []).filter(({childId}) => posMap[childId]);
        if (!children.length) return;

        const pp = posMap[parentId];

        // Find if parent has a spouse in this layout
        const spouses = (this.spouseOf[parentId] || []).map(s => s.spouseId).filter(sid => posMap[sid]);
        let dropX;
        if (spouses.length) {
          // Midpoint between parent and first visible spouse
          const sp = posMap[spouses[0]];
          dropX = (pp.x + NODE_W / 2 + sp.x + NODE_W / 2) / 2;
        } else {
          dropX = pp.x + NODE_W / 2;
        }

        const parentBottomY = pp.y + NODE_H;
        const childTopY = posMap[children[0].childId].y;
        const midY = parentBottomY + (childTopY - parentBottomY) / 2;

        // Vertical drop from parent/couple midpoint
        const vDrop = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        vDrop.setAttribute('x1', dropX); vDrop.setAttribute('y1', parentBottomY);
        vDrop.setAttribute('x2', dropX); vDrop.setAttribute('y2', midY);
        vDrop.setAttribute('stroke', LINE_COLOR); vDrop.setAttribute('stroke-width', LINE_W);
        svg.appendChild(vDrop);

        if (children.length === 1) {
          // Single child: straight line down
          const {childId, adopted} = children[0];
          const cp = posMap[childId];
          const cx = cp.x + NODE_W / 2;
          // Horizontal adjustment if child isn't directly below
          if (Math.abs(cx - dropX) > 1) {
            const hLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            hLine.setAttribute('x1', dropX); hLine.setAttribute('y1', midY);
            hLine.setAttribute('x2', cx); hLine.setAttribute('y2', midY);
            hLine.setAttribute('stroke', LINE_COLOR); hLine.setAttribute('stroke-width', LINE_W);
            if (adopted) hLine.setAttribute('stroke-dasharray', '6,3');
            svg.appendChild(hLine);
          }
          const vChild = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          vChild.setAttribute('x1', cx); vChild.setAttribute('y1', midY);
          vChild.setAttribute('x2', cx); vChild.setAttribute('y2', cp.y);
          vChild.setAttribute('stroke', LINE_COLOR); vChild.setAttribute('stroke-width', LINE_W);
          if (adopted) vChild.setAttribute('stroke-dasharray', '6,3');
          svg.appendChild(vChild);
        } else {
          // Multiple children: T-bar crossbar
          const childCenterXs = children.map(({childId}) => posMap[childId].x + NODE_W / 2);
          const barLeft = Math.min(...childCenterXs);
          const barRight = Math.max(...childCenterXs);
          // Horizontal crossbar at midY
          const hBar = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          hBar.setAttribute('x1', barLeft); hBar.setAttribute('y1', midY);
          hBar.setAttribute('x2', barRight); hBar.setAttribute('y2', midY);
          hBar.setAttribute('stroke', LINE_COLOR); hBar.setAttribute('stroke-width', LINE_W);
          svg.appendChild(hBar);
          // Vertical drop line to crossbar
          const vToBar = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          vToBar.setAttribute('x1', dropX); vToBar.setAttribute('y1', midY);
          vToBar.setAttribute('x2', dropX); vToBar.setAttribute('y2', midY); // already drawn above
          svg.appendChild(vToBar);
          // Individual lines from crossbar to each child
          children.forEach(({childId, adopted}) => {
            const cp = posMap[childId];
            const cx = cp.x + NODE_W / 2;
            const vChild = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            vChild.setAttribute('x1', cx); vChild.setAttribute('y1', midY);
            vChild.setAttribute('x2', cx); vChild.setAttribute('y2', cp.y);
            vChild.setAttribute('stroke', LINE_COLOR); vChild.setAttribute('stroke-width', LINE_W);
            if (adopted) vChild.setAttribute('stroke-dasharray', '6,3');
            svg.appendChild(vChild);
          });
        }
      });

      wrap.appendChild(svg);

      // Render node cards
      nodes.forEach(n => {
        const m = this.memberMap[n.id];
        if (!m) return;
        const card = document.createElement('div');
        card.className = 'tree-node' + (!m.is_living ? ' deceased' : '');
        card.style.left = (n.x + PADDING) + 'px';
        card.style.top = (n.y + PADDING) + 'px';
        card.dataset.id = m.id;
        card.onclick = () => { if (window.onNodeClick) window.onNodeClick(m.id); };

        // Photo
        const genderClass = m.gender || 'unknown';
        if (m.photo_url && !m.hide_photo) {
          card.innerHTML = `<img class="node-photo" src="${escHtml(m.photo_url)}" alt="${escHtml(m.full_name)}" onerror="this.outerHTML='<div class=node-photo-placeholder ${genderClass}>${initials(m.full_name)}</div>'"/>`;
        } else {
          card.innerHTML = `<div class="node-photo-placeholder ${genderClass}">${initials(m.full_name)}</div>`;
        }

        // Body
        const body = document.createElement('div');
        body.className = 'node-body';
        const birthStr = !m.hide_birth_date && m.birth_date ? new Date(m.birth_date).getFullYear() : '';
        body.innerHTML = `<div class="node-name">${escHtml(m.full_name)}${m.suffix?' <span style="font-size:9px;color:var(--text-light);">'+escHtml(m.suffix)+'</span>':''}</div>
          <div class="node-sub">${m.nickname?'"'+escHtml(m.nickname)+'"':''}${m.nickname&&birthStr?' · ':''}${birthStr}</div>`;
        card.appendChild(body);

        // Deceased banner
        if (!m.is_living) {
          const banner = document.createElement('div');
          banner.className = 'node-deceased-banner';
          const deathYear = m.death_date ? new Date(m.death_date).getFullYear() : '';
          banner.textContent = '✝' + (deathYear ? ' ' + deathYear : ' Deceased');
          card.appendChild(banner);
        }

        wrap.appendChild(card);
      });

      container.appendChild(wrap);
    });
  }
}
