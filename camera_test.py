import cv2

for i in range(5):
    print(f"Testing camera index {i}")

    cap = cv2.VideoCapture(i)

    if cap.isOpened():
        print(f"SUCCESS: Camera found at index {i}")

        while True:
            ret, frame = cap.read()

            if not ret:
                break

            cv2.imshow("Camera Test", frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

        cap.release()
        cv2.destroyAllWindows()
        break

    cap.release()