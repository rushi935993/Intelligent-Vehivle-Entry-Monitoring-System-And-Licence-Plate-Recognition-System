import React, { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:8000";

function App() {
  const [stats, setStats] = useState(null);
  const [mode, setModeState] = useState("ENTRY");

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/stats`);
      setStats(res.data);
    } catch (err) {
      console.log(err);
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
    const interval = setInterval(fetchStats, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={styles.container}>
      {/* HEADER */}
      <h1 style={styles.title}>🚗 Smart Parking System</h1>

      {/* MODE TOGGLE */}
      <div style={styles.modeContainer}>
        <button
          style={{
            ...styles.button,
            background: mode === "ENTRY" ? "#4CAF50" : "#ccc",
          }}
          onClick={() => setMode("ENTRY")}
        >
          ENTRY
        </button>

        <button
          style={{
            ...styles.button,
            background: mode === "EXIT" ? "#f44336" : "#ccc",
          }}
          onClick={() => setMode("EXIT")}
        >
          EXIT
        </button>
      </div>

      {/* CAMERA */}
      <div style={styles.cameraBox}>
        <img
          src={`${API}/video_feed`}
          alt="camera"
          style={styles.camera}
        />
      </div>

      {/* STATS */}
      {stats && (
        <div style={styles.cardRow}>
          <Card title="Total Slots" value={stats.total} />
          <Card title="Occupied" value={stats.occupied} />
          <Card title="Available" value={stats.available} />
        </div>
      )}

      {/* TABLE */}
      <div style={styles.tableBox}>
        <h2>📋 Active Vehicles</h2>

        {stats && stats.active.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Plate Number</th>
                <th>Slot</th>
              </tr>
            </thead>
            <tbody>
              {stats.active.map((v, i) => (
                <tr key={i}>
                  <td>{v.plate_number}</td>
                  <td>{v.slot_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No vehicles currently parked</p>
        )}
      </div>
    </div>
  );
}

// ================= CARD =================
function Card({ title, value }) {
  return (
    <div style={styles.card}>
      <h3>{title}</h3>
      <h1>{value}</h1>
    </div>
  );
}

// ================= STYLES =================
const styles = {
  container: {
    fontFamily: "Arial",
    background: "#f4f6f8",
    minHeight: "100vh",
    padding: "20px",
    textAlign: "center",
  },

  title: {
    marginBottom: "20px",
  },

  modeContainer: {
    marginBottom: "20px",
  },

  button: {
    padding: "12px 25px",
    margin: "10px",
    border: "none",
    borderRadius: "6px",
    fontSize: "16px",
    cursor: "pointer",
  },

  cameraBox: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "20px",
  },

  camera: {
    width: "800px",
    borderRadius: "10px",
    border: "3px solid #333",
  },

  cardRow: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    marginBottom: "20px",
  },

  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "10px",
    width: "180px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },

  tableBox: {
    marginTop: "20px",
  },

  table: {
    margin: "0 auto",
    borderCollapse: "collapse",
    width: "60%",
    background: "#fff",
  },
};

export default App;