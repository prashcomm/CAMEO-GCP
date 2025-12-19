import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

ROOT_DIR = Path(__file__).parent
env_path = ROOT_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)

def getenv_strip(key: str, default: str = None):
    v = os.environ.get(key, None)
    if v is None:
        return default
    return v.strip().strip('"').strip("'")

mongo = (getenv_strip('MONGO_URL') or getenv_strip('MONGODB_URI') or getenv_strip('MONGODB_URL') or getenv_strip('MONGO_URI'))
if not mongo:
    mongo = getenv_strip('LOCAL_MONGO') or 'mongodb://localhost:27017'

db_name = getenv_strip('DB_NAME') or 'EventPhotoGallery'

print(f"Testing MongoDB connection to: {mongo} (db: {db_name})")

try:
    client = MongoClient(mongo, serverSelectionTimeoutMS=5000)
    info = client.admin.command('ping')
    print('Ping result:', info)
    # list collections in the DB (may be empty)
    db = client[db_name]
    print('Collections:', db.list_collection_names())
    print('MongoDB connection OK')
except Exception as e:
    print('MongoDB connection FAILED:', e)
    raise
