# Prospection-App

Formulaire de contact ajouté :

- `index.html` : page avec le formulaire (Nom, Téléphone, E-mail, Activités, Pays, Adresse)
- `styles.css` : styles pour le formulaire
- `script.js` : validation client et envoi vers l'API locale

Serveur local (bridge) pour créer des contacts dans Odoo

J'ai ajouté un petit serveur Flask (`server.py`) qui sert la page statique et expose une API `POST /api/contacts` qui crée un contact dans le module Contacts (`res.partner`) d'Odoo via XML-RPC.

Prérequis : Python 3.8+ et variables d'environnement configurées :

	- `ODOO_URL` (ex: `https://yourcompany.odoo.com`)
	- `ODOO_DB` (nom de la base)
	- `ODOO_USER` (login/email)
	- `ODOO_PASSWORD` (mot de passe ou API key)

Installation et exécution (PowerShell) :

```powershell
# Créer un environnement virtuel
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Définir variables d'environnement (exemple)
$env:ODOO_URL = 'https://aniekgroup.odoo.com'
$env:ODOO_DB = ''
$env:ODOO_USER = 'user@example.com'
$env:ODOO_PASSWORD = 'your-api-key-or-password'

# Lancer le serveur
python server.py

# Ouvrez ensuite http://127.0.0.1:5000
```

Fonctionnement : le formulaire poste en JSON vers `/api/contacts`. Le serveur crée un `res.partner` avec les champs `name`, `phone`, `email`, `street` (adresse) et `country_id` si le nom du pays est retrouvé.

Sécurité et bonnes pratiques :

- Préférez créer une API key (Profil utilisateur Odoo) et l'utiliser comme `ODOO_PASSWORD`.
- Ne commitez pas vos identifiants dans le dépôt. Utilisez des variables d'environnement ou un coffre de secrets.