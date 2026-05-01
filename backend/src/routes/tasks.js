const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function logActivity(userId, action, entityType, entityId, details) {
  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(userId, action, entityType, entityId, details);
}

function canAccessProject(projectId, userId, role) {
  if (role === 'admin') return true;
  const member = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(projectId, userId);
  return !!member;
}

// GET /api/tasks - Get all tasks for current user
router.get('/', authenticate, (req, res) => {
  let tasks;
  if (req.user.role === 'admin') {
    tasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name, c.name as creator_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      JOIN users c ON c.id = t.created_by
      ORDER BY t.created_at DESC
    `).all();
  } else {
    tasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name, c.name as creator_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      JOIN users c ON c.id = t.created_by
      WHERE t.assigned_to = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id);
  }
  res.json({ tasks });
});

// GET /api/tasks/my - Get tasks assigned to current user
router.get('/my', authenticate, (req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name, c.name as creator_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assigned_to
    JOIN users c ON c.id = t.created_by
    WHERE t.assigned_to = ?
    ORDER BY t.due_date ASC NULLS LAST
  `).all(req.user.id);
  res.json({ tasks });
});

// GET /api/tasks/project/:projectId
router.get('/project/:projectId', authenticate, (req, res) => {
  if (!canAccessProject(req.params.projectId, req.user.id, req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const tasks = db.prepare(`
    SELECT t.*, u.name as assignee_name, c.name as creator_name
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assigned_to
    JOIN users c ON c.id = t.created_by
    WHERE t.project_id = ?
    ORDER BY t.created_at DESC
  `).all(req.params.projectId);

  res.json({ tasks });
});

// GET /api/tasks/:id
router.get('/:id', authenticate, (req, res) => {
  const task = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name, c.name as creator_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assigned_to
    JOIN users c ON c.id = t.created_by
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) return res.status(404).json({ message: 'Task not found' });

  if (!canAccessProject(task.project_id, req.user.id, req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  res.json({ task });
});

// POST /api/tasks - Admin only: create task
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { title, description, status, dueDate, projectId, assignedTo } = req.body;

  if (!title || !projectId) {
    return res.status(400).json({ message: 'Title and project ID are required' });
  }

  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const validStatuses = ['todo', 'inprogress', 'completed'];
  const taskStatus = validStatuses.includes(status) ? status : 'todo';

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, due_date, project_id, assigned_to, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || '', taskStatus, dueDate || null, projectId, assignedTo || null, req.user.id);

  logActivity(req.user.id, 'created', 'task', result.lastInsertRowid, `Created task: ${title}`);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Task created', task });
});

// PUT /api/tasks/:id - Admin can update all fields; member can only update status
router.put('/:id', authenticate, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  if (!canAccessProject(task.project_id, req.user.id, req.user.role)) {
    return res.status(403).json({ message: 'Access denied' });
  }

  const validStatuses = ['todo', 'inprogress', 'completed'];

  if (req.user.role === 'admin') {
    const { title, description, status, dueDate, assignedTo } = req.body;
    const newStatus = validStatuses.includes(status) ? status : task.status;

    db.prepare(`
      UPDATE tasks SET title = ?, description = ?, status = ?, due_date = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || task.title,
      description !== undefined ? description : task.description,
      newStatus,
      dueDate !== undefined ? dueDate : task.due_date,
      assignedTo !== undefined ? assignedTo : task.assigned_to,
      req.params.id
    );
  } else {
    // Members can only update status
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'Status is required' });
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(status, req.params.id);
  }

  logActivity(req.user.id, 'updated', 'task', req.params.id, `Updated task: ${task.title}`);

  const updated = db.prepare(`
    SELECT t.*, p.name as project_name, u.name as assignee_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN users u ON u.id = t.assigned_to
    WHERE t.id = ?
  `).get(req.params.id);

  res.json({ message: 'Task updated', task: updated });
});

// DELETE /api/tasks/:id - Admin only
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'deleted', 'task', req.params.id, `Deleted task: ${task.title}`);

  res.json({ message: 'Task deleted' });
});

module.exports = router;
