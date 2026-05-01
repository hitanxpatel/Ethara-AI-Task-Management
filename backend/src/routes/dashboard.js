const express = require('express');
const db = require('../database');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - Get dashboard stats for current user
router.get('/', authenticate, (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const userId = req.user.id;
  const isAdmin = req.user.role === 'admin';

  let stats;

  if (isAdmin) {
    const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get();
    const todoTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'todo'").get();
    const inProgressTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'inprogress'").get();
    const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed'").get();
    const overdueTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status != 'completed' AND due_date IS NOT NULL AND due_date < ?").get(today);
    const totalProjects = db.prepare('SELECT COUNT(*) as count FROM projects').get();
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();

    stats = {
      totalTasks: totalTasks.count,
      todoTasks: todoTasks.count,
      inProgressTasks: inProgressTasks.count,
      completedTasks: completedTasks.count,
      overdueTasks: overdueTasks.count,
      totalProjects: totalProjects.count,
      totalUsers: totalUsers.count
    };
  } else {
    const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?').get(userId);
    const todoTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'todo'").get(userId);
    const inProgressTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'inprogress'").get(userId);
    const completedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status = 'completed'").get(userId);
    const overdueTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ? AND status != 'completed' AND due_date IS NOT NULL AND due_date < ?").get(userId, today);
    const myProjects = db.prepare('SELECT COUNT(*) as count FROM project_members WHERE user_id = ?').get(userId);

    stats = {
      totalTasks: totalTasks.count,
      todoTasks: todoTasks.count,
      inProgressTasks: inProgressTasks.count,
      completedTasks: completedTasks.count,
      overdueTasks: overdueTasks.count,
      myProjects: myProjects.count
    };
  }

  // Recent tasks (for current user or all for admin)
  let recentTasks;
  if (isAdmin) {
    recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      ORDER BY t.updated_at DESC LIMIT 10
    `).all();
  } else {
    recentTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.assigned_to = ?
      ORDER BY t.updated_at DESC LIMIT 10
    `).all(userId);
  }

  // Overdue tasks detail
  let overdueTasks;
  if (isAdmin) {
    overdueTasks = db.prepare(`
      SELECT t.*, p.name as project_name, u.name as assignee_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.status != 'completed' AND t.due_date IS NOT NULL AND t.due_date < ?
      ORDER BY t.due_date ASC LIMIT 5
    `).all(today);
  } else {
    overdueTasks = db.prepare(`
      SELECT t.*, p.name as project_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      WHERE t.assigned_to = ? AND t.status != 'completed' AND t.due_date IS NOT NULL AND t.due_date < ?
      ORDER BY t.due_date ASC LIMIT 5
    `).all(userId, today);
  }

  // Activity logs
  let activities;
  if (isAdmin) {
    activities = db.prepare(`
      SELECT al.*, u.name as user_name
      FROM activity_logs al
      JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC LIMIT 10
    `).all();
  } else {
    activities = db.prepare(`
      SELECT al.*, u.name as user_name
      FROM activity_logs al
      JOIN users u ON u.id = al.user_id
      WHERE al.user_id = ?
      ORDER BY al.created_at DESC LIMIT 10
    `).all(userId);
  }

  res.json({ stats, recentTasks, overdueTasks, activities });
});

module.exports = router;
