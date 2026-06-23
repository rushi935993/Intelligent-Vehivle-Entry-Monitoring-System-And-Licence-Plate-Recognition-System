from ultralytics import YOLO
import cv2

# Load model
model = YOLO("models/vehicle_detector.pt")

print("Model classes:", model.names)

# Read image (put any vehicle image in project root as test.jpg)
img = cv2.imread("test.jpg")

results = model(img, conf=0.3)

print("Detections:", len(results[0].boxes))

for box in results[0].boxes:
    print(box.xyxy)