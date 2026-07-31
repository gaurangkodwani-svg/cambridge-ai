from flask_login import LoginManager, UserMixin, login_user, logout_user
from flask_bcrypt import Bcrypt
from flask import request, jsonify
from database import load_json, save_json
import uuid

bcrypt = Bcrypt()
login_manager = LoginManager()
USER_DB = "database/users.json"

class User(UserMixin):
    def __init__(self, data):
        self.id = data["id"]
        self.username = data["username"]
        self.password = data["password"]

@login_manager.user_loader
def load_user(user_id):
    users = load_json(USER_DB, {"users":[]})["users"]
    for u in users:
        if u["id"] == user_id: return User(u)
    return None

def register():
    data = request.json or {}
    username, password = data.get("username","").strip(), data.get("password","")
    if not username or not password: return jsonify({"success":False,"error":"Missing fields"}), 400
    db = load_json(USER_DB, {"users":[]})
    if any(u["username"].lower()==username.lower() for u in db["users"]):
        return jsonify({"success":False,"error":"User exists"}), 400
    hashed = bcrypt.generate_password_hash(password).decode("utf-8")
    user = {"id":str(uuid.uuid4()), "username":username, "password":hashed, "progress":{"quizzes":[]}}
    db["users"].append(user)
    save_json(USER_DB, db)
    return jsonify({"success":True})

def login():
    data = request.json or {}
    username, password = data.get("username",""), data.get("password","")
    users = load_json(USER_DB, {"users":[]})["users"]
    for u in users:
        if u["username"].lower()==username.lower():
            if bcrypt.check_password_hash(u["password"], password):
                login_user(User(u))
                return jsonify({"success":True})
            return jsonify({"success":False,"error":"Wrong password"}), 401
    return jsonify({"success":False,"error":"User not found"}), 401

def logout():
    logout_user()
    return jsonify({"success":True})