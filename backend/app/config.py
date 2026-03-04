import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'prview.db')}"
SERVER_PORT = int(os.environ.get("PRVIEW_PORT", 8000))
