# Prospection-App

Formulaire de contact ajouté :

- `index.html` : page avec le formulaire (Nom, Téléphone, E-mail, Activités, Pays, Adresse)
- `styles.css` : styles pour le formulaire
- `script.js` : validation client et envoi vers l'API locale

Serveur local (bridge) pour créer des contacts dans Odoo

J'ai ajouté un petit serveur Flask (`server.py`) qui sert la page statique et expose une API `POST /api/contacts` qui crée un contact dans le module Contacts (`res.partner`) d'Odoo via XML-RPC.

Prérequis : Python 3.8+ et variables d'environnement configurées (via `.env`) :

	- `ODOO_URL` (ex: `https://yourcompany.odoo.com`)
	- `ODOO_DB` (nom de la base)
	- `ODOO_USER` (login/email)
	- `ODOO_PASSWORD` (mot de passe ou API key)
	- `ALLOWED_ORIGINS` (optionnel, ex: `https://toncompte.github.io`)

Installation et exécution :

```bash
# Créer un environnement virtuel (Linux/macOS/PowerShell)
python -m venv .venv
source .venv/bin/activate        # PowerShell : .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Copier .env (jamais commité) et remplir :
cat <<'EOF' > .env
ODOO_URL="https://aniekgroup.odoo.com"
ODOO_DB="nom_de_base"
ODOO_USER="user@example.com"
ODOO_PASSWORD="your-api-key-or-password"
PORT=5000
EOF

# Lancer le serveur Flask (sert la SPA + expose /api/contacts)
python server.py

# Le formulaire est disponible sur http://127.0.0.1:5000
```

Déploiement statique (GitHub Pages) :

1. Hébergez `server.py` sur Render/Railway/etc. et définissez `ALLOWED_ORIGINS` avec le domaine de votre front.
2. Dans `config.js`, renseignez `window.APP_CONFIG.API_BASE_URL` avec l’URL publique de l’API (ex: `https://prospection-app.onrender.com`).
3. Poussez `index.html`, `styles.css`, `config.js`, `script.js` sur GitHub. Activez GitHub Pages (branche `main`, dossier `/`).

Fonctionnement : le formulaire poste en JSON vers `/api/contacts` (ou l’URL fournie dans `config.js`). Le serveur (bridge) valide les champs, prépare la charge utile puis crée un `res.partner` dans Odoo avec `name`, `phone`, `email`, `street`, `country_id` (recherche par code ISO ou nom) et les commentaires.

Sécurité et bonnes pratiques :

- Préférez créer une API key (Profil utilisateur Odoo) et l'utiliser comme `ODOO_PASSWORD`.
- Ne commitez pas vos identifiants dans le dépôt. Utilisez des variables d'environnement ou un coffre de secrets.