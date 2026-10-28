import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import connectDB from './config/db.js';
import feedbackRoutes from './routes/feedbackRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'PulseLens API', time: new Date().toISOString() });
});

app.use('/api/feedback', feedbackRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err.message);

  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  if (err.message === 'Only .csv files are allowed') {
    return res.status(400).json({ message: err.message });
  }

  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

const start = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 PulseLens API running on http://localhost:${PORT}`);
  });
};

start();