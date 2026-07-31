import json
import os


# ======================================================================
#  Persistent storage layer
#
#  Local development / Heroku : JSON files (original behavior)
#  Vercel (serverless)        : Neon serverless Postgres
#
#  The public API (load_json / save_json) is unchanged, so auth.py and
#  server.py keep working without any edits. When DATABASE_URL is set,
#  documents are stored in a simple key/value table in Postgres, which
#  survives across serverless function invocations (JSON files do NOT
#  persist on Vercel).
# ======================================================================


def _on_serverless() -> bool:
    return os.environ.get("VERCEL") == "1"


def _remote_available() -> bool:
    return bool(os.environ.get("DATABASE_URL"))


def _connect():
    import psycopg
    return psycopg.connect(os.environ["DATABASE_URL"])


# Set to True once the app_kv table is known to exist, so we don't run
# CREATE TABLE IF NOT EXISTS on every single read/write.
_remote_ready = False


def _ensure_table(conn):
    global _remote_ready
    if _remote_ready:
        return
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS app_kv (
                key   TEXT PRIMARY KEY,
                value JSONB NOT NULL
            )
            """
        )
    conn.commit()
    _remote_ready = True


def _remote_load(key: str, default):
    try:
        conn = _connect()
        try:
            _ensure_table(conn)
            with conn.cursor() as cur:
                cur.execute("SELECT value FROM app_kv WHERE key = %s", (key,))
                row = cur.fetchone()
                return row[0] if row else default
        finally:
            conn.close()
    except Exception as e:
        print(f"[database] remote load failed for {key}: {e}")
        return default


def _remote_save(key: str, data) -> bool:
    try:
        conn = _connect()
        try:
            _ensure_table(conn)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO app_kv (key, value) VALUES (%s, %s::jsonb)
                    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
                    """,
                    (key, json.dumps(data)),
                )
            conn.commit()
            return True
        finally:
            conn.close()
    except Exception as e:
        print(f"[database] remote save failed for {key}: {e}")
        return False


def load_json(path, default):
    if _remote_available():
        return _remote_load(str(path), default)

    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default


def save_json(path, data):
    # On Vercel the filesystem is read-only, so a missing/broken
    # DATABASE_URL must fail loudly instead of silently writing to disk.
    if _on_serverless() and not _remote_available():
        raise RuntimeError(
            "[database] DATABASE_URL is required on Vercel but is not set. "
            "Add it under Settings -> Environment Variables."
        )

    if _remote_available():
        if _remote_save(str(path), data):
            return
        if _on_serverless():
            raise RuntimeError(
                "[database] DATABASE_URL is set but the write failed. "
                "Check the Neon connection string in your environment variables."
            )

    # Fallback for local development (no DATABASE_URL)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)