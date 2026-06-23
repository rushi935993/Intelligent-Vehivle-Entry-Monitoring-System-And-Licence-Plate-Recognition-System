import os
import xml.etree.ElementTree as ET
from PIL import Image
from sklearn.model_selection import train_test_split

XML_DIR = "datasets/number_plate/Annotations"
IMG_DIR = "datasets/number_plate/Images"
OUT_IMG = "datasets/number_plate/images"
OUT_LBL = "datasets/number_plate/labels"

os.makedirs(f"{OUT_IMG}/train", exist_ok=True)
os.makedirs(f"{OUT_IMG}/val", exist_ok=True)
os.makedirs(f"{OUT_LBL}/train", exist_ok=True)
os.makedirs(f"{OUT_LBL}/val", exist_ok=True)

xml_files = os.listdir(XML_DIR)
train_xml, val_xml = train_test_split(xml_files, test_size=0.2, random_state=42)

def convert(xml_file, split):
    tree = ET.parse(os.path.join(XML_DIR, xml_file))
    root = tree.getroot()

    img_name = root.find("filename").text
    img_path = os.path.join(IMG_DIR, img_name)

    img = Image.open(img_path)
    w, h = img.size

    label_lines = []

    for obj in root.findall("object"):
        cls_id = 0  # number_plate

        bbox = obj.find("bndbox")
        xmin = float(bbox.find("xmin").text)
        ymin = float(bbox.find("ymin").text)
        xmax = float(bbox.find("xmax").text)
        ymax = float(bbox.find("ymax").text)

        x_center = ((xmin + xmax) / 2) / w
        y_center = ((ymin + ymax) / 2) / h
        bw = (xmax - xmin) / w
        bh = (ymax - ymin) / h

        label_lines.append(f"{cls_id} {x_center} {y_center} {bw} {bh}")

    img.save(f"{OUT_IMG}/{split}/{img_name}")

    with open(f"{OUT_LBL}/{split}/{img_name.replace('.jpg','.txt')}", "w") as f:
        f.write("\n".join(label_lines))


for xml in train_xml:
    convert(xml, "train")

for xml in val_xml:
    convert(xml, "val")

print("✅ XML → YOLO conversion completed")
