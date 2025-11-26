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

Fonctionnement : le formulaire poste en JSON vers `/api/contacts`. Le serveur (bridge) valide les champs, prépare la charge utile puis crée un `res.partner` dans Odoo avec `name`, `phone`, `email`, `street` (adresse), `country_id` (recherche par nom) et les commentaires.

Sécurité et bonnes pratiques :

- Préférez créer une API key (Profil utilisateur Odoo) et l'utiliser comme `ODOO_PASSWORD`.
- Ne commitez pas vos identifiants dans le dépôt. Utilisez des variables d'environnement ou un coffre de secrets.