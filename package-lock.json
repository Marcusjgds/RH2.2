const root = document.getElementById('admin-root');
const userBox = document.getElementById('adminUserBox');
const overlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');

let applications = [];
let builderQuestions = [];
let editingAppId = null;

const TYPE_LABELS = {
  bool: 'Vrai / Faux',
  short: 'Reponse courte',
  long: 'Reponse longue',
  single: 'Choix unique',
  multiple: 'Choix multiples'
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
function uid() {
  return (crypto.randomUUID ? crypto.randomUUID() : 'q_' + Date.now() + '_' + Math.random().toString(16).slice(2));
}
function openModal() { overlay.classList.add('show'); }
function closeModal() { overlay.classList.remove('show'); modalContent.innerHTML = ''; }
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

// ---------- boot ----------
async function boot() {
  const meRes = await fetch('/api/me');
  const me = await meRes.json();
  if (!me.isAdmin) { renderLogin(); return; }
  userBox.innerHTML = `<button class="btn btn-outline" id="adminLogout">Deconnexion</button>`;
  document.getElementById('adminLogout').addEventListener('click', async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    location.reload();
  });
  await loadApplications();
}

function renderLogin() {
  root.innerHTML = `
    <div class="admin-login hud-panel">
      <span class="hud-c2"></span>
      <span class="stamp">Niveau 3 requis</span>
      <h2>Connexion administrateur</h2>
      <div id="loginError"></div>
      <input type="password" id="adminPassword" placeholder="Mot de passe">
      <button class="btn btn-primary btn-block" id="adminLoginBtn">Se connecter</button>
    </div>
  `;
  document.getElementById('adminLoginBtn').addEventListener('click', doLogin);
  document.getElementById('adminPassword').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
}

async function doLogin() {
  const password = document.getElementById('adminPassword').value;
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  if (res.ok) { boot(); }
  else document.getElementById('loginError').innerHTML = `<p class="error-msg">Mot de passe invalide.</p>`;
}

// ---------- dashboard ----------
async function loadApplications() {
  const res = await fetch('/api/admin/applications');
  applications = await res.json();
  renderDashboard();
}

function renderDashboard() {
  const rows = applications.map((a) => `
    <tr>
      <td>${escapeHtml(a.title)}</td>
      <td><span class="status-pill ${a.status === 'open' ? 'status-open' : 'status-closed'}">${a.status === 'open' ? 'Ouverte' : 'Fermee'}</span></td>
      <td>${a.questions.length}</td>
      <td class="mono">${new Date(a.createdAt).toLocaleDateString('fr-FR')}</td>
      <td>
        <div class="row-actions">
          <button class="btn btn-ghost" onclick="toggleStatus('${a.id}')">${a.status === 'open' ? 'Fermer' : 'Ouvrir'}</button>
          <button class="btn btn-ghost" onclick="openEditModal('${a.id}')">Modifier</button>
          <button class="btn btn-ghost" onclick="openSubmissionsModal('${a.id}')">Candidatures</button>
          <button class="btn btn-danger" onclick="deleteApp('${a.id}')">Supprimer</button>
        </div>
      </td>
    </tr>
  `).join('');

  root.innerHTML = `
    <div class="container">
      <div class="admin-toolbar">
        <div class="section-title" style="margin:0;">
          <span class="num">01</span>
          <h3>Candidatures</h3>
        </div>
        <button class="btn btn-primary" onclick="openCreateModal()">+ Nouvelle candidature</button>
      </div>
      ${applications.length ? `
        <div class="hud-panel" style="padding:0;">
          <span class="hud-c2"></span>
          <table class="admin-table" style="border:none;">
            <thead><tr><th>Titre</th><th>Statut</th><th>Questions</th><th>Creee le</th><th>Actions</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      ` : `<div class="empty-state hud-panel"><span class="hud-c2"></span>Aucune candidature. Cree la premiere avec le bouton ci-dessus.</div>`}
    </div>
  `;
}

async function toggleStatus(id) {
  await fetch(`/api/admin/applications/${id}/toggle`, { method: 'POST' });
  loadApplications();
}
async function deleteApp(id) {
  if (!confirm('Supprimer definitivement cette candidature et ses reponses ne seront plus accessibles depuis cette liste. Continuer ?')) return;
  await fetch(`/api/admin/applications/${id}`, { method: 'DELETE' });
  loadApplications();
}

// ---------- creation / edition ----------
function openCreateModal() {
  editingAppId = null;
  builderQuestions = [];
  renderBuilderModal('Nouvelle candidature', '', '');
}
function openEditModal(id) {
  const a = applications.find((x) => x.id === id);
  editingAppId = id;
  builderQuestions = JSON.parse(JSON.stringify(a.questions || []));
  renderBuilderModal('Modifier la candidature', a.title, a.description);
}

function renderBuilderModal(heading, title, description) {
  modalContent.innerHTML = `
    <h3>${heading}</h3>
    <div class="field">
      <label>Titre du poste</label>
      <input type="text" id="fTitle" value="${escapeHtml(title)}" placeholder="Ex. Agent de Securite Interne">
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="fDescription" placeholder="Presentation du poste, missions, prerequis...">${escapeHtml(description)}</textarea>
    </div>
    <div class="field">
      <label>Questions du questionnaire</label>
      <div id="qbList"></div>
      <button class="btn btn-ghost" type="button" onclick="addQuestion()">+ Ajouter une question</button>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" onclick="closeModal()">Annuler</button>
      <button class="btn btn-primary" type="button" onclick="saveApplication()">Enregistrer</button>
    </div>
  `;
  renderQuestionBuilder();
  openModal();
}

