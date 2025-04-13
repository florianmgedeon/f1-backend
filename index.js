const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 🏁 FLAGS
const testing = true;
const running = false;

let latestData = null;
let latestPosition = null;
let latestInterval = null;

if (running) {
  // Fetch car data (every 500ms)
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

  // Fetch position data
  setInterval(async () => {
    try {
      const since = new Date(Date.now() - 5000).toISOString();
      const res = await axios.get(
        testing
          ? `https://api.openf1.org/v1/position?driver_number=55&session_key=9159`
          : `https://api.openf1.org/v1/position?driver_number=1&session_key=latest&date>${since}`
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

  // Fetch interval data
  setInterval(async () => {
    try {
      const since = new Date(Date.now() - 10000).toISOString();
      const res = await axios.get(
        testing
          ? `https://api.openf1.org/v1/intervals?session_key=9165&interval%3C0.005`
          : `https://api.openf1.org/v1/intervals?driver_number=1&session_key=latest&date>${since}`
      );

      const data = res.data;
      if (data.length > 0) {
        data.sort((a, b) => new Date(b.date) - new Date(a.date));
        latestInterval = data[0].interval;
      }
    } catch (err) {
      console.error('Interval fetch error:', err.message);
    }
  }, 10000);
} else {
  console.log('⏸ Data fetch is paused. Set running = true to enable.');
  latestData = null;
  latestPosition = null;
  latestInterval = null;
}

app.get('/api/live-data', (req, res) => {
  if (latestData) {
    const { throttle, brake, n_gear, speed, date } = latestData;
    res.json({
      throttle,
      brake,
      n_gear,
      speed,
      date,
      position: latestPosition,
      interval: latestInterval
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
