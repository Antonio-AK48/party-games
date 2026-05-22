"""Crop square avatar regions out of the Gemini source images.

Each entry in CROPS is (source, out_name, left, top, right, bottom). Boxes are in
source-pixel coordinates and are cropped as-is (keep them square for round
avatars). Run with --preview to write 256px previews to a temp dir for review;
run without it to write final 512px PNGs into src/assets/avatars/.
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "src" / "assets" / "avatars"
PREVIEW_DIR = Path(r"C:/Users/Lenovo/AppData/Local/Temp/pg-crop")

DOCTOR = "Gemini_Generated_Image_29oke529oke529ok.png"
GROUP = "Gemini_Generated_Image_fwodikfwodikfwod.png"
BOTTLE = "Gemini_Generated_Image_jsthmmjsthmmjsth.png"
GOOFY = "Gemini_Generated_Image_2iy0882iy0882iy0.png"
MESSY = "Gemini_Generated_Image_btjb3kbtjb3kbtjb.png"
VAMPIRE = "Gemini_Generated_Image_p9nj5ep9nj5ep9nj.png"
GREEN = "Gemini_Generated_Image_pzzh2vpzzh2vpzzh.png"

# (source, out_name, left, top, right, bottom)
# The group photo is one avatar: a centered, full-height square crop keeps all
# three faces in frame without letterbox bars.
CROPS = [
    (DOCTOR, "doctor", 128, 80, 768, 720),
    (BOTTLE, "bottle-guy", 110, 70, 730, 690),
    (GROUP, "group", 304, 0, 1072, 768),
    (GOOFY, "goofy", 115, 20, 635, 540),
    (MESSY, "messy", 120, 240, 680, 800),
    (VAMPIRE, "vampire", 330, 0, 730, 400),
    (GREEN, "green", 110, 90, 630, 610),
]


def main():
    preview = "--preview" in sys.argv
    out_dir = PREVIEW_DIR if preview else OUT_DIR
    size = 256 if preview else 512
    out_dir.mkdir(parents=True, exist_ok=True)
    for src, name, l, t, r, b in CROPS:
        img = Image.open(ROOT / src).convert("RGB")
        box = img.crop((l, t, r, b))
        box = box.resize((size, size), Image.LANCZOS)
        dest = out_dir / f"{name}.png"
        box.save(dest)
        print(f"{name}: {(l,t,r,b)} -> {box.size[0]}x{box.size[1]}  {dest}")


if __name__ == "__main__":
    main()
