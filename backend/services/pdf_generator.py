import os
import uuid
import shutil
import re
import difflib
from typing import Any, Optional, Dict, List

import fitz  # PyMuPDF

# ReportLab for preview overlay approach
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_LEFT, TA_CENTER

DATA_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../data/resumes/generated"))
os.makedirs(DATA_DIR, exist_ok=True)

COLOR_PRIMARY = HexColor("#1a1a2e")
COLOR_ACCENT  = HexColor("#4f46e5")
COLOR_TEXT    = HexColor("#1e293b")
COLOR_SUBTEXT = HexColor("#475569")
COLOR_RULE    = HexColor("#c7d2fe")

YELLOW_ANNOT  = (1.0, 0.95, 0.40)


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_span_font(span: dict) -> str:
    font = span.get("font", "Helvetica").lower()
    if "bold" in font:
        return "hebo"
    if "italic" in font or "oblique" in font:
        return "heit"
    return "helv"


def _decode_color(color_int: int):
    """Convert PDF integer color to (r,g,b) floats in 0-1 range."""
    r = ((color_int >> 16) & 255) / 255.0
    g = ((color_int >> 8)  & 255) / 255.0
    b = ( color_int        & 255) / 255.0
    return r, g, b


def _is_near_white(color):
    """Return True if the color is too close to white to be visible on white bg."""
    r, g, b = color
    return r > 0.88 and g > 0.88 and b > 0.88


def _find_best_match(old_t: str, page_text: str) -> Optional[str]:
    """
    Find the best matching substring in page_text for old_t.
    Returns the actual substring found, or None.
    """
    # Try exact
    if old_t in page_text:
        return old_t

    # Try whitespace-normalized
    norm_old = re.sub(r'\s+', ' ', old_t.strip())
    norm_page = re.sub(r'\s+', ' ', page_text)
    if norm_old in norm_page:
        return norm_old

    return None


# ── Preview: yellow highlights on original PDF ─────────────────────────────

def _make_preview_pdf(original_pdf_path: str, replacements: list, output_path: str):
    """Add transparent yellow highlight annotations over AI-changed text spans."""
    doc = fitz.open(original_pdf_path)
    for page in doc:
        for rep in replacements:
            old_t = rep.get("original_text", "").strip()
            if not old_t:
                continue
            instances = page.search_for(old_t)
            # Try first 60 chars if full text not found
            if not instances and len(old_t) > 60:
                instances = page.search_for(old_t[:60])
            for inst in instances:
                annot = page.add_highlight_annot(inst)
                annot.set_colors(stroke=YELLOW_ANNOT)
                annot.set_opacity(0.55)
                annot.update()
    doc.save(output_path)
    doc.close()


# ── Download: apply text replacements on original PDF via PyMuPDF ──────────

def _make_download_pdf(original_pdf_path: str, replacements: list, output_path: str):
    """
    Generate download PDF by applying AI text replacements directly into
    the original PDF, preserving all layout/fonts/colors.
    """
    doc = fitz.open(original_pdf_path)

    for page in doc:
        text_dict = page.get_text("dict")
        page_text = page.get_text("text")

        for rep in replacements:
            old_t = rep.get("original_text", "").strip()
            new_t = rep.get("updated_text", "").strip()
            if not old_t or not new_t or old_t == new_t:
                continue

            # Search (try full string, then first 80 chars)
            instances = page.search_for(old_t)
            if not instances and len(old_t) > 80:
                instances = page.search_for(old_t[:80])
                new_t_short = new_t[:80]  # truncate new_t proportionally
            else:
                new_t_short = new_t

            for inst in instances:
                # Detect font properties from overlapping spans
                font_size  = 10.0
                font_name  = "helv"
                font_color = (0.0, 0.0, 0.0)

                for block in text_dict.get("blocks", []):
                    if block.get("type") != 0:
                        continue
                    for line in block.get("lines", []):
                        for span in line.get("spans", []):
                            if fitz.Rect(span["bbox"]).intersects(inst):
                                font_size = span.get("size", 10.0)
                                font_name = _get_span_font(span)
                                color = _decode_color(span.get("color", 0))
                                # If original text is white-on-dark, keep white; else use black
                                font_color = color if not _is_near_white(color) else (0.0, 0.0, 0.0)
                                break

                # Draw white rect to cover original text
                page.draw_rect(inst, color=None, fill=(1, 1, 1), overlay=True)

                # Insert new text at same position
                try:
                    rc = page.insert_textbox(
                        inst,
                        new_t_short + " ",
                        fontsize=font_size,
                        fontname=font_name,
                        color=font_color,
                        align=0,
                        overlay=True,
                    )
                    # rc < 0 means text didn't fit — try smaller font
                    if rc < 0:
                        page.insert_textbox(
                            inst,
                            new_t_short + " ",
                            fontsize=max(7.0, font_size - 1.5),
                            fontname=font_name,
                            color=font_color,
                            align=0,
                            overlay=True,
                        )
                except Exception:
                    # Final fallback: just insert at top-left of rect
                    page.insert_text(
                        (inst.x0, inst.y1 - 2),
                        new_t_short,
                        fontsize=font_size,
                        fontname=font_name,
                        color=font_color,
                        overlay=True,
                    )

    doc.save(output_path)
    doc.close()


