from fastapi import FastAPI, APIRouter, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import numpy as np
import qrcode
import io
import base64
import shutil
import json
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
# Load env from backend/.env if present
env_path = ROOT_DIR / '.env'
if env_path.exists():
    load_dotenv(env_path)

# Helper to read env vars and strip surrounding quotes/spaces
def getenv_strip(key: str, default: Optional[str] = None) -> Optional[str]:
    v = os.environ.get(key, None)
    if v is None:
        return default
    return v.strip().strip('"').strip("'")

# Upload directories - allow override with env var (use project-local default for dev)
default_upload_dir = ROOT_DIR.parent / 'uploads'
UPLOAD_DIR = Path(getenv_strip('UPLOAD_DIR') or str(default_upload_dir))
ORIGINAL_DIR = UPLOAD_DIR / 'original'
USERS_DIR = UPLOAD_DIR / 'users'
TEMP_DIR = UPLOAD_DIR / 'temp'
FACES_DIR = UPLOAD_DIR / 'faces'

# Ensure directories exist (safe on all platforms)
for _dir in [ORIGINAL_DIR, USERS_DIR, TEMP_DIR, FACES_DIR]:
    try:
        _dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        # If path is not writable (e.g., read-only container), continue and rely on app to handle at runtime
        logger = logging.getLogger(__name__)
        logger.warning(f"Could not create directory {_dir}, continuing")

# MongoDB connection: support several common env var names and provide a local fallback for dev
raw_mongo = (getenv_strip('MONGO_URL') or
             getenv_strip('MONGODB_URL') or
             getenv_strip('MONGODB_URI') or
             getenv_strip('MONGO_URI'))

if raw_mongo:
    mongo_url = raw_mongo
else:
    # Local development fallback
    mongo_url = getenv_strip('LOCAL_MONGO') or 'mongodb://localhost:27017'

db_name = getenv_strip('DB_NAME') or 'EventPhotoGallery'

# Initialize Motor client (the actual connection happens on first I/O)
try:
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.error(f"Failed to initialize MongoDB client: {e}")
    # Re-raise so startup fails loudly in container environments where DB is required
    raise

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Mount static files from frontend build
FRONTEND_BUILD_DIR = Path(__file__).parent.parent / 'frontend' / 'build'

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Models
class UserRegistration(BaseModel):
    name: str
    email: EmailStr
    phone: str
    face_image_data: str  # base64 encoded image

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: str
    gallery_id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    face_encoding: List[float]
    created_at: str

