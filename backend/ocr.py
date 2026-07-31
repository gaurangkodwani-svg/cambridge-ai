import os
import sys
import io
import base64
import requests
from pathlib import Path
import PyPDF2
from dotenv import load_dotenv

load_dotenv()

# PIL is used for image handling / downscaling
try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# ----------------------------------------------------------------------
# Local OCR (Tesseract) - works where tesseract + poppler are installed
# ----------------------------------------------------------------------
try:
    import pytesseract
    from pdf2image import convert_from_path
    OCR_AVAILABLE = True

    # Windows: Set Tesseract path if needed
    if sys.platform == "win32":
        tesseract_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
        if os.path.exists(tesseract_path):
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        else:
            # Try to find it in PATH
            import shutil
            if not shutil.which("tesseract"):
                OCR_AVAILABLE = False
                print("⚠️  Tesseract not found. Install from https://github.com/UB-Mannheim/tesseract/wiki")

except ImportError:
    OCR_AVAILABLE = False
    print("⚠️  OCR libraries not installed. Run: pip install pytesseract pdf2image Pillow")

# ----------------------------------------------------------------------
# PyMuPDF - renders PDF pages to images without poppler (works on Vercel)
# ----------------------------------------------------------------------
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

# ----------------------------------------------------------------------
# Cloud OCR via Groq vision - uses the existing GROQ_API_KEY, no extra
# service needed, and works on serverless (Vercel) without system binaries
# ----------------------------------------------------------------------
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
CLOUD_OCR_AVAILABLE = bool(GROQ_API_KEY)
GROQ_OCR_MODEL = "llama-3.2-11b-vision-preview"


def extract_text_standard(pdf_path: str) -> str:
    """
    Standard text extraction using PyPDF2.
    Works on normal (non-scanned) PDFs.
    """
    text = ""
    try:
        reader = PyPDF2.PdfReader(pdf_path)
        max_pages = min(len(reader.pages), 15)
        for i in range(max_pages):
            page_text = reader.pages[i].extract_text()
            if page_text:
                text += page_text + "\n\n"
    except Exception as e:
        print(f"Standard extraction error: {e}")
    return text.strip()


def extract_text_ocr(pdf_path: str) -> str:
    """
    OCR-based text extraction.
    Works on scanned PDFs and image-based PDFs.
    """
    if not OCR_AVAILABLE:
        return ""

    text = ""
    temp_dir = None

    try:
        # Create temp directory for images
        import tempfile
        temp_dir = tempfile.mkdtemp()

        print(f"🔍 Running OCR on: {Path(pdf_path).name}")

        # Convert PDF pages to images
        # Limit to first 10 pages for performance
        images = convert_from_path(
            pdf_path,
            dpi=300,           # High DPI = better OCR accuracy
            output_folder=temp_dir,
            first_page=1,
            last_page=10,
            fmt="PNG"
        )

        print(f"📄 Processing {len(images)} pages with OCR...")

        # Run OCR on each image
        for i, image in enumerate(images):
            print(f"  Page {i + 1}/{len(images)}...")

            # Preprocess image for better OCR accuracy
            image = preprocess_image(image)

            # Extract text using Tesseract
            page_text = pytesseract.image_to_string(
                image,
                lang="eng",
                config="--psm 6"  # Assume uniform block of text
            )

            if page_text.strip():
                text += f"--- Page {i + 1} ---\n"
                text += page_text + "\n\n"

        print(f"✅ OCR complete. Extracted {len(text)} characters.")

    except Exception as e:
        print(f"OCR error: {e}")
        text = ""

    finally:
        # Clean up temp files
        if temp_dir:
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)

    return text.strip()


def preprocess_image(image):
    """
    Preprocess image to improve OCR accuracy.
    - Convert to grayscale
    - Increase contrast
    - Sharpen
    """
    try:
        from PIL import ImageFilter, ImageEnhance

        # Convert to grayscale
        image = image.convert("L")

        # Increase contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)

        # Sharpen
        image = image.filter(ImageFilter.SHARPEN)

        return image

    except Exception:
        return image


def extract_text_from_image(image_path: str) -> str:
    """
    Extract text directly from an image file.
    """
    if not OCR_AVAILABLE:
        return "OCR not available. Please install pytesseract."

    try:
        image = Image.open(image_path)
        image = preprocess_image(image)
        text = pytesseract.image_to_string(image, lang="eng")
        return text.strip()
    except Exception as e:
        return f"Image OCR error: {str(e)}"


def _groq_vision_ocr(image_bytes: bytes, mime: str = "image/png") -> str:
    """
    Extract text from a single image using Groq's vision model.
    Returns extracted text, or "" on any failure.
    """
    if not CLOUD_OCR_AVAILABLE:
        return ""

    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    b64 = base64.b64encode(image_bytes).decode("utf-8")

    payload = {
        "model": GROQ_OCR_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "Extract ALL text from this image verbatim, preserving line breaks. "
                                "Output only the extracted text with no commentary."
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime};base64,{b64}"}
                    }
                ]
            }
        ],
        "temperature": 0.0
    }

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        data = response.json()

        if response.status_code != 200:
            print(f"⚠️  Groq vision OCR error: {data.get('error', {}).get('message', 'Unknown error')}")
            return ""

        return (data["choices"][0]["message"]["content"] or "").strip()
    except Exception as e:
        print(f"⚠️  Groq vision OCR connection error: {e}")
        return ""


