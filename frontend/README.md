# 🚗 Intelligent Vehicle Entry Monitoring & License Plate Recognition System

An AI-powered Smart Parking Management System that automates vehicle entry monitoring, license plate recognition, parking slot allocation, and real-time parking occupancy tracking using Computer Vision and Deep Learning.

## 📌 Project Overview

This project combines **YOLOv8 Object Detection**, **OCR-based License Plate Recognition**, **FastAPI Backend**, **MySQL Database**, and a modern **React Dashboard** to create a complete intelligent parking management solution.

The system detects incoming vehicles, extracts license plate numbers, automatically assigns parking slots, maintains entry/exit records, and visualizes parking occupancy in real-time.

---

## ✨ Key Features

### 🚘 Vehicle Detection

* Real-time vehicle detection using YOLOv8.
* Supports cars entering the parking area.
* Live camera feed processing.

### 🔍 License Plate Recognition

* Automatic number plate detection.
* OCR-based vehicle number extraction.
* Stores vehicle information in the database.

### 🅿️ Smart Parking Allocation

* Automatic parking slot assignment.
* Dynamic occupancy tracking.
* Real-time parking availability updates.

### 🚧 Entry Barrier Simulation

* Barrier automatically opens when a valid vehicle is detected.
* Displays assigned parking slot.
* Auto-closes after vehicle entry.

### 📊 Live Dashboard

* Total Parking Slots
* Occupied Slots
* Available Slots
* Parking Occupancy Percentage
* Last Vehicle Detection
* Active Vehicle List
* Live Surveillance Feed

### 📝 Vehicle Tracking

* Entry Records
* Exit Records
* Parking Duration Tracking
* Active Vehicle Monitoring

---

## 🏗️ System Architecture

Camera Feed
↓
YOLOv8 Vehicle Detection
↓
License Plate Detection
↓
OCR Text Extraction
↓
Vehicle Validation
↓
MySQL Database
↓
Smart Slot Allocation
↓
React Dashboard Visualization

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Axios

### Backend

* FastAPI
* Python

### Computer Vision

* YOLOv8
* OpenCV

### OCR

* EasyOCR

### Database

* MySQL

### Tools

* Git
* GitHub
* VS Code

---

## 📷 Dashboard Preview

### Main Dashboard

Displays parking statistics, system status, occupancy percentage, and live vehicle monitoring.

### Smart Parking Layout

Visual representation of occupied and available parking slots.

### Entry Barrier Control

Simulates automated parking gate operations based on vehicle detection.

---

## 📂 Project Structure

```bash
vehicle_entry_monitoring/
│
├── backend/
│   ├── app.py
│   ├── detector.py
│   ├── database.py
│
├── frontend/
│   ├── src/
│   ├── components/
│
├── models/
│   ├── vehicle_detector.pt
│   └── plate_detector.pt
│
├── screenshots/
│
├── requirements.txt
├── README.md
└── database.sql
```

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/rushi935993/Intelligent-Vehivle-Entry-Monitoring-System-And-Licence-Plate-Recognition-System.git

cd Intelligent-Vehivle-Entry-Monitoring-System-And-Licence-Plate-Recognition-System
```

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Environment

Windows

```bash
venv\Scripts\activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Configure Database

Create MySQL database:

```sql
CREATE DATABASE vehicle_monitoring;
```

Import database schema.

### Run Backend

```bash
uvicorn app:app --reload
```

### Run Frontend

```bash
npm install
npm start
```

---

## 📈 Future Enhancements

* Multi-camera support
* Vehicle exit verification
* Parking duration billing system
* SMS/Email notifications
* Cloud deployment
* Mobile application
* RFID integration
* ANPR accuracy optimization

---

## 🎯 Project Outcomes

* Automated parking slot management
* Reduced manual monitoring effort
* Real-time occupancy visualization
* Accurate vehicle identification
* Improved parking efficiency

---

## 👨‍💻 Author

**Rushikesh Patil**

BE - Artificial Intelligence & Data Science

Savitribai Phule Pune University

GitHub:
https://github.com/rushi935993

LinkedIn:
(Add your LinkedIn Profile URL)

---

## ⭐ If you found this project useful, please give it a star.
