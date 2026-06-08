const router = require('express').Router();
const pool   = require('../db');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

function roleFilter(user) {
  if (user.role === 'admin' || user.role === 'project_manager') return '';
  if (user.role === 'creator')  return `AND (assigned_to = '${user.name}')`;
  if (user.role === 'designer') return `AND (designer = '${user.name}')`;
  return 'AND 1=0';
}

async function getTimeline(taskId) {
  const { rows } = await pool.query(
    'SELECT * FROM task_timeline WHERE task_id=$1 ORDER BY created_at ASC', [taskId]
  );
  return rows;
}

async function getChanges(taskId) {
  const { rows } = await pool.query(
    'SELECT * FROM change_requests WHERE task_id=$1 ORDER BY created_at DESC', [taskId]
  );
  return rows;
}

// GET /tasks
router.get('/', async (req, res) => {
  try {
    const filter = roleFilter(req.user);
    const { rows } = await pool.query(
      `SELECT * FROM tasks WHERE 1=1 ${filter} ORDER BY created_at DESC`
    );
    // attach timeline + change_requests
    const enriched = await Promise.all(rows.map(async t => ({
      ...t,
      timeline:       await getTimeline(t.id),
      change_requests: await getChanges(t.id)
    })));
    res.json(enriched);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /tasks/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    const task = {
      ...rows[0],
      timeline:        await getTimeline(req.params.id),
      change_requests: await getChanges(req.params.id)
    };
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /tasks — create
router.post('/', async (req, res) => {
  const { id, client_id, client_name, title, platform, content_type, status, priority,
          assigned_to, designer, created_by, due_date, brief } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO tasks (id,client_id,client_name,title,platform,content_type,status,priority,assigned_to,designer,created_by,due_date,brief)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (id) DO UPDATE SET
         title=$4,platform=$5,content_type=$6,status=$7,priority=$8,
         assigned_to=$9,designer=$10,due_date=$12,brief=$13,updated_at=NOW()
       RETURNING *`,
      [id, client_id, client_name, title, platform, content_type, status||'pending', priority||'medium',
       assigned_to||'', designer||'', created_by||'', due_date||null, brief||'']
    );
    // log creation in timeline
    await pool.query(
      'INSERT INTO task_timeline (task_id,action,by) VALUES ($1,$2,$3)',
      [id, 'Task created', created_by || req.user.name]
    );
    res.status(201).json({ ...rows[0], timeline: await getTimeline(id), change_requests: [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /tasks/:id — update fields
router.put('/:id', async (req, res) => {
  const { status, priority, assigned_to, designer, due_date, posted_date,
          changes_requested, change_note, timeline_action } = req.body;
  try {
    await pool.query(
      `UPDATE tasks SET
         status=COALESCE($1,status), priority=COALESCE($2,priority),
         assigned_to=COALESCE($3,assigned_to), designer=COALESCE($4,designer),
         due_date=COALESCE($5,due_date), posted_date=COALESCE($6,posted_date),
         changes_requested=COALESCE($7,changes_requested),
         change_note=COALESCE($8,change_note), updated_at=NOW()
       WHERE id=$9`,
      [status, priority, assigned_to, designer, due_date||null, posted_date||null,
       changes_requested, change_note, req.params.id]
    );
    if (timeline_action) {
      await pool.query(
        'INSERT INTO task_timeline (task_id,action,by) VALUES ($1,$2,$3)',
        [req.params.id, timeline_action, req.user.name]
      );
    }
    if (changes_requested && change_note) {
      await pool.query(
        'INSERT INTO change_requests (task_id,note,requested_by) VALUES ($1,$2,$3)',
        [req.params.id, change_note, req.user.name]
      );
    }
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    res.json({
      ...rows[0],
      timeline:        await getTimeline(req.params.id),
      change_requests: await getChanges(req.params.id)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /tasks/:id/resolve-changes
router.post('/:id/resolve-changes', async (req, res) => {
  try {
    await pool.query(
      `UPDATE tasks SET changes_requested=false, change_note=null, status='with_designer', updated_at=NOW()
       WHERE id=$1`, [req.params.id]
    );
    await pool.query(
      'UPDATE change_requests SET resolved=true WHERE task_id=$1', [req.params.id]
    );
    await pool.query(
      'INSERT INTO task_timeline (task_id,action,by) VALUES ($1,$2,$3)',
      [req.params.id, 'Changes resolved — moved back to With Designer', req.user.name]
    );
    const { rows } = await pool.query('SELECT * FROM tasks WHERE id=$1', [req.params.id]);
    res.json({
      ...rows[0],
      timeline:        await getTimeline(req.params.id),
      change_requests: await getChanges(req.params.id)
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /tasks/:id
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tasks WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
