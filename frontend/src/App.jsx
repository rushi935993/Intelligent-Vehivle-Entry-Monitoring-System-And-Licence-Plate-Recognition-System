import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import {
  FaCar,
  FaParking,
  FaVideo,
  FaChartPie,
  FaMoon,
  FaSun,
  FaClock,
  FaCheckCircle,
  FaDoorOpen,
  FaDoorClosed,
  FaListAlt,
} from "react-icons/fa";

import { MdLocalParking, MdDirectionsCar } from "react-icons/md";

const API = "http://localhost:8000";
// const API = import.meta.env.VITE_API_URL;
// console.log(import.meta.env.VITE_API_URL);

function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [mode, setModeState] = useState("ENTRY");
  const [stats, setStats] = useState(null);
  const [parkingLayout, setParkingLayout] = useState([]); 
  const [time, setTime] = useState(new Date());

  const [lastEvent, setLastEvent] = useState({
    plate: "",
    slot: "",
    mode: "",
    message: "",  
    timestamp: 0,
  });
  const [barrierOpen, setBarrierOpen] = useState(false);
  const [barrierVehicle, setBarrierVehicle] = useState("");
  const [barrierSlot, setBarrierSlot] = useState("");
  const fetchStats = async () => {
  try {
    const res = await axios.get(`${API}/stats`);
    setStats(res.data);
  } catch (err) {
    console.log("Backend not connected:", err);
  }
};

  const fetchParkingLayout = async () => {
  try {
    const res = await axios.get(`${API}/parking_layout`);
    console.log("API response:", res.data);
    console.log("Response is array:", Array.isArray(res.data));
    setParkingLayout(res.data);
  } catch (err) {
    console.log("Parking Layout Error:", err);
  }
};

  const fetchLastEvent = async () => {
  try {
    const res = await axios.get(`${API}/last_event`);

    console.log("Last Event:", res.data);

    if (
      res.data.timestamp &&
      res.data.timestamp !== lastEvent.timestamp
    ) {
      setLastEvent(res.data);

      // 🚧 Open barrier
      setBarrierOpen(true);

      setBarrierVehicle(res.data.plate);
      setBarrierSlot(res.data.slot);

      // Auto close after 3 sec
      setTimeout(() => {
        setBarrierOpen(false);
      }, 3000);
    }
  } catch (err) {
    console.log("Event fetch failed:", err);
  }
};

  const setMode = async (m) => {
    try {
      await axios.post(`${API}/set_mode/${m}`);
      setModeState(m);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
  fetchStats();
  fetchParkingLayout();

  const statsInterval = setInterval(fetchStats, 2000);
  const parkingInterval = setInterval(fetchParkingLayout, 2000);

  const eventInterval = setInterval(fetchLastEvent, 1000);

  const clock = setInterval(() => {
    setTime(new Date());
  }, 1000);

  return () => {
    clearInterval(statsInterval);
    clearInterval(parkingInterval);
    clearInterval(eventInterval);
    clearInterval(clock);
  };
}, []);

  const occupancy =
    stats?.total > 0 ? ((stats.occupied / stats.total) * 100).toFixed(0) : 0;

  return (
    <div className={`app ${darkMode ? "dark-theme" : "light-theme"}`}>
      {/* HEADER */}
      <div className="dashboard-header">
        <div>
          <h1>🚗 Vehicle Entry Monitoring System</h1>
          <p>AI Powered Smart Parking Monitoring & Vehicle Tracking System</p>
        </div>

        <div className="header-actions">
          <div>
            <small>
              <FaClock className="me-2" />
              Current Time
            </small>
            <br />
            <strong>{time.toLocaleTimeString()}</strong>
          </div>

          <button
            className="btn btn-warning"
            onClick={() => setDarkMode(!darkMode)}
          >
            <>
              {darkMode ? (
                <>
                  <FaSun className="me-2" />
                  Light
                </>
              ) : (
                <>
                  <FaMoon className="me-2" />
                  Dark
                </>
              )}
            </>
          </button>

          <span className="badge bg-success p-2">
            <span className="live-dot"></span>
            System Online
          </span>
        </div>
      </div>

      <div className="container py-4">
        {/* MODE BUTTONS */}
        <div className="mode-section">
          <button
            className={`btn ${
              mode === "ENTRY" ? "btn-success" : "btn-outline-success"
            }`}
            onClick={() => setMode("ENTRY")}
          >
            🚘 ENTRY MODE
          </button>

          <button
            className={`btn ${
              mode === "EXIT" ? "btn-danger" : "btn-outline-danger"
            }`}
            onClick={() => setMode("EXIT")}
          >
            🚗 EXIT MODE
          </button>
        </div>

        {/* STATS */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div className="stat-card">
              <FaParking className="card-icon text-primary" />

              <h5>
                <FaParking className="me-2 text-primary" />
                Total Slots
              </h5>

              <div className="stat-number text-primary">
                {stats?.total ?? "--"}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="stat-card">
              <FaCar className="card-icon text-danger" />

              <h5>
                <FaCar className="me-2 text-danger" />
                Occupied Slots
              </h5>

              <div className="stat-number text-danger">
                {stats?.occupied ?? "--"}
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="stat-card">
              <FaCheckCircle className="card-icon text-success" />

              <h5>
                <FaCheckCircle className="me-2 text-success" />
                Available Slots
              </h5>

              <div className="stat-number text-success">
                {stats?.available ?? "--"}
              </div>
            </div>
          </div>
        </div>
        {/* LAST DETECTION */}
        <div className="stat-card mb-4">
          <h4 className="mb-3">
            <MdDirectionsCar className="me-2 text-success" />
            Last Detection
          </h4>

          {lastEvent.plate ? (
            <>
              <div className="mb-2">
                <strong>Vehicle Number:</strong> {lastEvent.plate}
              </div>

              <div className="mb-2">
                <strong>Mode:</strong>{" "}
                <span
                  className={`badge ${
                    lastEvent.mode === "ENTRY"
                      ? "bg-success"
                      : "bg-danger"
                  }`}
                >
                  {lastEvent.mode}
                </span>
              </div>

              <div className="mb-2">
                <strong>Slot:</strong> {lastEvent.slot}
              </div>

              <div className="mb-2">
                <strong>Time:</strong>{" "}
                {new Date(lastEvent.timestamp).toLocaleTimeString()}
              </div>

              <div className="last-detection-success">
                {lastEvent.message}
              </div>
            </>
          ) : (
            <div className="text-muted">
              Waiting for vehicle detection...
            </div>
          )}
        </div>

        {/* BARRIER CARD */}
        <div className="barrier-card mb-4">

          <div className="barrier-header">
            🚧 Entry Barrier
          </div>

          <div className="barrier-body">

            <div
              className={`barrier-status ${
                barrierOpen ? "barrier-open" : "barrier-closed"
              }`}
            >
              {barrierOpen ? "🟢 OPEN" : "🔴 CLOSED"}
            </div>

            <div className="mt-3">

              <strong>Vehicle:</strong>

              <div>
                {barrierVehicle || "-"}
              </div>

            </div>

            <div className="mt-2">

              <strong>Assigned Slot:</strong>

              <div>
                {barrierSlot
                  ? `S${String(barrierSlot).padStart(2, "0")}`
                  : "-"}
              </div>

            </div>

          </div>

        </div>

        {/* CAMERA + STATUS */}
        <div className="row g-4">
          {/* CAMERA FEED */}
          <div className="col-lg-8">
            <div className="camera-card">
              <div
                className="p-3 text-white fw-bold"
                style={{
                  background: "linear-gradient(135deg,#2563eb,#1e40af)",
                }}
              >
                <>
                  <FaVideo className="me-2" />
                  Live AI Surveillance Feed
                </>
              </div>

              <img
                src={`${API}/video_feed`}
                alt="Camera Feed"
                className="camera-feed"
              />
            </div>
          </div>

          {/* STATUS PANEL */}
          <div className="col-lg-4">
            <div className="stat-card mb-4">
              <h4 className="mb-3">
                <FaCheckCircle className="me-2 text-success" />
                System Status
              </h4>

              <div className="d-flex justify-content-between mb-3">
                <span>Camera Feed</span>
                <span className="badge bg-success">Active</span>
              </div>

              <div className="d-flex justify-content-between mb-3">
                <span>Detection Engine</span>
                <span className="badge bg-success">Running</span>
              </div>

              <div className="d-flex justify-content-between">
                <span>Current Mode</span>

                <span
                  className={`badge ${
                    mode === "ENTRY" ? "bg-success" : "bg-danger"
                  }`}
                >
                  {mode}
                </span>
              </div>
            </div>

            <div className="stat-card">
              <h4>
                <FaChartPie className="me-2 text-warning" />
                Parking Occupancy
              </h4>

              <div className="progress mt-3" style={{ height: "30px" }}>
                <div
                  className="progress-bar bg-danger"
                  role="progressbar"
                  style={{
                    width: `${occupancy}%`,
                  }}
                >
                  {occupancy}%
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* PARKING LAYOUT */}

        <div className="parking-layout-wrapper mt-5">

          <div className="parking-header">
            🅿 Smart Parking Layout
          </div>

          <div className="entry-gate">
            🚘 ENTRY GATE
          </div>

          <div className="parking-grid">

            {Array.isArray(parkingLayout) &&
              parkingLayout.map((slot) => (

              <div
                key={slot.slot_id}
                className={`parking-slot ${
                  slot.is_available ? "available-slot" : "occupied-slot"
                }`}
              >

                <div className="slot-id">
                  S{String(slot.slot_id).padStart(2, "0")}
                </div>

                <div className="slot-car">
                  {!slot.is_available ? "🚗" : ""}
                </div>

                <div className="slot-plate">
                  {!slot.is_available
                    ? slot.plate_number
                    : "AVAILABLE"}
                </div>

              </div>

            ))}

          </div>

          <div className="exit-gate">
            🚗 EXIT GATE
          </div>

        </div>
        {/* ACTIVE VEHICLES TABLE */}
        <div className="vehicle-table mt-5">
          <div
            className="p-3 text-white fw-bold"
            style={{
              background: "linear-gradient(135deg,#2563eb,#1e40af)",
            }}
          >
            <>
              <FaListAlt className="me-2" />
              Active Vehicles In Parking Area
            </>
          </div>

          <div className={`p-3 ${darkMode ? "bg-dark" : "bg-white"}`}>
            {stats?.active?.length > 0 ? (
              <table
                className={`table table-hover ${darkMode ? "table-dark" : ""}`}
              >
                <thead>
                  <tr>
                    <th>Vehicle Number</th>
                    <th>Parking Slot</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {stats.active.map((vehicle, index) => (
                    <tr key={index}>
                      <td className="fw-bold">{vehicle.plate_number}</td>

                      <td>{vehicle.slot_id}</td>

                      <td>
                        <span className="badge bg-success">Parked</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-4">No active vehicles found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
