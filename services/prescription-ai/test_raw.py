import os, torch, time
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image

cache_dir = "D:\\hf_cache" if os.path.exists("D:\\") else None
processor = TrOCRProcessor.from_pretrained("chinmays18/medical-prescription-ocr", cache_dir=cache_dir)
model = VisionEncoderDecoderModel.from_pretrained("chinmays18/medical-prescription-ocr", cache_dir=cache_dir)
model.eval()

# Dummy test
img = Image.new("RGB", (384, 120), color=(255, 255, 255))
pixel_values = processor(images=img, return_tensors="pt").pixel_values

t0 = time.time()
with torch.no_grad():
    generated_ids = model.generate(pixel_values, max_new_tokens=30)
text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
print(f"RAW TrOCR Output: '{text}' in {time.time()-t0:.2f}s")