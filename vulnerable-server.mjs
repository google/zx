import express from 'express';
import { tempfile } from './build/index.js';

const app = express();
app.use(express.json());
const port = 3000;

app.post('/create-report', (req, res) => {
  try {
    const { filename, content } = req.body;
    console.log(`Received request to create report with filename: ${filename}`);

    const resultPath = tempfile(filename, content);
    console.log(`tempfile returned path: ${resultPath}`);

    res.json({ success: true, path: resultPath });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Vulnerable server listening on port ${port}`);
});
