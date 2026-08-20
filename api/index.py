"""
Vercel serverless entrypoint.

Vercel's Python runtime imports this file directly. Because the real Flask
app lives in backend/server.py with sibling imports (from auth import ...),
we add the backend/ folder to the import path FIRST so those imports resolve.
"""
import os
import sys

BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from server import app  # noqa: E402  (import after sys.path setup)
