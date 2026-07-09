require('dotenv').config();
const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID || null;
const OAUTH_SCOPE = DISCORD_GUILD_ID ? 'identify guilds' : 'identify';

// ---------- petits utilitaires de stockage JSON ----------
function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8') || '[]');
  } catch (e) {
    return [];
  }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.use(express.json({ limit: '2mb' }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8h
  })
);
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Auth Discord (OAuth2) ----------
app.get('/auth/discord', (req, res) => {
  if (!DISCORD_CLIENT_ID || !DISCORD_REDIRECT_URI) {
    return res
      .status(500)
      .send("Configuration Discord manquante cote serveur (DISCORD_CLIENT_ID / DISCORD_REDIRECT_URI).");
  }
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: OAUTH_SCOPE,
    prompt: 'consent'
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect('/?auth=refuse');

  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI
      })
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error('Pas de token recu de Discord');

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const user = await userRes.json();

    // Optionnel : restreindre aux membres d'un serveur Discord precis
    if (DISCORD_GUILD_ID) {
      const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const guilds = await guildsRes.json();
      const isMember = Array.isArray(guilds) && guilds.some((g) => g.id === DISCORD_GUILD_ID);
      if (!isMember) return res.redirect('/?auth=not_member');
    }

    req.session.discordUser = {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator || '0',
      avatar: user.avatar
    };
    res.redirect('/');
  } catch (e) {
    console.error('Erreur OAuth Discord:', e);
    res.redirect('/?auth=erreur');
  }
});

app.post('/auth/logout', (req, res) => {
  req.session.discordUser = null;
  res.json({ ok: true });
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.discordUser || null, isAdmin: !!req.session.isAdmin });
});

// ---------- Middlewares ----------
function requireDiscord(req, res, next) {
  if (!req.session.discordUser) return res.status(401).json({ error: 'discord_requis' });
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.isAdmin) return res.status(401).json({ error: 'admin_requis' });
  next();
}

// ---------- Auth admin (mot de passe) ----------
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password && process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'mot_de_passe_invalide' });
});
app.post('/api/admin/logout', (req, res) => {
  req.session.isAdmin = false;
  res.json({ ok: true });
});

// ---------- Candidatures (cote public) ----------
app.get('/api/applications', requireDiscord, (req, res) => {
  const apps = readJSON(APPLICATIONS_FILE);
  const submissions = readJSON(SUBMISSIONS_FILE);
  const uid = req.session.discordUser.id;
  const publicList = apps
    .filter((a) => a.status === 'open')
    .map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      questions: a.questions,
      alreadySubmitted: submissions.some((s) => s.applicationId === a.id && s.discordUser.id === uid)
    }));
  res.json(publicList);
});

app.get('/api/applications/:id', requireDiscord, (req, res) => {
  const apps = readJSON(APPLICATIONS_FILE);
  const a = apps.find((x) => x.id === req.params.id && x.status === 'open');
  if (!a) return res.status(404).json({ error: 'introuvable' });
  res.json(a);
});

app.post('/api/applications/:id/submit', requireDiscord, (req, res) => {
  const apps = readJSON(APPLICATIONS_FILE);
  const a = apps.find((x) => x.id === req.params.id);
  if (!a || a.status !== 'open') return res.status(400).json({ error: 'fermee' });

  const submissions = readJSON(SUBMISSIONS_FILE);
  const uid = req.session.discordUser.id;
  if (submissions.some((s) => s.applicationId === a.id && s.discordUser.id === uid)) {
    return res.status(409).json({ error: 'deja_soumise' });
  }

  const submission = {
    id: crypto.randomUUID(),
    applicationId: a.id,
    applicationTitle: a.title,
    discordUser: req.session.discordUser,
    answers: Array.isArray(req.body.answers) ? req.body.answers : [],
    flags: Array.isArray(req.body.flags) ? req.body.flags : [],
    submittedAt: new Date().toISOString()
  };
  submissions.push(submission);
  writeJSON(SUBMISSIONS_FILE, submissions);
  res.json({ ok: true });
});

// ---------- Espace de gestion (admin) ----------
app.get('/api/admin/applications', requireAdmin, (req, res) => {
  res.json(readJSON(APPLICATIONS_FILE));
});

app.post('/api/admin/applications', requireAdmin, (req, res) => {
  const apps = readJSON(APPLICATIONS_FILE);
  const newApp = {
    id: crypto.randomUUID(),
    title: (req.body.title || 'Sans titre').trim(),
    description: req.body.description || '',
    status: 'closed',
    createdAt: new Date().toISOString(),
    questions: Array.isArray(req.body.questions) ? req.body.questions : []
  };
  apps.push(newApp);
  writeJSON(APPLICATIONS_FILE, apps);
  res.json(newApp);
});

app.put('/api/admin/applications/:id', requireAdmin, (req, res) => {
  const apps = readJSON(APPLICATIONS_FILE);
  const idx = apps.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'introuvable' });
  apps[idx] = {
    ...apps[idx],
    title: req.body.title ?? apps[idx].title,
    description: req.body.description ?? apps[idx].description,
    questions: req.body.questions ?? apps[idx].questions
  };
  writeJSON(APPLICATIONS_FILE, apps);
  res.json(apps[idx]);
});

app.post('/api/admin/applications/:id/toggle', requireAdmin, (req, res) => {
  const apps = readJSON(APPLICATIONS_FILE);
  const a = apps.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'introuvable' });
  a.status = a.status === 'open' ? 'closed' : 'open';
  writeJSON(APPLICATIONS_FILE, apps);
  res.json(a);
});

app.delete('/api/admin/applications/:id', requireAdmin, (req, res) => {
  let apps = readJSON(APPLICATIONS_FILE);
  apps = apps.filter((a) => a.id !== req.params.id);
  writeJSON(APPLICATIONS_FILE, apps);
  res.json({ ok: true });
});

app.get('/api/admin/submissions', requireAdmin, (req, res) => {
  res.json(readJSON(SUBMISSIONS_FILE));
});

app.get('/api/admin/applications/:id/submissions', requireAdmin, (req, res) => {
  const submissions = readJSON(SUBMISSIONS_FILE).filter((s) => s.applicationId === req.params.id);
  res.json(submissions);
});

app.delete('/api/admin/submissions/:id', requireAdmin, (req, res) => {
  let submissions = readJSON(SUBMISSIONS_FILE);
  submissions = submissions.filter((s) => s.id !== req.params.id);
  writeJSON(SUBMISSIONS_FILE, submissions);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`[SCP Site-11] Recrutement en ligne sur le port ${PORT}`);
  if (!DISCORD_CLIENT_ID) console.warn('! DISCORD_CLIENT_ID manquant dans .env');
  if (!process.env.ADMIN_PASSWORD) console.warn('! ADMIN_PASSWORD manquant dans .env');
});
