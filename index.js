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

// Normalization bounds for Bahrain (based on your SVG)
const xMin = -577;
const xMax = 7440;
const yMin = -3500;
const yMax = 8346;

function normalize(value, min, max) {
  return (value - min) / (max - min);
}

if (running) {
  setInterval(async () => {
    try {
      const since = new Date(Date.now() - 5000).toISOString();

      const resCar = await axios.get(
        testing
          ? `https://api.openf1.org/v1/car_data?driver_number=55&session_key=9159&speed%3E=315`
          : `https://api.openf1.org/v1/car_data?driver_number=1&session_key=latest&date>${since}`
      );
      const carData = resCar.data;
      if (carData.length > 0) {
        carData.sort((a, b) => new Date(a.date) - new Date(b.date));
        latestData = carData[0];
      }

      const resLoc = await axios.get(
        testing
          ? `https://api.openf1.org/v1/location?driver_number=55&session_key=9159&date>${since}`
          : `https://api.openf1.org/v1/location?driver_number=1&session_key=latest&date>${since}`
      );
      const locData = resLoc.data;
      if (locData.length > 0) {
        locData.sort((a, b) => new Date(a.date) - new Date(b.date));
        const oldest = locData[0];
        latestPosition = {
          x: normalize(oldest.x, xMin, xMax),
          y: 1 - normalize(oldest.y, yMin, yMax), // flip Y for SVG
        };
      }
    } catch (err) {
      console.error('OpenF1 fetch error:', err.message);
    }
  }, 500);
} else {
  console.log('Data fetch is paused. Set running = true to enable.');
  latestData = null;
  latestPosition = null;
}

app.get('/api/live-data', (req, res) => {
  if (latestData) {
    const { throttle, brake, n_gear, speed, date } = latestData;
    res.json({ throttle, brake, n_gear, speed, date });
  } else {
    res.status(204).send();
  }
});

app.get('/api/track-position', (req, res) => {
  if (latestPosition) {
    res.json(latestPosition);
  } else {
    res.status(204).send();
  }
});

app.get('/', (req, res) => {
  res.send('Backend is live. Try /api/live-data or /api/track-position');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