# ── Public API ─────────────────────────────────────────────────────────────────

def generate_preserved_pdf(
    tailored_markdown: str,
    original_pdf_path: str,
    layout_metadata: Optional[Any] = None,
) -> str:
    """
    Generates two PDFs:
    - PREVIEW: original PDF + transparent yellow highlights on AI-changed sections.
    - DOWNLOAD: original PDF + AI text replacements applied in-place (preserves template).

    Returns the preview PDF path.
    """
    base_id = uuid.uuid4().hex[:8]
    preview_path  = os.path.join(DATA_DIR, f"preview_{base_id}.pdf")
    download_path = os.path.join(DATA_DIR, f"download_{base_id}.pdf")

    replacements = []
    if layout_metadata and isinstance(layout_metadata, list):
        replacements = [
            r for r in layout_metadata
            if r.get("original_text", "").strip()
            and r.get("updated_text", "").strip()
            and r["original_text"].strip() != r["updated_text"].strip()
        ]

    has_original = bool(original_pdf_path and os.path.exists(original_pdf_path))

    if has_original:
        # Preview: highlights on original
        _make_preview_pdf(original_pdf_path, replacements, preview_path)

        # Download: apply replacements on original
        if replacements:
            _make_download_pdf(original_pdf_path, replacements, download_path)
        else:
            shutil.copy(original_pdf_path, download_path)
    else:
        # Fallback: generate from markdown
        _make_fallback_pdf(tailored_markdown, preview_path)
        shutil.copy(preview_path, download_path)

    with open(preview_path + ".download_path", "w") as f:
        f.write(download_path)

    return preview_path


def _make_fallback_pdf(tailored_markdown: str, output_path: str):
    """Fallback: generate a basic PDF from markdown when no original PDF is available."""
    def _build_styles():
        return {
            "name":   ParagraphStyle("name",   fontName="Helvetica-Bold", fontSize=20, textColor=COLOR_PRIMARY, spaceAfter=2, alignment=TA_CENTER),
            "h1":     ParagraphStyle("h1",     fontName="Helvetica-Bold", fontSize=12, textColor=COLOR_ACCENT, spaceBefore=10, spaceAfter=3),
            "h2":     ParagraphStyle("h2",     fontName="Helvetica-Bold", fontSize=10.5, textColor=COLOR_PRIMARY, spaceBefore=6, spaceAfter=2),
            "h3":     ParagraphStyle("h3",     fontName="Helvetica-BoldOblique", fontSize=9.5, textColor=COLOR_SUBTEXT, spaceBefore=3, spaceAfter=1),
            "body":   ParagraphStyle("body",   fontName="Helvetica", fontSize=9.5, textColor=COLOR_TEXT, spaceAfter=3, leading=14),
            "bullet": ParagraphStyle("bullet", fontName="Helvetica", fontSize=9.5, textColor=COLOR_TEXT, spaceAfter=2, leftIndent=12, leading=13),
        }

    def _clean(t): return t.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
    def _inline(t):
        t = re.sub(r"\*\*\*(.*?)\*\*\*", r"<b><i>\1</i></b>", t)
        t = re.sub(r"\*\*(.*?)\*\*",     r"<b>\1</b>", t)
        t = re.sub(r"\*(.*?)\*",          r"<i>\1</i>", t)
        t = re.sub(r"`(.*?)`",            r"<font name='Courier' size='8'>\1</font>", t)
        return t

    styles = _build_styles()
    flowables = []
    for raw in tailored_markdown.split("\n"):
        s = raw.strip()
        if not s: flowables.append(Spacer(1, 3)); continue
        if s.startswith("# "):
            t = _clean(s[2:])
            flowables.append(Paragraph(_inline(t), styles["name"] if not flowables else styles["h1"]))
            if flowables: flowables.append(HRFlowable(width="100%", thickness=0.75, color=COLOR_RULE, spaceAfter=4))
        elif s.startswith("## "): flowables.append(Paragraph(_inline(_clean(s[3:])), styles["h2"]))
        elif s.startswith("### "): flowables.append(Paragraph(_inline(_clean(s[4:])), styles["h3"]))
        elif re.match(r"^[-*_]{3,}$", s): flowables.append(HRFlowable(width="100%", thickness=0.5, color=COLOR_RULE, spaceAfter=4))
        elif s.startswith("- ") or s.startswith("* "): flowables.append(Paragraph(f"• &nbsp;{_inline(_clean(s[2:]))}", styles["bullet"]))
        else: flowables.append(Paragraph(_inline(_clean(s)), styles["body"]))

    m = 18 * mm
    doc = SimpleDocTemplate(output_path, pagesize=A4, leftMargin=m, rightMargin=m, topMargin=14*mm, bottomMargin=14*mm)
    doc.build(flowables)


def get_download_pdf_path(preview_pdf_path: str) -> str:
    sidecar = preview_pdf_path + ".download_path"
    if os.path.exists(sidecar):
        with open(sidecar) as f:
            return f.read().strip()
    return preview_pdf_path
