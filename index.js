const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;

let latestData = null;

setInterval(async () => {
  try {
    const since = new Date(Date.now() - 2000).toISOString();
    //const res = await axios.get(`https://api.openf1.org/v1/car_data?driver_number=1&session_key=latest&date>${since}`);
    //testing only:
    const res = await axios.get(`https://api.openf1.org/v1/car_data?driver_number=55&session_key=9159&speed%3E=315`);
    const data = res.data;
    if (data.length > 0) latestData = data[data.length - 1];
  } catch (err) {
    console.error('OpenF1 fetch error in index.js line 21:', err.message);
  }
}, 500);

app.get('/api/live-data', (req, res) => {
  if (latestData) {
    const { throttle, brake, n_gear, date } = latestData;
    res.json({ throttle, brake, n_gear, date });
  } else {
    res.status(204).send();
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