class ImageMetadata(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_path: str
    upload_date: str
    processed: bool = False
    user_matches: List[str] = []  # List of user IDs

class AdminUser(BaseModel):
    email: str
    password_hash: str

class AdminLogin(BaseModel):
    email: str
    password: str

class DashboardStats(BaseModel):
    total_users: int
    total_images: int
    processed_images: int
    pending_images: int

# Helper Functions
def encode_face_from_base64(base64_data: str) -> Optional[List[float]]:
    """Extract face encoding from base64 image data"""
    try:
        # Lazy imports to avoid requiring heavy native deps at import-time
        try:
            import face_recognition
            import cv2
        except Exception as ie:
            logger.error(f"Required image libraries missing: {ie}")
            return None
        # Remove data URL prefix if present
        if 'base64,' in base64_data:
            base64_data = base64_data.split('base64,')[1]
        
        # Decode base64 to image
        img_bytes = base64.b64decode(base64_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # Convert BGR to RGB
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_image)
        
        if len(face_encodings) > 0:
            return face_encodings[0].tolist()
        return None
    except Exception as e:
        logger.error(f"Error encoding face: {e}")
        return None

def process_image_for_faces(image_path: str) -> List[List[float]]:
    """Extract all face encodings from an image"""
    try:
        # Lazy import
        try:
            import face_recognition
        except Exception as ie:
            logger.error(f"face_recognition not available: {ie}")
            return []
        image = face_recognition.load_image_file(image_path)
        face_encodings = face_recognition.face_encodings(image)
        return [encoding.tolist() for encoding in face_encodings]
    except Exception as e:
        logger.error(f"Error processing image {image_path}: {e}")
        return []

def compare_faces(known_encoding: List[float], unknown_encodings: List[List[float]], tolerance: float = 0.6) -> bool:
    """Compare a known face encoding with multiple unknown encodings"""
    if not unknown_encodings:
        return False
    known_np = np.array(known_encoding)
    unknown_np = [np.array(enc) for enc in unknown_encodings]

    try:
        import face_recognition
    except Exception as ie:
        logger.error(f"face_recognition not available for compare: {ie}")
        return False

    matches = face_recognition.compare_faces(unknown_np, known_np, tolerance=tolerance)
    return any(matches)

async def process_images_background():
    """Background task to process unprocessed images"""
    try:
        # Get all unprocessed images (limit to 100 per batch for performance)
        unprocessed = await db.images.find({"processed": False}).limit(100).to_list(100)
        logger.info(f"Processing {len(unprocessed)} images")
        
        # Get all registered users (limit to 1000 for performance)
        users = await db.users.find({}).limit(1000).to_list(1000)
        logger.info(f"Matching against {len(users)} registered users")
        
        for image_doc in unprocessed:
            image_path = image_doc['original_path']
            
            if not os.path.exists(image_path):
                logger.error(f"Image not found: {image_path}")
                continue
            
            # Extract face encodings from the image
            face_encodings = process_image_for_faces(image_path)
            
            if not face_encodings:
                logger.info(f"No faces found in {image_doc['filename']}")
                await db.images.update_one(
                    {"id": image_doc['id']},
                    {"$set": {"processed": True}}
                )
                continue
            
            matched_users = []
            
            # Compare with each registered user
            for user in users:
                if compare_faces(user['face_encoding'], face_encodings):
                    matched_users.append(user['id'])
                    
                    # Copy image to user's gallery
                    user_gallery_dir = USERS_DIR / user['gallery_id']
                    user_gallery_dir.mkdir(exist_ok=True)
                    
                    dest_path = user_gallery_dir / image_doc['filename']
                    shutil.copy2(image_path, dest_path)
                    
                    logger.info(f"Matched {image_doc['filename']} to user {user['name']}")
            
            # Update image metadata
            await db.images.update_one(
                {"id": image_doc['id']},
                {"$set": {
                    "processed": True,
                    "user_matches": matched_users
                }}
            )
        
        logger.info("Image processing complete")
    except Exception as e:
        logger.error(f"Error in background processing: {e}")

# Routes
@api_router.get("/")
async def root():
    return {"message": "Event Photo Face Recognition API"}

@api_router.post("/register")
async def register_user(registration: UserRegistration):
    """Register a new user with face encoding"""
    try:
        # Check if email already exists
        existing = await db.users.find_one({"email": registration.email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Extract face encoding
        face_encoding = encode_face_from_base64(registration.face_image_data)
        
        if not face_encoding:
            raise HTTPException(status_code=400, detail="No face detected in image. Please try again with a clear face photo.")
        
        # Create user
        user_data = {
            "id": str(uuid.uuid4()),
            "name": registration.name,
            "email": registration.email,
            "phone": registration.phone,
            "gallery_id": str(uuid.uuid4())[:8],
            "face_encoding": face_encoding,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Create user gallery directory
        user_gallery_dir = USERS_DIR / user_data['gallery_id']
        user_gallery_dir.mkdir(exist_ok=True)
        
        await db.users.insert_one(user_data)
        
        return {
            "success": True,
            "gallery_id": user_data['gallery_id'],
            "name": user_data['name']
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/gallery/{gallery_id}")
async def get_gallery(gallery_id: str):
    """Get all images for a user's gallery"""
    try:
        user = await db.users.find_one({"gallery_id": gallery_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="Gallery not found")
        
        gallery_dir = USERS_DIR / gallery_id
        
        if not gallery_dir.exists():
            return {
                "gallery_id": gallery_id,
                "user_name": user['name'],
                "images": []
            }
        
        images = []
        for img_file in gallery_dir.glob('*'):
            if img_file.is_file():
                images.append({
                    "filename": img_file.name,
                    "url": f"/api/image/{gallery_id}/{img_file.name}"
                })
        
        return {
            "gallery_id": gallery_id,
            "user_name": user['name'],
            "images": images
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Gallery fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/image/{gallery_id}/{filename}")
async def get_image(gallery_id: str, filename: str):
    """Serve an image from a user's gallery"""
    # Special case for admin to view original images
    if gallery_id == "admin":
        image_path = ORIGINAL_DIR / filename
    else:
        image_path = USERS_DIR / gallery_id / filename
    
    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(image_path)

@api_router.get("/qrcode/{gallery_id}")
async def generate_qr_code(gallery_id: str):
    """Generate QR code for gallery access"""
    try:
        # Generate gallery URL (frontend will be at same domain)
        gallery_url = f"{getenv_strip('FRONTEND_URL', 'https://localhost:3000')}/gallery/{gallery_id}"
        
        # Create QR code
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        qr.add_data(gallery_url)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        
        # Convert to bytes
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='PNG')
        img_byte_arr.seek(0)
        
        return StreamingResponse(img_byte_arr, media_type="image/png")
    
    except Exception as e:
        logger.error(f"QR code generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Admin Routes
@api_router.post("/admin/login")
async def admin_login(login: AdminLogin):
    """Admin login"""
    try:
        admin = await db.admin_users.find_one({"email": login.email})
        
        if not admin:
            # Create default admin if none exists
            if login.email == "admin@event.com" and login.password == "admin123":
                hashed = pwd_context.hash(login.password)
                await db.admin_users.insert_one({
                    "email": login.email,
                    "password_hash": hashed
                })
                return {"success": True, "token": "admin_token"}
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        if not pwd_context.verify(login.password, admin['password_hash']):
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        return {"success": True, "token": "admin_token"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/upload")
async def upload_images(files: List[UploadFile] = File(...)):
    """Upload multiple event photos"""
    try:
        uploaded_files = []
        
        for file in files:
            # Save to original directory
            file_path = ORIGINAL_DIR / file.filename
            
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            # Create metadata
            image_data = {
                "id": str(uuid.uuid4()),
                "filename": file.filename,
                "original_path": str(file_path),
                "upload_date": datetime.now(timezone.utc).isoformat(),
                "processed": False,
                "user_matches": []
            }
            
            await db.images.insert_one(image_data)
            uploaded_files.append(file.filename)
            
            logger.info(f"Uploaded {file.filename}")
        
        return {
            "success": True,
            "uploaded_count": len(uploaded_files),
            "files": uploaded_files
        }
    
    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/admin/process")
async def trigger_processing(background_tasks: BackgroundTasks):
    """Trigger face recognition processing"""
    background_tasks.add_task(process_images_background)
    return {
        "success": True,
        "message": "Processing started in background"
    }

@api_router.get("/admin/users", response_model=List[dict])
async def get_all_users():
    """Get all registered users (limited to 1000 for performance)"""
    try:
        users = await db.users.find({}, {"_id": 0, "face_encoding": 0}).limit(1000).to_list(1000)
        return users
    except Exception as e:
        logger.error(f"Fetch users error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        total_users = await db.users.count_documents({})
        total_images = await db.images.count_documents({})
        processed_images = await db.images.count_documents({"processed": True})
        pending_images = await db.images.count_documents({"processed": False})
        
        return DashboardStats(
            total_users=total_users,
            total_images=total_images,
            processed_images=processed_images,
            pending_images=pending_images
        )
    except Exception as e:
        logger.error(f"Stats fetch error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/admin/images")
async def get_all_images():
    """Get all uploaded images with metadata (limited to 500 for performance)"""
    try:
        images = await db.images.find({}, {"_id": 0}).limit(500).to_list(500)
        return images
    except Exception as e:
        logger.error(f"Fetch images error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/user/{user_id}")
async def delete_user(user_id: str):
    """Delete a registered user and their gallery"""
    try:
        # Find user first
        user = await db.users.find_one({"id": user_id})
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Delete user's gallery folder
        user_gallery_dir = USERS_DIR / user['gallery_id']
        if user_gallery_dir.exists():
            shutil.rmtree(user_gallery_dir)
            logger.info(f"Deleted gallery folder for user {user['name']}")
        
        # Remove user from database
        result = await db.users.delete_one({"id": user_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Update images to remove this user from matches
        await db.images.update_many(
            {"user_matches": user_id},
            {"$pull": {"user_matches": user_id}}
        )
        
        logger.info(f"Deleted user: {user['name']} ({user_id})")
        
        return {
            "success": True,
            "message": f"User {user['name']} deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete user error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/admin/image/{image_id}")
async def delete_image(image_id: str):
    """Delete an uploaded image and its matches"""
    try:
        # Find image first
        image = await db.images.find_one({"id": image_id})
        
        if not image:
            raise HTTPException(status_code=404, detail="Image not found")
        
        # 1. Delete original file
        orig_path = Path(image['original_path'])
        if orig_path.exists():
            orig_path.unlink()
            logger.info(f"Deleted original image at {orig_path}")
            
        # 2. Delete matches in user galleries
        for user_id in image.get('user_matches', []):
            user = await db.users.find_one({"id": user_id})
            if user:
                user_gallery_path = USERS_DIR / user['gallery_id'] / image['filename']
                if user_gallery_path.exists():
                    user_gallery_path.unlink()
                    logger.info(f"Deleted matched image in user {user['name']}'s gallery")
        
        # 3. Remove from database
        result = await db.images.delete_one({"id": image_id})
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Image not found")
            
        logger.info(f"Deleted image record: {image_id}")
        
        return {
            "success": True,
            "message": f"Image {image['filename']} deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Delete image error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=(getenv_strip('CORS_ORIGINS', '*') or '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount frontend static files
if FRONTEND_BUILD_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "static")), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        """Serve frontend for all non-API routes"""
        # If it's an API route, let FastAPI handle it
        if full_path.startswith("api/"):
            return {"error": "API endpoint not found"}
        
        # Serve index.html for frontend routes
        index_path = FRONTEND_BUILD_DIR / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        
        return {"error": "Frontend not built"}

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()