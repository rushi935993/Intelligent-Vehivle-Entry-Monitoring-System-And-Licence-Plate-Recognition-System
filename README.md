# Backend
uvicorn src.main:app --reload

# Frontend
cd frontend
npm install
npm run dev

Project Overview
AI-powered Vehicle Entry Monitoring System
Real-time vehicle detection using YOLOv8
Number plate recognition using EasyOCR
Parking slot allocation
Entry/Exit management
Live React dashboard
Barrier animation
Tech Stack
Frontend: React, Bootstrap
Backend: FastAPI
Database: MySQL
AI: YOLOv8
OCR: EasyOCR
Language: Python, JavaScript
Architecture Diagram
Camera
  ↓
Vehicle Detection (YOLOv8)
  ↓
Plate Detection (YOLOv8)
  ↓
OCR (EasyOCR)
  ↓
Plate Validation
  ↓
Parking Logic
  ↓
MySQL Database
  ↓
FastAPI APIs
  ↓
React Dashboard
  ↓
Barrier Animation
Installation
pip install -r requirements.txt

uvicorn src.main:app --reload

cd frontend
npm install
npm run dev
Step 7: Take Project Screenshots

Create a folder:

screenshots/

Take screenshots of:

Dashboard
Parking slots
Occupancy statistics
Active vehicles
Vehicle Detection
Bounding box around vehicle
Number Plate Detection
Plate highlighted
Entry Event

Example:

MH15AB1234
Slot A1
ENTRY SUCCESS
Barrier Open Animation

This is one of your unique features