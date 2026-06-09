require('dotenv').config();
const express = require('express');
const cors    = require('cors');

console.log('Starting SMM-MANAGER API...');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);
console.log('JWT_SECRET set:', !!process.env.JWT_SECRET);

const pool = require('./db');

const app = express();

// CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://localhost:3001',
  'https://nomaanibrahim0336-ctrl.github.io'
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

async function start() {
  // Test DB connection first
  try {
    await pool.query('SELECT 1');
    console.log('Database connection OK');
  } catch (err) {
    console.error('Database connection FAILED:', err.message);
    process.exit(1);
  }

  // Run schema
  try {
    const fs   = require('fs');
    const path = require('path');
    const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('Database schema ready');
  } catch (err) {
    console.error('Schema init error:', err.message);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMM-MANAGER API running on port ${PORT}`);
  });
}

start();
