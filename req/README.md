# Face Matcher

This module compares two face images using OpenCV face detection and a normalized similarity score. It is a pragmatic placeholder until a production-grade model is wired in.

## Setup

Install dependencies:

```bash
pip install -r req/requirements.txt
```

## Sample Test

Place two sample images here:

- `req/sample_images/candidate.jpg`
- `req/sample_images/db.jpg`

Then run:

```bash
python -m req.face_matcher --sample
```

## Custom Images

```bash
python -m req.face_matcher <img1> <img2> [threshold]
```

- `threshold` defaults to `0.6`. Higher values are stricter.
