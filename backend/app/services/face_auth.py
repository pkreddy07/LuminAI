import numpy as np
import base64
import cv2
import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv
from deepface import DeepFace

# Load env variables so Cloudinary can authenticate
load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Converts a base64 string from the frontend webcam into an OpenCV image."""
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
        
    img_data = base64.b64decode(base64_string)
    np_arr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    return img

def get_face_vector(img: np.ndarray) -> list[float]:
    """Locates the face and extracts a mathematical vector using DeepFace (Facenet)."""
    try:
        # DeepFace automatically detects the face and extracts the math
        # We use "Facenet" because it is lightweight, fast, and highly accurate
        faces = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=True)
    except ValueError:
        # DeepFace throws a ValueError if it can't find a face
        raise ValueError("No face detected in the image. Please adjust your lighting.")
        
    # DeepFace returns a list of results. If the list has more than 1 item, there are multiple people!
    if len(faces) > 1:
        raise ValueError("Multiple faces detected. Please ensure only you are in the frame.")
        
    # Extract the embedding (the mathematical vector) for the single face
    return faces[0]["embedding"]

def upload_snapshot_to_cloudinary(base64_string: str) -> str:
    """Uploads the raw webcam string directly to Cloudinary and returns the secure URL."""
    if not base64_string.startswith("data:image"):
        base64_string = f"data:image/jpeg;base64,{base64_string}"
        
    response = cloudinary.uploader.upload(
        base64_string, 
        folder="lumin_ai/snapshots" 
    )
    return response["secure_url"]