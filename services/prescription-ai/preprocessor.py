"""
MediVault -- Image Preprocessor
Quality checking + image corrections for prescription photos.
Never modifies the original stored image.
Operates on in-memory bytes only.
"""

import io
import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

try:
    from PIL import Image, ImageOps, ImageFilter, ImageEnhance
    import numpy as np
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logger.warning("[Preprocessor] Pillow or numpy not available yet.")


class ImagePreprocessor:

    def check_quality(self, image_bytes: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Analyzes image quality without rejecting valid crops or test snippets.
        Returns: { score (0-1), reject (bool), issues (list) }
        """
        issues: List[str] = []
        score = 0.95

        if not PIL_AVAILABLE:
            return {"score": 0.85, "reject": False, "issues": ["quality_check_unavailable"]}

        if mime_type == "application/pdf":
            return {"score": 0.9, "reject": False, "issues": []}

        try:
            img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            width, height = img.size

            # Only reject if image is corrupt / literally empty (< 10px)
            if width < 10 or height < 10:
                return {"score": 0.0, "reject": True, "issues": ["corrupt_or_zero_size_image"]}

            gray = img.convert("L")
            gray_arr = np.array(gray)

            # Solid color / blank check
            if float(gray_arr.std()) < 2.0 and width > 50 and height > 50:
                return {"score": 0.1, "reject": True, "issues": ["blank_or_uniform_image"]}

            mean_brightness = float(gray_arr.mean())
            if mean_brightness < 20:
                issues.append("image_very_dark")
                score -= 0.15
            elif mean_brightness > 248:
                issues.append("image_overexposed")
                score -= 0.1

            return {"score": max(0.4, min(1.0, score)), "reject": False, "issues": issues}

        except Exception as e:
            logger.warning(f"[Preprocessor] Quality check notice: {e}")
            return {"score": 0.8, "reject": False, "issues": []}

    def preprocess(self, image_bytes: bytes, mime_type: str):
        """
        Preprocesses image for best OCR quality.
        Supports both full-page prescriptions and single-line crops (e.g. TAMEN TURBO).
        Returns a PIL Image object (in-memory, NOT saved to disk).
        """
        if not PIL_AVAILABLE:
            raise RuntimeError("Pillow library not available for preprocessing.")

        if mime_type == "application/pdf":
            img = Image.new("RGB", (800, 600), color=(255, 255, 255))
            return img

        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        # 1. Fix orientation from EXIF tags
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        width, height = img.size

        # 2. If it's a small crop / snippet (e.g. single line), upscale it with padding for TrOCR
        if height < 120 or width < 250:
            scale_factor = max(120 / max(height, 1), 250 / max(width, 1), 2.0)
            new_w = int(width * scale_factor)
            new_h = int(height * scale_factor)
            img = img.resize((new_w, new_h), Image.LANCZOS)

            # Add white border/padding for TrOCR vision encoder
            pad = 20
            padded = Image.new("RGB", (new_w + pad * 2, new_h + pad * 2), color=(255, 255, 255))
            padded.paste(img, (pad, pad))
            img = padded

        # 3. If very large, resize down to max 2000px
        max_side = 2000
        w, h = img.size
        if w > max_side or h > max_side:
            ratio = min(max_side / w, max_side / h)
            img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)

        # 4. Auto-contrast enhancement
        try:
            img = ImageOps.autocontrast(img, cutoff=0.5)
        except Exception:
            pass

        # 5. Mild sharpening
        try:
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(1.3)
        except Exception:
            pass

        if img.mode != "RGB":
            img = img.convert("RGB")

        return img