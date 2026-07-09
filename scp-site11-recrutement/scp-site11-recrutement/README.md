# SCP Site-11 — Site de recrutement

Site de recrutement pour le Departement Administratif, avec connexion Discord obligatoire, gestion des candidatures (ouverture/fermeture, questionnaires personnalises) protegee par mot de passe, et un mode "anti-fuite" sur le questionnaire.

## Fonctionnalites

- **Connexion Discord obligatoire** pour voir/remplir une candidature (OAuth2).
- **Espace de gestion** (`/admin.html`) protege par mot de passe :
  - Creer / modifier / supprimer des candidatures
  - Ouvrir / fermer une candidature
  - Construire un questionnaire different pour chaque candidature, avec 5 types de questions :
    - Vrai / Faux
    - Reponse courte
    - Reponse longue
    - Choix unique (radio)
    - Choix multiples (cases a cocher)
  - Voir les reponses recues et les alertes "anti-fuite" par candidat
- **Page questionnaire** avec systeme de dissuasion contre le fait de quitter la page :
  - passage en plein ecran force au demarrage
  - avertissement bloquant si l'onglet perd le focus, si le plein ecran est quitte, ou si l'utilisateur change d'onglet
  - confirmation de fermeture du navigateur
  - toutes les tentatives sont enregistrees et visibles par l'equipe de recrutement dans l'espace de gestion

**Important — limite technique honnete :** aucun site web ne peut *empecher* techniquement quelqu'un de fermer son navigateur ou d'eteindre son ecran. Ce systeme dissuade fortement et **journalise** chaque tentative (changement d'onglet, perte de focus, sortie du plein ecran, fermeture) pour que ce soit visible cote admin — mais ce n'est pas un verrou absolu.

## Installation en local

```bash
npm install
cp .env.example .env
# remplis .env avec tes identifiants (voir plus bas)
npm start
```

Le site tourne ensuite sur http://localhost:3000

## Configuration de l'application Discord

1. Va sur https://discord.com/developers/applications et cree une application.
2. Onglet **OAuth2** :
   - copie le **Client ID** et le **Client Secret** dans `.env`
   - ajoute une **Redirect URI** :
     - en local : `http://localhost:3000/auth/discord/callback`
     - en production (Railway) : `https://TON-DOMAINE.up.railway.app/auth/discord/callback`
3. (Optionnel) Si tu veux restreindre l'acces aux membres d'un serveur Discord precis, mets l'ID de ce serveur dans `DISCORD_GUILD_ID` dans `.env`. Clic droit sur le serveur > Copier l'identifiant (mode developpeur Discord requis).

## Variables d'environnement (`.env`)

Voir `.env.example` pour la liste complete. Les plus importantes :

- `ADMIN_PASSWORD` : mot de passe pour acceder a `/admin.html`
- `SESSION_SECRET` : chaine aleatoire longue (change-la, ne la partage pas)
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`
- `DISCORD_GUILD_ID` (optionnel)

## Deploiement sur Railway

Meme principe que ton site de recrutement Discord precedent :

1. Pousse ce dossier sur un depot GitHub.
2. Sur Railway, cree un nouveau projet a partir de ce depot GitHub.
3. Si le projet est a la racine du depot, rien a faire ; sinon regle bien le **Root Directory** vers ce dossier.
4. Dans l'onglet **Variables** de Railway, ajoute toutes les variables de `.env.example` avec tes vraies valeurs (Railway fournit deja `PORT` automatiquement).
5. Une fois deploye, recupere l'URL Railway et mets-la a jour :
   - dans `DISCORD_REDIRECT_URI` (variable Railway)
   - dans le portail developpeur Discord (Redirect URI)

## Stockage des donnees

Les candidatures et les reponses sont stockees dans de simples fichiers JSON (`data/applications.json`, `data/submissions.json`), comme pour tes projets precedents. C'est suffisant pour un usage communautaire, mais garde en tete que sur Railway le systeme de fichiers n'est pas garanti persistant a 100% entre redeploiements : pense a exporter/sauvegarder ces fichiers de temps en temps si tu accumules beaucoup de candidatures.

## Structure du projet

```
server.js                  -> serveur Express (auth Discord, auth admin, API)
public/
  index.html + js/main.js       -> page publique (connexion + liste des candidatures)
  questionnaire.html + js/...   -> page de questionnaire dynamique + anti-fuite
  admin.html + js/admin.js      -> espace de gestion
  css/style.css                 -> design (rouge/blanc/noir, theme SCP)
data/
  applications.json         -> candidatures + questionnaires
  submissions.json          -> reponses recues + alertes anti-fuite
```
