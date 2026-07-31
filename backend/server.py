from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_cors import CORS
from flask_login import login_required, current_user
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
import os, uuid, datetime, PyPDF2
from pathlib import Path

# Import our custom modules
from auth import bcrypt, login_manager, register, login, logout, USER_DB
from database import load_json, save_json
import ai
from ocr import extract_text, get_ocr_status

# 1. SETUP PATHS (Windows Friendly)
BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
DATABASE_DIR = BASE_DIR / "database"
PAPERS_DIR = BASE_DIR / "papers"

load_dotenv()

# Serverless (Vercel) runs have a read-only filesystem outside of /tmp,
# so writable folders are redirected there.
if os.environ.get("VERCEL") == "1":
    TEMP_BASE = Path(os.environ.get("TMPDIR", "/tmp"))
    UPLOAD_DIR = TEMP_BASE / "uploads" / "study-materials"
    TEMP_DIR = TEMP_BASE / "uploads" / "temp"
else:
    UPLOAD_DIR = BASE_DIR / "uploads" / "study-materials"
    TEMP_DIR = BASE_DIR / "uploads" / "temp"

# 2. CREATE FOLDERS (Fixes WinError 183). Best-effort: never crash
# at import time on read-only filesystems.
def ensure_app_directories():
    directories = [
        DATABASE_DIR,
        UPLOAD_DIR,
        TEMP_DIR,
        PAPERS_DIR / "o-levels",
        PAPERS_DIR / "as-level",
        PAPERS_DIR / "a2-level",
    ]
    for d in directories:
        try:
            # If it exists as a file, rename it so we can make a folder
            if d.exists() and not d.is_dir():
                d.rename(str(d) + "_old_file")
            d.mkdir(parents=True, exist_ok=True)
            print(f"Ready: {d}")
        except OSError as e:
            print(f"Skipped (read-only filesystem?): {d} - {e}")

ensure_app_directories()

# 3. APP CONFIG
app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
app.secret_key = os.getenv("FLASK_SECRET", "cambridge-pro-secret-123")
CORS(app, supports_credentials=True)

bcrypt.init_app(app)
login_manager.init_app(app)

# 4. ROUTES - FRONTEND
@app.route("/")
def index():
    return send_from_directory(str(FRONTEND_DIR), "index.html")

# 5. ROUTES - AUTH
@app.route("/api/register", methods=["POST"])
def api_register(): return register()

@app.route("/api/login", methods=["POST"])
def api_login(): return login()

@app.route("/api/logout", methods=["POST"])
@login_required
def api_logout(): return logout()

# 6. ROUTES - AI TUTOR
@app.route("/api/chat", methods=["POST"])
def api_chat():
    msg = request.json.get("message", "")
    return jsonify({"success": True, "response": ai.chat(msg)})

@app.route("/api/chat-with-file", methods=["POST"])
def api_chat_with_file():
    try:
        message = request.form.get("message", "")
        files = request.files.getlist("files[]")
        all_text = ""

        for f in files:
            if f.filename:
                fname = secure_filename(f.filename)
                fpath = TEMP_DIR / fname
                f.save(str(fpath))
                
                result = extract_text(str(fpath))
                if result["success"]:
                    all_text += f"\n--- Content from {fname} ---\n{result['text']}\n"
                
                if fpath.exists(): os.remove(str(fpath))

        prompt = f"Review these materials and answer: {message}\n\nMaterials:\n{all_text[:7000]}"
        return jsonify({"success": True, "response": ai.chat(prompt)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

# 7. ROUTES - QUIZ
@app.route("/api/quiz", methods=["POST"])
def api_quiz():
    d = request.json
    res = ai.generate_quiz(d["topic"], d.get("subject", "General"), d.get("level", "O Level"))
    return jsonify({"success": True, "quiz": res})

@app.route("/api/mark", methods=["POST"])
@login_required
def api_mark():
    d = request.json
    result = ai.mark_quiz(d["questions"], d["answers"])
    
    # Save score to progress
    db = load_json(USER_DB, {"users": []})
    for u in db["users"]:
        if u["id"] == current_user.id:
            u.setdefault("progress", {}).setdefault("quizzes", []).append({
                "date": datetime.datetime.now().isoformat(),
                "topic": d.get("topic", "General"),
                "raw": result
            })
    save_json(USER_DB, db)
    return jsonify({"success": True, "result": result})

@app.route("/api/progress")
@login_required
def api_progress():
    db = load_json(USER_DB, {"users": []})
    for u in db["users"]:
        if u["id"] == current_user.id:
            q = u.get("progress", {}).get("quizzes", [])
            return jsonify({"success": True, "total_quizzes": len(q), "quizzes": q})
    return jsonify({"success": False})

# 8. ROUTES - NOTES & OCR
@app.route("/api/notes/upload", methods=["POST"])
def api_notes():
    if "file" not in request.files: return jsonify({"success": False, "error": "No file"}), 400
    
    file = request.files["file"]
    filename = secure_filename(file.filename)
    path = UPLOAD_DIR / filename
    file.save(str(path))
    
    try:
        # Use our smart OCR-enabled extraction
        extraction = extract_text(str(path))
        if not extraction["success"]:
            return jsonify({"success": False, "error": extraction["error"]}), 400
        
        notes = ai.generate_notes(extraction["text"], request.form.get("subject", "General"), request.form.get("topic", ""))
        return jsonify({
            "success": True, 
            "notes": notes, 
            "method": extraction["method"],
            "chars": extraction["char_count"]
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/ocr-status")
def api_ocr_status():
    return jsonify(get_ocr_status())

# 9. RUN SERVER
if __name__ == "__main__":
    if not os.path.exists(USER_DB):
        save_json(str(USER_DB), {"users": []})
    
    print("\n" + "="*50)
    print("CAMBRIDGE AI ASSISTANT STARTING")
    print("Local: http://127.0.0.1:5000")
    print("="*50 + "\n")
    
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_DEBUG", "false").lower() == "true")