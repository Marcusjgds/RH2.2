# Port fourni automatiquement par Railway, sinon 3000 en local
PORT=3000

# Mot de passe pour acceder a l'espace de gestion des candidatures
ADMIN_PASSWORD=change-moi

# Cle secrete pour signer les sessions (mets une chaine aleatoire longue)
SESSION_SECRET=change-moi-aussi

# Application Discord (https://discord.com/developers/applications)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
# Doit correspondre EXACTEMENT a une "Redirect URI" declaree sur le portail Discord
# Exemple en local : http://localhost:3000/auth/discord/callback
# Exemple sur Railway : https://tonapp.up.railway.app/auth/discord/callback
DISCORD_REDIRECT_URI=http://localhost:3000/auth/discord/callback

# Optionnel : si rempli, seuls les membres de ce serveur Discord pourront se connecter
DISCORD_GUILD_ID=
