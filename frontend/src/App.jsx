import React, { useEffect, useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./App.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { saveAs } from "file-saver";
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
  FaHistory
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
  const [inputMode, setInputMode] = useState("camera");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState("");
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

const fetchHistory = async () => {
  try {
    const res = await axios.get(`${API}/history`);
    setHistory(res.data);
  } catch (err) {
    console.log(err);
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

  const handleImageSelect = (e) => {
  const file = e.target.files[0];

  if (!file) return;

  setSelectedImage(file);
  setPreviewImage(URL.createObjectURL(file));
};
useEffect(() => {

  fetchStats();
  fetchParkingLayout();
  fetchHistory();
  fetchLastEvent();

  const dashboardInterval = setInterval(() => {
    fetchStats();
    fetchParkingLayout();
    fetchHistory();
  }, 2000);

  const eventInterval = setInterval(fetchLastEvent, 1000);

  const clock = setInterval(() => {
    setTime(new Date());
  }, 1000);

  return () => {
    clearInterval(dashboardInterval);
    clearInterval(eventInterval);
    clearInterval(clock);
  };

}, []);

  const occupancy =
    stats?.total > 0 ? ((stats.occupied / stats.total) * 100).toFixed(0) : 0;


  const uploadImage = async () => {

    if (!selectedImage) return;

    const formData = new FormData();

    formData.append("file", selectedImage);

    try {

        const res = await axios.post(
            `${API}/upload_image`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        console.log("Backend Response:", res.data);

        alert(JSON.stringify(res.data));

    } catch (err) {

        console.log(err);

    }

};

const getVehicleIcon = (type) => {
    switch (type) {
        case "Car":
            return "bi bi-car-front-fill";

        case "Bus":
            return "bi bi-bus-front-fill";

        case "Truck":
            return "bi bi-truck-front-fill";

        case "Motorcycle":
            return "bi bi-bicycle";

        default:
            return "bi bi-car-front-fill";
    }
};

const formatDate = (date) => {

    if (!date) return "--";

    return new Date(date).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

};

const analytics = {

    cars: history.filter(v => v.vehicle_type === "Car").length,

    motorcycles: history.filter(v => v.vehicle_type === "Motorcycle").length,

    buses: history.filter(v => v.vehicle_type === "Bus").length,

    trucks: history.filter(v => v.vehicle_type === "Truck").length,

};

const today = new Date().toDateString();

const todayEntries = history.filter(vehicle => {

    if (!vehicle.entry_time) return false;

    return new Date(vehicle.entry_time).toDateString() === today;

}).length;

const todayExits = history.filter(vehicle => {

    if (!vehicle.exit_time) return false;

    return new Date(vehicle.exit_time).toDateString() === today;

}).length;

const activeVehicles = stats?.occupied ?? 0;

const occupancyRate =
    stats?.total
        ? Math.round((stats.occupied / stats.total) * 100)
        : 0;

const durationColor = (minutes)=>{

    if(minutes===null)
        return "text-success";

    if(minutes<30)
        return "text-warning";

    if(minutes<120)
        return "text-info";

    return "text-danger";

}

const exportCSV = () => {

    const headers = [
        "Vehicle Type",
        "Plate Number",
        "Slot",
        "Entry Time",
        "Exit Time",
        "Duration",
        "Status"
    ];

    const rows = history.map(vehicle => [

        vehicle.vehicle_type || "-",

        vehicle.plate_number || "-",

        `S${vehicle.slot_id}`,

        formatDate(vehicle.entry_time),

        formatDate(vehicle.exit_time),

        vehicle.exit_time
            ? `${vehicle.duration_minutes} min`
            : "Active",

        vehicle.exit_time
            ? "Exited"
            : "Active"

    ]);

    const csv = [
        headers.join(","),
        ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob(
        [csv],
        { type: "text/csv;charset=utf-8;" }
    );

    saveAs(blob, "vehicle_history.csv");

};

const exportPDF = () => {

    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Smart Parking Management System", 14, 20);

    doc.setFontSize(12);
    doc.text("Vehicle Detection Report", 14, 30);

    doc.text(
        `Generated : ${new Date().toLocaleString()}`,
        14,
        40
    );

    doc.text(`Total Slots : ${stats.total}`, 14, 55);
    doc.text(`Occupied Slots : ${stats.occupied}`, 14, 63);
    doc.text(`Available Slots : ${stats.available}`, 14, 71);

    autoTable(doc, {

        startY: 85,

        head: [[
            "Vehicle",
            "Plate",
            "Slot",
            "Entry",
            "Exit",
            "Duration",
            "Status"
        ]],

        body: history.map(vehicle => [

            vehicle.vehicle_type || "-",

            vehicle.plate_number || "-",

            `S${vehicle.slot_id}`,

            formatDate(vehicle.entry_time),

            formatDate(vehicle.exit_time),

            vehicle.exit_time
                ? `${vehicle.duration_minutes} min`
                : "Active",

            vehicle.exit_time
                ? "Exited"
                : "Active"

        ])

    });

    doc.save("Vehicle_Parking_Report.pdf");

};


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

          <div className="stat-card mb-4">

            <h4 className="mb-3">
              📥 Input Source
            </h4>

            <div className="form-check mb-2">

              <input
                className="form-check-input"
                type="radio"
                checked={inputMode === "camera"}
                onChange={() => setInputMode("camera")}
              />

              <label className="form-check-label">
                📷 Live Camera
              </label>

            </div>

            <div className="form-check mb-3">

              <input
                className="form-check-input"
                type="radio"
                checked={inputMode === "image"}
                onChange={() => setInputMode("image")}
              />

              <label className="form-check-label">
                🖼 Upload Image
              </label>

            </div>

            {
              inputMode === "image" && (

                <>

                  <input
                    type="file"
                    accept="image/*"
                    className="form-control mb-3"
                    onChange={handleImageSelect}
                  />

                  {
                    previewImage && (

                      <img
                        src={previewImage}
                        alt="Preview"
                        className="img-fluid rounded shadow mb-3"
                      />

                    )
                  }

                  <button
                    className="btn btn-primary w-100"
                    onClick={uploadImage}
                  >
                    🔍 Analyze Image
                  </button>

                </>

              )
            }

          </div>
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

              {
                inputMode === "camera" ? (

                  <img
                    src={`${API}/video_feed`}
                    alt="Camera"
                    className="camera-feed"
                  />

                ) : (

                  previewImage ? (

                    <img
                      src={previewImage}
                      alt="Preview"
                      className="camera-feed"
                    />

                  ) : (

                    <div className="text-center py-5">

                      <h4>No Image Selected</h4>

                    </div>

                  )

                )
              }
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

        {/* ================= VEHICLE HISTORY ================= */}

        <div className="vehicle-table mt-5">

            <div
                className="p-3 text-white fw-bold"
                style={{
                    background: "linear-gradient(135deg,#2563eb,#1e40af)"
                }}
            >
                <FaHistory className="me-2" />
                Vehicle Detection History
            </div>
        
        {/* ================= VEHICLE ANALYTICS ================= */}

        <div className="row g-4 mt-2 mb-4">

            <div className="col-md-3">

                <div className="stat-card text-center">

                    <h3>🚗</h3>

                    <h6>Cars</h6>

                    <h2>{analytics.cars}</h2>

                </div>

            </div>

            <div className="col-md-3">

                <div className="stat-card text-center">

                    <h3>🏍️</h3>

                    <h6>Motorcycles</h6>

                    <h2>{analytics.motorcycles}</h2>

                </div>

            </div>

            <div className="col-md-3">

                <div className="stat-card text-center">

                    <h3>🚌</h3>

                    <h6>Buses</h6>

                    <h2>{analytics.buses}</h2>

                </div>

            </div>

            <div className="col-md-3">

                <div className="stat-card text-center">

                    <h3>🚛</h3>

                    <h6>Trucks</h6>

                    <h2>{analytics.trucks}</h2>

                </div>

            </div>

        </div>

        <div className="row g-4 mb-5">

            <div className="col-md-3">
                <div className="stat-card text-center">
                    <h3>📅</h3>
                    <h6>Today's Entries</h6>
                    <h2 className="text-primary">{todayEntries}</h2>
                </div>
            </div>

            <div className="col-md-3">
                <div className="stat-card text-center">
                    <h3>🚪</h3>
                    <h6>Today's Exits</h6>
                    <h2 className="text-danger">{todayExits}</h2>
                </div>
            </div>

            <div className="col-md-3">
                <div className="stat-card text-center">
                    <h3>🚗</h3>
                    <h6>Active Vehicles</h6>
                    <h2 className="text-success">{activeVehicles}</h2>
                </div>
            </div>

            <div className="col-md-3">
                <div className="stat-card text-center">
                    <h3>📈</h3>
                    <h6>Occupancy Rate</h6>
                    <h2 className="text-warning">{occupancyRate}%</h2>
                </div>
            </div>

        </div>

            <div className={`p-3 ${darkMode ? "bg-dark" : "bg-white"}`}>

                {/* Search */}

                <div className="d-flex justify-content-between align-items-center mb-3">

                    <div className="d-flex">

                        <input
                            type="text"
                            className="form-control"
                            style={{ width: "350px" }}
                            placeholder="🔍 Search Plate / Vehicle / Slot"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <button
                            className="btn btn-outline-secondary ms-2"
                            onClick={() => setSearch("")}
                        >
                            Clear
                        </button>

                        <button
                            className="btn btn-success ms-2"
                            onClick={exportCSV}
                        >
                            ⬇ Export CSV
                        </button>

                        <button
                            className="btn btn-danger ms-2"
                            onClick={exportPDF}
                        >
                            📄 Export PDF
                        </button>

                    </div>

                </div>

                {/* Search Counter */}

                <div className="text-end mb-2">

                    <small className="text-secondary">

                        Showing {

                            history.filter((vehicle) => {

                                const keyword = search.toLowerCase();

                                const plate = (vehicle.plate_number ?? "").toLowerCase();
                                const type = (vehicle.vehicle_type ?? "").toLowerCase();
                                const slot = String(vehicle.slot_id ?? "");

                                return (
                                    plate.includes(keyword) ||
                                    type.includes(keyword) ||
                                    slot.includes(keyword)
                                );

                            }).length

                        } vehicle(s)

                    </small>

                </div>

                <table className={`table table-hover ${darkMode ? "table-dark" : ""}`}>

                    <thead>

                        <tr>

                            <th>Vehicle</th>
                            <th>Plate Number</th>
                            <th>Slot</th>
                            <th>Entry Time</th>
                            <th>Exit Time</th>
                            <th>Duration</th>
                            <th>Status</th>

                        </tr>

                    </thead>

                    <tbody>

                        {history
                          .filter((vehicle) => {

                              const keyword = search.toLowerCase();

                              const plate = (vehicle.plate_number || "").toLowerCase();
                              const type = (vehicle.vehicle_type || "").toLowerCase();
                              const slot = String(vehicle.slot_id || "");

                              return (
                                  plate.includes(keyword) ||
                                  type.includes(keyword) ||
                                  slot.includes(keyword)
                              );

                          })
                          .map((vehicle, index) => (

                            <tr key={index}>

                                <td>

                                    <i className={`${getVehicleIcon(vehicle.vehicle_type)} me-2 text-primary`}></i>

                                    {vehicle.vehicle_type}

                                </td>

                                <td>{vehicle.plate_number}</td>

                                <td>S{vehicle.slot_id}</td>

                                <td>{formatDate(vehicle.entry_time)}</td>

                                <td>{formatDate(vehicle.exit_time)}</td>

                                <td>

                                    <span className={`fw-bold ${durationColor(vehicle.duration_minutes)}`}>

                                        {

                                            vehicle.exit_time

                                            ?

                                            `${vehicle.duration_minutes} min`

                                            :

                                            "Active"

                                        }

                                    </span>

                                </td>

                                <td>

                                    {

                                        vehicle.exit_time

                                        ?

                                        <span className="badge bg-danger">
                                            Exited
                                        </span>

                                        :

                                        <span className="badge bg-success">
                                            Active
                                        </span>

                                    }

                                </td>

                            </tr>

                        ))}

                    </tbody>

                </table>

            </div>

        </div>

        {/* ================= ACTIVE VEHICLES ================= */}

        <div className="vehicle-table mt-5">

            <div
                className="p-3 text-white fw-bold"
                style={{
                    background: "linear-gradient(135deg,#16a34a,#15803d)"
                }}
            >
                <FaListAlt className="me-2" />
                Active Vehicles In Parking Area
            </div>

            <div className={`p-3 ${darkMode ? "bg-dark" : "bg-white"}`}>

                {

                    stats?.active?.length > 0

                    ?

                    <table className={`table table-hover ${darkMode ? "table-dark" : ""}`}>

                        <thead>

                            <tr>

                                <th>Vehicle Number</th>
                                <th>Parking Slot</th>
                                <th>Status</th>

                            </tr>

                        </thead>

                        <tbody>

                            {stats.active.map((vehicle,index)=>(

                                <tr key={index}>

                                    <td className="fw-bold">

                                        {vehicle.plate_number}

                                    </td>

                                    <td>

                                        S{vehicle.slot_id}

                                    </td>

                                    <td>

                                        <span className="badge bg-success">

                                            Parked

                                        </span>

                                    </td>

                                </tr>

                            ))}

                        </tbody>

                    </table>

                    :

                    <div className="text-center py-4">

                        No active vehicles found

                    </div>

                }

            </div>

        </div>
      </div>
    </div>
  );
}

export default App;
