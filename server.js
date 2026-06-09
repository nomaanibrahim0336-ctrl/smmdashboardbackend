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

// CORS — allow all origins (internal team tool)
app.use(cors({ origin: true, credentials: true }));

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

  // Run column migrations (safe to run every startup)
  try {
    await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduled_till DATE`);
    console.log('Migrations applied');
  } catch (err) {
    console.error('Migration error:', err.message);
  }

  // Seed users with correct bcrypt hashes
  try {
    const bcrypt = require('bcryptjs');
    const users = [
      { name:'Admin', email:'admin@smm.com', password:'admin123', role:'admin',           avatar:'A' },
      { name:'Noman', email:'noman@smm.com', password:'lead123',  role:'project_manager', avatar:'N' },
      { name:'Faaiz', email:'faaiz@smm.com', password:'exec123',  role:'designer',        avatar:'F' },
      { name:'Zaid',  email:'zaid@smm.com',  password:'exec123',  role:'creator',         avatar:'Z' },
    ];
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        `INSERT INTO users (name,email,password,role,avatar) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (email) DO UPDATE SET password=$3, name=$1, role=$4, avatar=$5`,
        [u.name, u.email, hash, u.role, u.avatar]
      );
      console.log(`Seeded user: ${u.email}`);
    }
    console.log('Users ready');
  } catch (err) {
    console.error('Seed error:', err.message);
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMM-MANAGER API running on port ${PORT}`);
  });
}

start();