function addQuestion() {
  builderQuestions.push({ id: uid(), type: 'short', label: '', required: true, options: [] });
  renderQuestionBuilder();
}
function removeQuestion(id) {
  builderQuestions = builderQuestions.filter((q) => q.id !== id);
  renderQuestionBuilder();
}
function updateQuestionField(id, field, value) {
  const q = builderQuestions.find((x) => x.id === id);
  if (q) q[field] = value;
}
function changeQuestionType(id, type) {
  const q = builderQuestions.find((x) => x.id === id);
  if (!q) return;
  q.type = type;
  if ((type === 'single' || type === 'multiple') && q.options.length === 0) q.options = ['Option 1', 'Option 2'];
  renderQuestionBuilder();
}
function addOption(id) {
  const q = builderQuestions.find((x) => x.id === id);
  q.options.push(`Option ${q.options.length + 1}`);
  renderQuestionBuilder();
}
function updateOption(id, idx, value) {
  const q = builderQuestions.find((x) => x.id === id);
  q.options[idx] = value;
}
function removeOption(id, idx) {
  const q = builderQuestions.find((x) => x.id === id);
  q.options.splice(idx, 1);
  renderQuestionBuilder();
}

function renderQuestionBuilder() {
  const list = document.getElementById('qbList');
  if (!builderQuestions.length) {
    list.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">Aucune question pour l'instant.</p>`;
    return;
  }
  list.innerHTML = builderQuestions.map((q, i) => {
    const needsOptions = q.type === 'single' || q.type === 'multiple';
    const optionsHtml = needsOptions ? `
      <div class="qb-options-list">
        ${q.options.map((opt, oi) => `
          <div style="display:flex; gap:6px;">
            <input type="text" value="${escapeHtml(opt)}" oninput="updateOption('${q.id}', ${oi}, this.value)">
            <button class="btn btn-ghost" type="button" onclick="removeOption('${q.id}', ${oi})">✕</button>
          </div>
        `).join('')}
        <button class="btn btn-ghost" type="button" onclick="addOption('${q.id}')">+ Option</button>
      </div>
    ` : '';

    const requiredToggle = q.type !== 'multiple' ? `
      <label class="checkbox-row">
        <input type="checkbox" ${q.required ? 'checked' : ''} onchange="updateQuestionField('${q.id}', 'required', this.checked)">
        Obligatoire
      </label>
    ` : '';

    return `
      <div class="question-builder-item">
        <button class="qb-remove" type="button" onclick="removeQuestion('${q.id}')" title="Supprimer">✕</button>
        <div class="qb-row">
          <select onchange="changeQuestionType('${q.id}', this.value)">
            ${Object.entries(TYPE_LABELS).map(([val, lbl]) => `<option value="${val}" ${q.type === val ? 'selected' : ''}>${lbl}</option>`).join('')}
          </select>
        </div>
        <input type="text" placeholder="Intitule de la question" value="${escapeHtml(q.label)}" oninput="updateQuestionField('${q.id}', 'label', this.value)">
        ${optionsHtml}
        ${requiredToggle}
      </div>
    `;
  }).join('');
}

async function saveApplication() {
  const title = document.getElementById('fTitle').value.trim();
  const description = document.getElementById('fDescription').value.trim();
  if (!title) { alert('Le titre est obligatoire.'); return; }
  const cleanQuestions = builderQuestions
    .filter((q) => q.label.trim())
    .map((q) => ({ ...q, options: (q.options || []).filter((o) => o.trim()) }));

  const payload = { title, description, questions: cleanQuestions };

  if (editingAppId) {
    await fetch(`/api/admin/applications/${editingAppId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } else {
    await fetch('/api/admin/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }
  closeModal();
  loadApplications();
}

// ---------- soumissions ----------
async function openSubmissionsModal(id) {
  const a = applications.find((x) => x.id === id);
  const res = await fetch(`/api/admin/applications/${id}/submissions`);
  const submissions = await res.json();

  const rows = submissions.map((s) => `
    <tr>
      <td>${escapeHtml(s.discordUser.username)}</td>
      <td class="mono">${new Date(s.submittedAt).toLocaleString('fr-FR')}</td>
      <td>${s.flags.length ? `<span class="status-pill status-closed" title="${s.flags.map(f => f.type).join(', ')}">${s.flags.length} alerte(s)</span>` : '—'}</td>
      <td><button class="btn btn-ghost" onclick='showAnswers(${JSON.stringify(JSON.stringify(s)).replace(/'/g, "&#39;")})'>Voir</button></td>
    </tr>
  `).join('');

  modalContent.innerHTML = `
    <h3>Candidatures reçues — ${escapeHtml(a.title)}</h3>
    ${submissions.length ? `
      <table class="admin-table">
        <thead><tr><th>Discord</th><th>Envoyee le</th><th>Alertes</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    ` : `<div class="empty-state">Aucune candidature recue pour ce poste.</div>`}
    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" onclick="closeModal()">Fermer</button>
    </div>
  `;
  openModal();
}

function showAnswers(submissionJson) {
  const s = JSON.parse(submissionJson);
  const body = s.answers.map((a) => {
    const val = Array.isArray(a.value) ? (a.value.join(', ') || '—') : (a.value || '—');
    return `<div class="q-item"><span class="q-type-tag">${escapeHtml(TYPE_LABELS[a.type] || a.type)}</span><span class="q-label">${escapeHtml(a.label)}</span><p style="margin-top:8px;">${escapeHtml(val)}</p></div>`;
  }).join('');
  modalContent.innerHTML = `
    <h3>Reponses de ${escapeHtml(s.discordUser.username)}</h3>
    ${body}
    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" onclick="closeModal()">Fermer</button>
    </div>
  `;
}

boot();