def extract_text_from_image_groq(image_path: str) -> str:
    """
    OCR an image file via Groq vision. Downscales large images first
    to stay within API payload limits.
    """
    if not CLOUD_OCR_AVAILABLE or not PIL_AVAILABLE:
        return ""

    try:
        with Image.open(image_path) as im:
            # Downscale very large images
            im.thumbnail((2000, 2000))
            buf = io.BytesIO()
            im.convert("RGB").save(buf, format="JPEG", quality=90)
            return _groq_vision_ocr(buf.getvalue(), "image/jpeg")
    except Exception as e:
        print(f"⚠️  Groq image OCR error: {e}")
        return ""


def extract_text_ocr_groq(pdf_path: str) -> str:
    """
    Render PDF pages to images with PyMuPDF (works without poppler,
    so it runs on Vercel) and OCR each page via Groq vision.
    """
    if not (PYMUPDF_AVAILABLE and CLOUD_OCR_AVAILABLE):
        return ""

    text = ""
    doc = None
    try:
        doc = fitz.open(pdf_path)
        max_pages = min(doc.page_count, 10)  # Limit for performance/cost
        for i in range(max_pages):
            page = doc.load_page(i)
            # 200 DPI is a good balance of quality and payload size.
            # JPEG keeps the base64 payload smaller than PNG.
            pix = page.get_pixmap(dpi=200)
            img_bytes = pix.tobytes("jpeg")

            page_text = _groq_vision_ocr(img_bytes, "image/jpeg")
            if page_text:
                text += f"--- Page {i + 1} ---\n"
                text += page_text + "\n\n"

        if text.strip():
            print(f"✅ Groq cloud OCR complete. Extracted {len(text)} characters.")
    except Exception as e:
        print(f"⚠️  Groq PDF OCR error: {e}")
        text = ""
    finally:
        if doc:
            doc.close()

    return text.strip()


def extract_text(file_path: str) -> dict:
    """
    Main extraction function.
    Automatically decides whether to use standard or OCR extraction.
    Returns a dict with text, method used, and character count.
    """
    result = {
        "text": "",
        "method": "none",
        "char_count": 0,
        "success": False,
        "error": None,
        "ocr_available": OCR_AVAILABLE or CLOUD_OCR_AVAILABLE
    }

    file_path = str(file_path)
    extension = Path(file_path).suffix.lower()

    # Handle image files directly
    if extension in [".png", ".jpg", ".jpeg", ".bmp", ".tiff"]:
        # Cloud OCR first (works on Vercel), then local Tesseract fallback
        if CLOUD_OCR_AVAILABLE:
            result["text"] = extract_text_from_image_groq(file_path)
            result["method"] = "ocr_cloud_image"

        # Local Tesseract fallback (local dev only) - mirrors PDF path
        if not result["text"] and OCR_AVAILABLE:
            result["text"] = extract_text_from_image(file_path)
            # Local helper returns error strings instead of text on failure
            if result["text"].startswith(("Image OCR error", "OCR not available")):
                result["text"] = ""
            else:
                result["method"] = "ocr_image"

        if not result["text"]:
            result["error"] = "OCR could not extract text from this image."
        result["success"] = bool(result["text"])
        result["char_count"] = len(result["text"])
        return result

    # For PDFs: try standard first
    if extension == ".pdf":
        print("📖 Trying standard PDF extraction...")
        standard_text = extract_text_standard(file_path)

        # If standard extraction got enough text (more than 100 chars), use it
        if len(standard_text) > 100:
            print(f"✅ Standard extraction successful ({len(standard_text)} chars)")
            result["text"] = standard_text
            result["method"] = "standard"
            result["success"] = True
            result["char_count"] = len(standard_text)
            return result

        # Standard extraction failed or got very little text
        # Try OCR
        print("⚠️  Standard extraction failed or got too little text.")

        if CLOUD_OCR_AVAILABLE:
            print("🔍 Switching to cloud OCR mode (Groq vision)...")
            ocr_text = extract_text_ocr_groq(file_path)

            if len(ocr_text) > 50:
                result["text"] = ocr_text
                result["method"] = "ocr_cloud_pdf"
                result["success"] = True
                result["char_count"] = len(ocr_text)
                return result

        # Local Tesseract fallback (local dev only)
        if OCR_AVAILABLE:
            print("🔍 Switching to local OCR mode...")
            ocr_text = extract_text_ocr(file_path)

            if len(ocr_text) > 50:
                result["text"] = ocr_text
                result["method"] = "ocr_pdf"
                result["success"] = True
                result["char_count"] = len(ocr_text)
                return result
            else:
                result["error"] = "Could not extract text even with OCR. The PDF may be corrupted or image quality too low."
        else:
            result["error"] = "This appears to be a scanned PDF but OCR is not available on this host. Install Tesseract locally or set GROQ_API_KEY for cloud OCR."

    result["success"] = False
    return result


def get_ocr_status() -> dict:
    """
    Return the status of OCR capabilities.
    """
    status = {
        "ocr_available": OCR_AVAILABLE or CLOUD_OCR_AVAILABLE,
        "cloud_ocr_available": CLOUD_OCR_AVAILABLE,
        "tesseract_version": None,
        "supported_formats": ["PDF (text-based)", "TXT"]
    }

    if OCR_AVAILABLE:
        try:
            version = pytesseract.get_tesseract_version()
            status["tesseract_version"] = str(version)
        except Exception:
            pass

    if CLOUD_OCR_AVAILABLE or OCR_AVAILABLE:
        status["supported_formats"] = [
            "PDF (text-based)",
            "PDF (scanned/image-based)",
            "PNG", "JPG", "JPEG",
            "BMP", "TIFF", "TXT"
        ]

    return status