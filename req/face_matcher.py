"""Face matching utility using OpenCV.

This uses face detection + normalized similarity on cropped face regions.
It is a pragmatic placeholder until a production-grade model is wired in.

CLI usage:
    python -m req.face_matcher --sample
    python -m req.face_matcher <img1> <img2> [threshold]
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Dict

try:
    import cv2
    import numpy as np
except Exception as e:
    raise ImportError(
        "opencv-python and numpy are required. Install with `pip install -r req/requirements.txt`. "
        f"Underlying error: {e}"
    )

SAMPLE_DIR = Path(__file__).resolve().parent / "sample_images"
SAMPLE_FRONTEND = SAMPLE_DIR / "candidate.jpg"
SAMPLE_DB = SAMPLE_DIR / "db.jpg"


def _read_image(image_path: str | Path):
    img = cv2.imread(str(image_path))
    if img is None:
        raise ValueError(f"Could not read image: {image_path}")
    return img


def _detect_face(gray):
    cascade_path = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
    detector = cv2.CascadeClassifier(str(cascade_path))
    faces = detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(80, 80))
    if len(faces) == 0:
        raise ValueError("No face detected in one or both images.")
    x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
    return gray[y : y + h, x : x + w]


def _prepare_face(face_gray):
    face = cv2.resize(face_gray, (160, 160), interpolation=cv2.INTER_AREA)
    face = cv2.equalizeHist(face)
    face = face.astype("float32") / 255.0
    return face


def _cosine_similarity(vec_a, vec_b) -> float:
    denom = (np.linalg.norm(vec_a) * np.linalg.norm(vec_b)) + 1e-8
    return float(np.dot(vec_a, vec_b) / denom)


def compare_faces(img1_path: str | Path, img2_path: str | Path, threshold: float = 0.6) -> Dict:
    """Compare two images and return match info.

    Returns a dict with keys: `match` (bool), `similarity` (float), `threshold` (float).
    Similarity is cosine similarity on normalized face crops.
    """
    img1 = _read_image(img1_path)
    img2 = _read_image(img2_path)

    gray1 = cv2.cvtColor(img1, cv2.COLOR_BGR2GRAY)
    gray2 = cv2.cvtColor(img2, cv2.COLOR_BGR2GRAY)

    face1 = _prepare_face(_detect_face(gray1))
    face2 = _prepare_face(_detect_face(gray2))

    sim = _cosine_similarity(face1.flatten(), face2.flatten())
    match = sim >= threshold
    return {"match": match, "similarity": sim, "threshold": threshold}


def _resolve_sample_paths():
    if not SAMPLE_FRONTEND.exists() or not SAMPLE_DB.exists():
        raise ValueError(
            "Sample images not found. Place candidate.jpg and db.jpg under req/sample_images/."
        )
    return SAMPLE_FRONTEND, SAMPLE_DB


def _main(argv):
    threshold = 0.6
    if len(argv) == 1 or argv[1] in {"--sample", "-s"}:
        img1, img2 = _resolve_sample_paths()
    else:
        if len(argv) < 3:
            print("Usage: python -m req.face_matcher <img1> <img2> [threshold]")
            print("       python -m req.face_matcher --sample")
            return 2
        img1 = argv[1]
        img2 = argv[2]
        if len(argv) > 3:
            threshold = float(argv[3])

    try:
        res = compare_faces(img1, img2, threshold)
    except Exception as exc:
        print(f"Error: {exc}")
        return 3
    print(f"Similarity: {res['similarity']:.4f} (threshold={res['threshold']})")
    print("MATCH" if res["match"] else "NO MATCH")
    return 0


if __name__ == "__main__":
    raise SystemExit(_main(sys.argv))
