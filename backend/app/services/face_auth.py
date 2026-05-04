import numpy as np
import base64
import cv2
import cloudinary
import cloudinary.uploader
import os
from dotenv import load_dotenv
from deepface import DeepFace

# Load env variables
load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)

def decode_base64_image(base64_string: str) -> np.ndarray:
    """Converts a frontend base64 string into an OpenCV image."""
    if "," in base64_string:
        base64_string = base64_string.split(",")[1]
    img_data = base64.b64decode(base64_string)
    np_arr = np.frombuffer(img_data, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

def get_face_vector(img: np.ndarray) -> list[float]:
    """Extracts the Facenet mathematical vector from an image."""
    try:
        faces = DeepFace.represent(img_path=img, model_name="Facenet", enforce_detection=True)
    except ValueError:
        raise ValueError("No face detected in the image. Please adjust your lighting.")
        
    if len(faces) > 1:
        raise ValueError("Multiple faces detected. Please ensure only you are in the frame.")
        
    return faces[0]["embedding"]

def upload_snapshot_to_cloudinary(base64_string: str) -> str:
    """Uploads the raw webcam string to Cloudinary securely from the backend."""
    if not base64_string.startswith("data:image"):
        base64_string = f"data:image/jpeg;base64,{base64_string}"
        
    response = cloudinary.uploader.upload(
        base64_string, 
        folder="lumin_ai/snapshots" 
    )
    return response["secure_url"]

def compare_face_vectors(reference_vector: list[float], live_vector: list[float], threshold: float = 10.0) -> bool:
    """Compares two Facenet vectors. Distance <= 10.0 is the same person."""
    v1 = np.array(reference_vector)
    v2 = np.array(live_vector)
    return bool(np.linalg.norm(v1 - v2) <= threshold)