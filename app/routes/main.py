import json
import os
import re
from datetime import datetime
from pathlib import Path

from flask import Blueprint, jsonify, render_template, request

main_bp = Blueprint("main", __name__)

WAITLIST_FILE = Path(__file__).resolve().parent.parent.parent / "waitlist.jsonl"
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@main_bp.route("/")
def index():
    return render_template("index.html")


@main_bp.route("/waitlist", methods=["POST"])
def waitlist():
    contact = (request.form.get("contact") or "").strip()
    city = (request.form.get("city") or "Алматы").strip()

    if not contact or len(contact) < 3:
        return render_template(
            "partials/waitlist_error.html",
            message="Оставь контакт — почту или телефон.",
        ), 400

    WAITLIST_FILE.parent.mkdir(parents=True, exist_ok=True)
    with WAITLIST_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps({
            "contact": contact,
            "city": city,
            "ts": datetime.utcnow().isoformat() + "Z",
            "ip": request.headers.get("X-Forwarded-For", request.remote_addr),
        }, ensure_ascii=False) + "\n")

    return render_template("partials/waitlist_success.html", contact=contact)
