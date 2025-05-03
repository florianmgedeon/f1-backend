const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 🏁 FLAGS
const testing = true;
const running = true;

let latestData = null;
let latestPosition = null;
let latestInterval = null;

let lastLap = null;
let previousLap = null;
let currentLapStart = null;

if (running) {
  // Car data (500ms)
  setInterval(async () => {
    try {
      const since = new Date(Date.now() - 5000).toISOString();
      const res = await axios.get(
        testing
          ? `https://api.openf1.org/v1/car_data?driver_number=55&session_key=9159&speed%3E=315`
          : `https://api.openf1.org/v1/car_data?driver_number=1&session_key=latest&date>${since}`
      );
      const data = res.data;
      if (data.length > 0) {
        data.sort((a, b) => new Date(a.date) - new Date(b.date));
        latestData = data[0];
      }
    } catch (err) {
      console.error('Car data fetch error:', err.message);
    }
  }, 500);

  // Position (500ms)
  setInterval(async () => {
    try {
      const since = new Date(Date.now() - 5000).toISOString();
      const res = await axios.get(
        testing
          ? `https://api.openf1.org/v1/position?driver_number=55&session_key=9159`
          : `https://api.openf1.org/v1/position?driver_number=1&session_key=latest`
      );
      const data = res.data;
      if (data.length > 0) {
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        latestPosition = data[0].position;
      }
    } catch (err) {
      console.error('Position fetch error:', err.message);
    }
  }, 500);

  // Interval (10s)
  setInterval(async () => {
    try {
      const since = new Date(Date.now() - 10000).toISOString();
      const res = await axios.get(
        testing
          ? `https://api.openf1.org/v1/intervals?session_key=9165&interval%3C0.005`
          : `https://api.openf1.org/v1/intervals?driver_number=1&session_key=latest`
      );
      const data = res.data;
      if (data.length > 0) {
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        latestInterval = data[0].interval;
      }
    } catch (err) {
      console.error('Interval fetch error:', err.message);
    }
  }, 1000);

  // Lap data (1s)
  setInterval(async () => {
    try {
      const since = new Date(Date.now() - 20000).toISOString();
      const res = await axios.get(
        testing
          ? `https://api.openf1.org/v1/laps?session_key=9161&driver_number=63&lap_number%3E7&lap_number%3C10`
          : `https://api.openf1.org/v1/laps?session_key=latest&driver_number=1`
      );
      const data = res.data;
      if (data.length > 0) {
        data.sort((a, b) => b.lap_number - a.lap_number);
        const latest = data[0];

        if (!lastLap || lastLap.lap_number !== latest.lap_number) {
          // new lap finished
          previousLap = lastLap;
          lastLap = latest;
          currentLapStart = new Date(latest.date_start);
        }
      }
    } catch (err) {
      console.error('Lap fetch error:', err.message);
    }
  }, 1000);
} else {
  console.log('⏸ Data fetch is paused. Set running = true to enable.');
  latestData = null;
  latestPosition = null;
  latestInterval = null;
}

app.get('/api/live-data', (req, res) => {
  if (latestData) {
    const { throttle, brake, n_gear, speed, date } = latestData;

    // Fallback simulated test data
    if (testing && (!lastLap || !previousLap)) {
      lastLap = { lap_duration: 91.743 };
      previousLap = { lap_duration: 92.201 };
      currentLapStart = new Date(Date.now() - 32000);
    }

    // Show only the duration of the last completed lap
    const lastLapTime = lastLap ? lastLap.lap_duration : null;

    const lapDelta = lastLap && previousLap
      ? (lastLap.lap_duration - previousLap.lap_duration)
      : null;

    res.json({
      throttle,
      brake,
      n_gear,
      speed,
      date,
      position: latestPosition,
      interval: latestInterval,
      lap_time: lastLapTime,
      lap_delta: lapDelta
    });
  } else {
    res.status(204).send();
  }
});

app.get('/', (req, res) => {
  res.send('Backend is live. Try /api/live-data');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
