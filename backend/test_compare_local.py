import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from LuminAI.backend.req.face_matcher import compare_faces
    
    # Simulate what candidate.py does
    # find any file in uploads/snapshots
    import glob
    files = glob.glob('uploads/snapshots/*.jpg')
    if not files:
        print("No local snapshot files found!")
    else:
        full_local_path = files[0]
        past_url = "https://res.cloudinary.com/dxjj5lr7v/image/upload/v1778167563/lumin_ai/snapshots/nzyoeigso5mkwjsuun2d.jpg"
        
        print("Comparing:")
        print("Local:", full_local_path)
        print("Remote:", past_url)
        
        result = compare_faces(full_local_path, past_url)
        print("Result:", result)
        
except Exception as e:
    import traceback
    traceback.print_exc()
    print("ERROR:", e)
