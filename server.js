require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const pool    = require('./db');

const app = express();

// CORS — allow GitHub Pages frontend
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3001'
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/auth',    require('./routes/auth'));
app.use('/team',    require('./routes/team'));
app.use('/clients', require('./routes/clients'));
app.use('/tasks',   require('./routes/tasks'));

// 404
app.use((req, res) => res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Init DB tables then start
async function start() {
  const fs   = require('fs');
  const path = require('path');
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database schema ready');
  } catch (err) {
    console.error('Schema init error:', err.message);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`SMM-MANAGER API running on port ${PORT}`));
}

start();
