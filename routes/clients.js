const router = require('express').Router();
const pool   = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

function roleFilter(user) {
  if (user.role === 'admin' || user.role === 'project_manager') return '';
  if (user.role === 'creator')  return `AND (executive = '${user.name}' OR pm = '${user.name}')`;
  if (user.role === 'designer') return `AND designer = '${user.name}'`;
  return 'AND 1=0';
}

// GET /clients
router.get('/', async (req, res) => {
  try {
    const filter = roleFilter(req.user);
    const { rows } = await pool.query(
      `SELECT * FROM clients WHERE 1=1 ${filter} ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /clients/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clients WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /clients
router.post('/', async (req, res) => {
  const { id, name, platform, status, package: pkg, budget, start_date, end_date, tenure, brief, executive, designer, pm } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO clients (id,name,platform,status,package,budget,start_date,end_date,tenure,brief,executive,designer,pm)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         name=$2,platform=$3,status=$4,package=$5,budget=$6,
         start_date=$7,end_date=$8,tenure=$9,brief=$10,
         executive=$11,designer=$12,pm=$13,updated_at=NOW()
       RETURNING *`,
      [id, name, platform, status||'active', pkg, budget||0, start_date||null, end_date||null, tenure||3, brief||'', executive||'', designer||'', pm||'']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /clients/:id
router.put('/:id', async (req, res) => {
  const { name, platform, status, package: pkg, budget, start_date, end_date, tenure, brief, executive, designer, pm } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE clients SET name=$1,platform=$2,status=$3,package=$4,budget=$5,
       start_date=$6,end_date=$7,tenure=$8,brief=$9,executive=$10,designer=$11,pm=$12,updated_at=NOW()
       WHERE id=$13 RETURNING *`,
      [name, platform, status, pkg, budget, start_date||null, end_date||null, tenure, brief, executive, designer, pm, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /clients/:id
router.delete('/:id', async (req, res) => {
  if (req.user.role !== 'admin' && req.user.role !== 'project_manager') {
    return res.status(403).json({ error: 'Access denied' });
  }
  try {
    await pool.query('DELETE FROM clients WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
