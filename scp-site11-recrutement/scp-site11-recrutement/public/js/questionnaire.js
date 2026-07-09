const qContainer = document.getElementById('qContainer');
const qTitle = document.getElementById('qTitle');
const qProgress = document.getElementById('qProgress');
const leaveWarning = document.getElementById('leaveWarning');
const leaveCountEl = document.getElementById('leaveCount');
const resumeBtn = document.getElementById('resumeBtn');

const params = new URLSearchParams(location.search);
const appId = params.get('id');

let application = null;
let submitted = false;
let leaveCount = 0;
const flags = [];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---------- chargement de la candidature ----------
async function load() {
  if (!appId) {
    qContainer.innerHTML = '<div class="empty-state">Candidature introuvable.</div>';
    return;
  }
  const meRes = await fetch('/api/me');
  const me = await meRes.json();
  if (!me.user) { location.href = '/'; return; }

  const res = await fetch(`/api/applications/${appId}`);
  if (!res.ok) {
    qContainer.innerHTML = '<div class="empty-state">Cette candidature est introuvable ou a ete fermee.</div>';
    return;
  }
  application = await res.json();
  qTitle.textContent = application.title;
  render();
  armAntiLeave();
}

function render() {
  const items = application.questions.map((q, i) => renderQuestion(q, i)).join('');
  qContainer.innerHTML = `
    <p style="color:var(--text-muted); margin-bottom: 22px;">${escapeHtml(application.description || '')}</p>
    <form id="qForm">
      ${items}
      <div class="q-submit-bar">
        <button type="submit" class="btn btn-primary">Envoyer ma candidature</button>
      </div>
    </form>
  `;
  qProgress.textContent = `${application.questions.length} QUESTION(S)`;
  document.getElementById('qForm').addEventListener('submit', onSubmit);
}

function renderQuestion(q, i) {
  const reqClass = q.required ? 'required' : '';
  const reqMark = q.required ? '<span class="q-required-mark">*</span>' : '';
  let body = '';

  if (q.type === 'bool') {
    body = `
      <div class="q-bool-row">
        <label><input type="radio" name="q_${q.id}" value="vrai" ${q.required ? 'required' : ''}><span>Vrai</span></label>
        <label><input type="radio" name="q_${q.id}" value="faux"><span>Faux</span></label>
      </div>`;
  } else if (q.type === 'short') {
    body = `<input type="text" name="q_${q.id}" maxlength="200" ${q.required ? 'required' : ''} placeholder="Reponse courte">`;
  } else if (q.type === 'long') {
    body = `<textarea name="q_${q.id}" maxlength="4000" ${q.required ? 'required' : ''} placeholder="Reponse detaillee"></textarea>`;
  } else if (q.type === 'single') {
    body = `<div class="q-options">${(q.options || []).map((opt, oi) => `
      <label class="q-option">
        <input type="radio" name="q_${q.id}" value="${escapeHtml(opt)}" ${q.required ? 'required' : ''}>
        <span>${escapeHtml(opt)}</span>
      </label>`).join('')}</div>`;
  } else if (q.type === 'multiple') {
    body = `<div class="q-options">${(q.options || []).map((opt, oi) => `
      <label class="q-option">
        <input type="checkbox" name="q_${q.id}" value="${escapeHtml(opt)}" data-multi="${q.id}">
        <span>${escapeHtml(opt)}</span>
      </label>`).join('')}</div>`;
  }

  const typeLabel = {
    bool: 'Vrai / Faux',
    short: 'Reponse courte',
    long: 'Reponse longue',
    single: 'Choix unique',
    multiple: 'Choix multiples'
  }[q.type] || q.type;

  return `
    <div class="q-item hud-panel ${reqClass}">
      <span class="hud-c2"></span>
      <span class="q-type-tag">${typeLabel}</span>
      <span class="q-label">${escapeHtml(q.label)}${reqMark}</span>
      ${body}
    </div>
  `;
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const answers = application.questions.map((q) => {
    if (q.type === 'multiple') {
      const checked = [...form.querySelectorAll(`input[data-multi="${q.id}"]:checked`)].map((el) => el.value);
      return { questionId: q.id, label: q.label, type: q.type, value: checked };
    }
    const field = form.querySelector(`[name="q_${q.id}"]:checked, textarea[name="q_${q.id}"], input[type="text"][name="q_${q.id}"]`);
    let value = '';
    if (field) {
      if (field.type === 'radio') value = field.value;
      else value = field.value;
    }
    return { questionId: q.id, label: q.label, type: q.type, value };
  });

  const missing = application.questions.some((q, i) => {
    if (!q.required) return false;
    const a = answers[i];
    if (q.type === 'multiple') return false; // pas de "required" strict sur multi
    return !a.value || (Array.isArray(a.value) && a.value.length === 0);
  });
  if (missing) {
    alert('Merci de repondre a toutes les questions obligatoires (marquees *).');
    return;
  }

  const res = await fetch(`/api/applications/${appId}/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, flags })
  });

  if (res.status === 409) {
    alert('Tu as deja soumis cette candidature.');
    submitted = true;
    disarmAntiLeave();
    location.href = '/';
    return;
  }
  if (!res.ok) {
    alert("Une erreur est survenue lors de l'envoi. Reessaie.");
    return;
  }

  submitted = true;
  disarmAntiLeave();
  qContainer.innerHTML = `<div class="empty-state">Candidature envoyee. Merci ! Tu peux fermer cette page.</div>`;
}

// ---------- anti-fuite ----------
// Note : aucune page web ne peut empecher techniquement un utilisateur de fermer
// son navigateur. Ce systeme decourage fortement de quitter (plein ecran force,
// avertissement bloquant, confirmation de fermeture) et surtout enregistre
// chaque tentative pour que l'equipe de recrutement la voie sur la candidature.

function logFlag(type) {
  flags.push({ type, timestamp: new Date().toISOString() });
}

function showLeaveWarning() {
  if (submitted) return;
  leaveCount += 1;
  leaveCountEl.textContent = leaveCount;
  leaveWarning.classList.add('show');
}

function armAntiLeave() {
  document.addEventListener('contextmenu', preventContext);
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onBlur);
  window.addEventListener('beforeunload', onBeforeUnload);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('keydown', blockDevtoolShortcuts);

  resumeBtn.addEventListener('click', () => {
    leaveWarning.classList.remove('show');
    requestFullscreen();
  });

  requestFullscreen();
}

function disarmAntiLeave() {
  document.removeEventListener('contextmenu', preventContext);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  window.removeEventListener('blur', onBlur);
  window.removeEventListener('beforeunload', onBeforeUnload);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  document.removeEventListener('keydown', blockDevtoolShortcuts);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

function requestFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
}

function preventContext(e) { e.preventDefault(); }

function onVisibilityChange() {
  if (document.hidden && !submitted) {
    logFlag('changement_onglet');
    showLeaveWarning();
  }
}

function onBlur() {
  if (!submitted) {
    logFlag('perte_focus');
    showLeaveWarning();
  }
}

function onFullscreenChange() {
  if (!document.fullscreenElement && !submitted) {
    logFlag('sortie_plein_ecran');
    showLeaveWarning();
  }
}

function onBeforeUnload(e) {
  if (submitted) return;
  logFlag('tentative_fermeture');
  e.preventDefault();
  e.returnValue = '';
}

function blockDevtoolShortcuts(e) {
  const blocked =
    e.key === 'F12' ||
    (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key)) ||
    (e.ctrlKey && e.key === 'u');
  if (blocked) e.preventDefault();
}

load();
