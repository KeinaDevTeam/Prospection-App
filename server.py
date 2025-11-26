import os
import xmlrpc.client
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from flask import Flask, jsonify, request, send_from_directory
from dotenv import load_dotenv


load_dotenv()


@dataclass
class OdooConfig:
    url: str = ""
    db: str = ""
    user: str = ""
    password: str = ""

    @classmethod
    def from_env(cls) -> "OdooConfig":
        return cls(
            url=os.getenv("ODOO_URL", "").strip(),
            db=os.getenv("ODOO_DB", "").strip(),
            user=os.getenv("ODOO_USER", "").strip(),
            password=os.getenv("ODOO_PASSWORD", "").strip(),
        )

    def is_complete(self) -> bool:
        return all((self.url, self.db, self.user, self.password))


config = OdooConfig.from_env()
app = Flask(
    __name__,
    static_folder=os.path.abspath(os.path.dirname(__file__)),
    static_url_path="",
)
@app.get("/")
def serve_index():
    return send_from_directory(app.static_folder, "index.html")



REQUIRED_FIELDS = ("name", "phone", "country")


def validate_payload(data: Dict) -> Tuple[bool, List[str]]:
    errors: List[str] = []
    if not isinstance(data, dict):
        return False, ["Payload JSON invalide."]

    for field in REQUIRED_FIELDS:
        value = (data.get(field) or "").strip()
        if not value:
            errors.append(f"Le champ '{field}' est requis.")

    email = (data.get("email") or "").strip()
    if email and "@" not in email:
        errors.append("Le champ 'email' doit contenir un '@'.")

    interests = data.get("interests")
    if interests and not isinstance(interests, list):
        errors.append("Le champ 'interests' doit être une liste.")

    return len(errors) == 0, errors


def get_odoo_clients(cfg: OdooConfig) -> Tuple[int, xmlrpc.client.ServerProxy]:
    common = xmlrpc.client.ServerProxy(f"{cfg.url}/xmlrpc/2/common")
    uid = common.authenticate(cfg.db, cfg.user, cfg.password, {})
    if not uid:
        raise RuntimeError("Authentification Odoo échouée.")
    models = xmlrpc.client.ServerProxy(f"{cfg.url}/xmlrpc/2/object")
    return uid, models


def find_country_id(
    models,
    cfg: OdooConfig,
    uid: int,
    country_iso: Optional[str],
    country_name: Optional[str],
) -> Optional[int]:
    if country_iso:
        result = models.execute_kw(
            cfg.db,
            uid,
            cfg.password,
            "res.country",
            "search",
            [[["code", "=", country_iso.upper()]]],
            {"limit": 1},
        )
        if result:
            return result[0]

    if country_name:
        result = models.execute_kw(
            cfg.db,
            uid,
            cfg.password,
            "res.country",
            "search",
            [[["name", "ilike", country_name]]],
            {"limit": 1},
        )
        if result:
            return result[0]
    return None


def build_partner_payload(data: Dict, country_id: Optional[int]) -> Dict:
    interests = ", ".join(data["interests"]) if data.get("interests") else ""
    base_comment = (data.get("comments") or data.get("activities") or "").strip()
    if interests:
        separator = "\n\n---\n" if base_comment else ""
        comments = f"{base_comment}{separator}Centres d'intérêt : {interests}"
    else:
        comments = base_comment

    payload = {
        "name": data["name"].strip(),
        "phone": data["phone"].strip(),
        "email": (data.get("email") or "").strip() or False,
        "street": (data.get("address") or "").strip() or False,
        "comment": comments or False,
    }
    if country_id:
        payload["country_id"] = country_id
    if interests:
        payload["x_studio_centre_dinterets"] = interests
    return payload


@app.get("/health")
def health_check():
    return jsonify(
        {
            "status": "ok",
            "odoo_configured": config.is_complete(),
        }
    )


@app.post("/api/contacts")
def create_contact():
    payload = request.get_json(silent=True)
    is_valid, errors = validate_payload(payload)
    if not is_valid:
        return jsonify({"success": False, "errors": errors}), 400

    if not config.is_complete():
        return (
            jsonify(
                {
                    "success": False,
                    "error": "Bridge prêt mais variables Odoo manquantes.",
                }
            ),
            503,
        )

    try:
        uid, models = get_odoo_clients(config)
        country_id = find_country_id(
            models,
            config,
            uid,
            payload.get("country_iso", ""),
            payload.get("country", ""),
        )
        partner_vals = build_partner_payload(payload, country_id)
        partner_id = models.execute_kw(
            config.db,
            uid,
            config.password,
            "res.partner",
            "create",
            [partner_vals],
        )
    except Exception as exc:
        return (
            jsonify(
                {
                    "success": False,
                    "error": f"Erreur lors de la création Odoo : {exc}",
                }
            ),
            502,
        )

    return jsonify({"success": True, "id": partner_id}), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "5000")), debug=True)

