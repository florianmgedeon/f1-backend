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
  console.log('⏸ Data fetch is paused. Set running = true to enable.');
  latestData = null;
}

app.get('/api/live-data', (req, res) => {
  if (latestData) {
    const { throttle, brake, n_gear, speed, date } = latestData;
    res.json({ throttle, brake, n_gear, speed, date });
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