const userBox = document.getElementById('userBox');
const root = document.getElementById('app-root');

const urlParams = new URLSearchParams(location.search);
const authError = urlParams.get('auth');

function avatarUrl(user) {
  if (!user.avatar) {
    return `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.discriminator || '0', 10) || 0) % 5}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
}

async function init() {
  const meRes = await fetch('/api/me');
  const me = await meRes.json();

  if (!me.user) {
    renderGate();
    return;
  }

  userBox.innerHTML = `
    <img src="${avatarUrl(me.user)}" alt="">
    <span>${escapeHtml(me.user.username)}</span>
    <button class="btn btn-outline" id="logoutBtn">Deconnexion</button>
  `;
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/auth/logout', { method: 'POST' });
    location.reload();
  });

  const appsRes = await fetch('/api/applications');
  const apps = await appsRes.json();
  renderApplications(apps);
}

function renderGate() {
  let errMsg = '';
  if (authError === 'not_member') errMsg = "<p class='error-msg'>Tu dois etre membre du serveur Discord de la communaute pour acceder au site.</p>";
  else if (authError === 'erreur' || authError === 'refuse') errMsg = "<p class='error-msg'>La connexion Discord a echoue. Reessaie.</p>";

  root.innerHTML = `
    <div class="hero">
      <span class="eyebrow">// ACCES RESTREINT</span>
      <h2>Rejoins le Departement<br>Administratif du Site-11</h2>
      <p>Les candidatures ouvertes sont visibles uniquement apres connexion via Discord. Connecte-toi avec le compte que tu utilises sur le serveur.</p>
    </div>
    <div class="gate hud-panel">
      <span class="hud-c2"></span>
      <span class="stamp">Niveau 1 requis</span>
      <h2>Connexion requise</h2>
      <p>${errMsg || 'Authentifie-toi avec Discord pour consulter et remplir les candidatures ouvertes.'}</p>
      <a class="discord-btn" href="/auth/discord">Se connecter avec Discord</a>
    </div>
  `;
}

function renderApplications(apps) {
  const cards = apps.map((a) => {
    const doneTag = a.alreadySubmitted ? '<span class="tag-done">Deja soumise</span>' : '';
    const disabled = a.alreadySubmitted ? 'disabled' : '';
    return `
      <div class="app-card hud-panel">
        <span class="hud-c2"></span>
        ${doneTag}
        <h4>${escapeHtml(a.title)}</h4>
        <p>${escapeHtml(a.description || '')}</p>
        <span class="meta">${a.questions.length} question(s)</span>
        <button class="btn btn-primary" ${disabled} onclick="location.href='/questionnaire.html?id=${a.id}'">
          ${a.alreadySubmitted ? 'Candidature envoyee' : 'Postuler'}
        </button>
      </div>
    `;
  }).join('');

  root.innerHTML = `
    <div class="container">
      <div class="section-title">
        <span class="num">01</span>
        <h3>Candidatures ouvertes</h3>
      </div>
      ${apps.length ? `<div class="app-grid">${cards}</div>` : `<div class="empty-state">Aucune candidature ouverte pour le moment. Reviens plus tard.</div>`}
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

init();
