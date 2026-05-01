const express = require('express');
const db = require('../database');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

function logActivity(userId, action, entityType, entityId, details) {
  db.prepare('INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?)')
    .run(userId, action, entityType, entityId, details);
}

// GET /api/projects - Get all projects (admin sees all, member sees assigned)
router.get('/', authenticate, (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    projects = db.prepare(`
      SELECT p.*, u.name as creator_name,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
      FROM projects p
      JOIN users u ON u.id = p.created_by
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as creator_name,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count
      FROM projects p
      JOIN users u ON u.id = p.created_by
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);
  }
  res.json({ projects });
});

// GET /api/projects/:id
router.get('/:id', authenticate, (req, res) => {
  const project = db.prepare(`
    SELECT p.*, u.name as creator_name
    FROM projects p
    JOIN users u ON u.id = p.created_by
    WHERE p.id = ?
  `).get(req.params.id);

  if (!project) return res.status(404).json({ message: 'Project not found' });

  // Check access
  if (req.user.role !== 'admin') {
    const member = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!member) return res.status(403).json({ message: 'Access denied' });
  }

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role as system_role, pm.role as project_role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(req.params.id);

  res.json({ project, members });
});

// POST /api/projects - Admin only
router.post('/', authenticate, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Project name is required' });

  const result = db.prepare('INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)')
    .run(name, description || '', req.user.id);

  // Add creator as admin member
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
    .run(result.lastInsertRowid, req.user.id, 'admin');

  logActivity(req.user.id, 'created', 'project', result.lastInsertRowid, `Created project: ${name}`);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ message: 'Project created', project });
});

// PUT /api/projects/:id - Admin only
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?')
    .run(name || project.name, description !== undefined ? description : project.description, req.params.id);

  logActivity(req.user.id, 'updated', 'project', req.params.id, `Updated project: ${name || project.name}`);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json({ message: 'Project updated', project: updated });
});

// DELETE /api/projects/:id - Admin only
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  logActivity(req.user.id, 'deleted', 'project', req.params.id, `Deleted project: ${project.name}`);

  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:id/members - Admin only: add member
router.post('/:id/members', authenticate, requireAdmin, (req, res) => {
  const { userId, role } = req.body;
  if (!userId) return res.status(400).json({ message: 'User ID is required' });

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ message: 'Project not found' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(req.params.id, userId);
  if (existing) return res.status(409).json({ message: 'User is already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)')
    .run(req.params.id, userId, role || 'member');

  logActivity(req.user.id, 'added_member', 'project', req.params.id, `Added ${user.name} to project`);

  res.status(201).json({ message: 'Member added' });
});

// DELETE /api/projects/:id/members/:userId - Admin only: remove member
router.delete('/:id/members/:userId', authenticate, requireAdmin, (req, res) => {
  const member = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?')
    .get(req.params.id, req.params.userId);
  if (!member) return res.status(404).json({ message: 'Member not found' });

  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?')
    .run(req.params.id, req.params.userId);

  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.params.userId);
  logActivity(req.user.id, 'removed_member', 'project', req.params.id, `Removed ${user?.name} from project`);

  res.json({ message: 'Member removed' });
});

module.exports = router;
