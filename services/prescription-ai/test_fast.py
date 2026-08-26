import time
from model_loader import PrescriptionOCRModel
from PIL import Image

t0 = time.time()
model = PrescriptionOCRModel()
print(f"Model init took: {time.time()-t0:.2f}s")

img = Image.new("RGB", (384, 120), color=(255, 255, 255))
t1 = time.time()
res = model.run_inference(img)
print(f"Inference result: {res} in {time.time()-t1:.2f}s")