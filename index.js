const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

// 🏁 FLAGS
const testing = true;
const running = false;

let latestData = null;
let trackData = [];
let currentIndex = 0;

// Load the normalized lap data from CSV on startup
const csvPath = path.join(__dirname, 'maps', 'bahrain_normalized_lap_data.csv');
fs.createReadStream(csvPath)
  .pipe(csv())
  .on('data', (row) => {
    trackData.push({
      x: parseFloat(row.x_norm),
      y: parseFloat(row.y_norm),
    });
  })
  .on('end', () => {
    console.log(`Loaded ${trackData.length} normalized track points.`);
  });

if (running) {
  setInterval(async () => {
    try {
      const since = new Date(Date.now() - 5000).toISOString(); // 5s window

      const res = await axios.get(
        testing
          ? `https://api.openf1.org/v1/car_data?driver_number=55&session_key=9159&speed%3E=315`
          : `https://api.openf1.org/v1/car_data?driver_number=1&session_key=latest&date>${since}`
      );
      const data = res.data;

      if (data.length > 0) {
        // Sort by date ascending and pick the oldest
        data.sort((a, b) => new Date(a.date) - new Date(b.date));
        latestData = data[0];
      }
    } catch (err) {
      console.error('OpenF1 fetch error in index.js line 24:', err.message);
    }
  }, 500);
} else {
  console.log('Data fetch is paused. Set running = true to enable.');
  latestData = null;
}

app.get('/api/track-position', (req, res) => {
  if (trackData.length === 0) return res.status(503).json({ error: 'Track data not loaded yet.' });

  const point = trackData[currentIndex];
  currentIndex = (currentIndex + 1) % trackData.length;

  res.json(point);
});

app.get('/api/live-data', (req, res) => {
  if (latestData) {
    const { throttle, brake, n_gear, speed, date } = latestData;
    res.json({ throttle, brake, n_gear, speed, date });
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
