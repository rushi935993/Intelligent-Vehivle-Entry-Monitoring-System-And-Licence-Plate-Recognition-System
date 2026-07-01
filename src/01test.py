from ultralytics import YOLO
import cv2

model = YOLO("models/vehicle_detector.pt")

img = cv2.imread(r"C:\Users\LENOVO\Downloads\rushikesh_passport_size.jpg")   # any image WITHOUT a car

results = model(img, conf=0.5)

print(results[0].boxes)