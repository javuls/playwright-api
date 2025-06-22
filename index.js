const express = require('express');
const { runTask } = require('./playwright');
const path = require('path');

const app = express();
app.use(express.json());
app.use('/results', express.static(path.join(__dirname, 'results')));

app.post('/run-playwright', async (req, res) => {
  const { url, action, formData } = req.body;
  if (!url || !action) return res.status(400).json({ error: 'Missing url or action.' });

  try {
    const data = await runTask({ url, action, formData });
    res.json({ status: 'success', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () => console.log('API running on port 3000'));
