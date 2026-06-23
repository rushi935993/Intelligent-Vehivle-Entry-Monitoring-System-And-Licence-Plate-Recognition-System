import cv2

url = "http://192.168.1.42:4747/video"
cap = cv2.VideoCapture(url)

if not cap.isOpened():
    print("❌ Stream not opened")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Frame not received")
        break

    cv2.imshow("Test Stream", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
