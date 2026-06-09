// Run once to seed correct password hashes
// Usage: node db/seed.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool   = require('./index');

async function seed() {
  const users = [
    { name:'Admin', email:'admin@smm.com', password:'admin123', role:'admin',           avatar:'A' },
    { name:'Noman', email:'noman@smm.com', password:'lead123',  role:'project_manager', avatar:'N' },
    { name:'Faaiz', email:'faaiz@smm.com', password:'exec123',  role:'designer',        avatar:'F' },
    { name:'Zaid',  email:'zaid@smm.com',  password:'exec123',  role:'creator',         avatar:'Z' },
  ];

  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await pool.query(
      `INSERT INTO users (name, email, password, role, avatar)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (email) DO UPDATE SET password=$3, name=$1, role=$4, avatar=$5`,
      [u.name, u.email, hash, u.role, u.avatar]
    );
    console.log(`✓ ${u.name} (${u.email}) seeded`);
  }
  console.log('Seed complete');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
