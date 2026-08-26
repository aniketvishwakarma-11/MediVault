import time, os, torch
torch.set_num_threads(2)
torch.set_num_interop_threads(1)

from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image

cache_dir = "D:\\hf_cache" if os.path.exists("D:\\") else None
processor = TrOCRProcessor.from_pretrained("chinmays18/medical-prescription-ocr", cache_dir=cache_dir)
model = VisionEncoderDecoderModel.from_pretrained("chinmays18/medical-prescription-ocr", cache_dir=cache_dir)
model.eval()

img = Image.new("RGB", (384, 384), color=(255, 255, 255))
pixel_values = processor(images=img, return_tensors="pt").pixel_values

t0 = time.time()
with torch.no_grad():
    generated_ids = model.generate(
        pixel_values,
        max_new_tokens=20,
        num_beams=1,
        do_sample=False,
        early_stopping=True,
    )
text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
dur = time.time() - t0
print(f"BENCHMARK_RESULT: completed in {dur:.2f}s, output='{text}'")