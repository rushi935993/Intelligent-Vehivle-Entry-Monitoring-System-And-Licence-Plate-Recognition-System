import os
import xml.etree.ElementTree as ET
from PIL import Image

BASE_DIR = "datasets/number_plate"

XML_DIR = os.path.join(BASE_DIR, "Annotations")
IMG_TRAIN = os.path.join(BASE_DIR, "images/train")
IMG_VAL   = os.path.join(BASE_DIR, "images/val")

LBL_TRAIN = os.path.join(BASE_DIR, "labels/train")
LBL_VAL   = os.path.join(BASE_DIR, "labels/val")

os.makedirs(LBL_TRAIN, exist_ok=True)
os.makedirs(LBL_VAL, exist_ok=True)

def convert(xml_file, split):
    tree = ET.parse(os.path.join(XML_DIR, xml_file))
    root = tree.getroot()

    img_name = root.find("filename").text

    img_path = IMG_TRAIN if split == "train" else IMG_VAL
    img_file = os.path.join(img_path, img_name)

    if not os.path.exists(img_file):
        return

    img = Image.open(img_file)
    w, h = img.size

    yolo_lines = []

    for obj in root.findall("object"):
        bbox = obj.find("bndbox")
        xmin = float(bbox.find("xmin").text)
        ymin = float(bbox.find("ymin").text)
        xmax = float(bbox.find("xmax").text)
        ymax = float(bbox.find("ymax").text)

        xc = ((xmin + xmax) / 2) / w
        yc = ((ymin + ymax) / 2) / h
        bw = (xmax - xmin) / w
        bh = (ymax - ymin) / h

        yolo_lines.append(f"0 {xc} {yc} {bw} {bh}")

    label_path = LBL_TRAIN if split == "train" else LBL_VAL
    with open(os.path.join(label_path, img_name.replace(".jpg", ".txt")), "w") as f:
        f.write("\n".join(yolo_lines))

# convert train images
for xml in os.listdir(XML_DIR):
    convert(xml, "train")
    convert(xml, "val")

print("✅ XML annotations converted to YOLO labels")
