const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const pool    = require('../db');
const { verifyToken, requireRole } = require('../middleware/auth');

// All team routes require auth
router.use(verifyToken);

// GET /team — all members (admin/pm only for full list; others get name+role only)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, email, role, avatar, created_at FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /team — add member (admin only)
router.post('/', requireRole('admin'), async (req, res) => {
  const { name, email, password, role, avatar } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'Name and role required' });

  try {
    const hash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash('changeme123', 10);
    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password, role, avatar) VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,role,avatar',
      [name, email || null, hash, role, avatar || '👤']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /team/:id — update member (admin only)
router.put('/:id', requireRole('admin'), async (req, res) => {
  const { name, email, role, avatar, password } = req.body;
  try {
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        'UPDATE users SET name=$1, email=$2, role=$3, avatar=$4, password=$5 WHERE id=$6',
        [name, email, role, avatar, hash, req.params.id]
      );
    } else {
      await pool.query(
        'UPDATE users SET name=$1, email=$2, role=$3, avatar=$4 WHERE id=$5',
        [name, email, role, avatar, req.params.id]
      );
    }
    const { rows } = await pool.query(
      'SELECT id,name,email,role,avatar FROM users WHERE id=$1', [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /team/:id (admin only)
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /team/:id/password — change own password
router.put('/:id/password', async (req, res) => {
  if (req.user.id != req.params.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  const { password } = req.body;
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password too short' });
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hash, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
