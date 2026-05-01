require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./database');

console.log('Seeding database...');

// Clear existing data
db.exec('DELETE FROM activity_logs; DELETE FROM tasks; DELETE FROM project_members; DELETE FROM projects; DELETE FROM users;');

// Create users
const adminPass = bcrypt.hashSync('admin123', 10);
const memberPass = bcrypt.hashSync('member123', 10);

const adminId = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Alice Admin', 'admin@demo.com', adminPass, 'admin').lastInsertRowid;
const member1Id = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Bob Developer', 'member@demo.com', memberPass, 'member').lastInsertRowid;
const member2Id = db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run('Carol Designer', 'carol@demo.com', memberPass, 'member').lastInsertRowid;

// Create projects
const proj1Id = db.prepare('INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)').run('Website Redesign', 'Modernize our company website with new branding and improved UX.', adminId).lastInsertRowid;
const proj2Id = db.prepare('INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)').run('Mobile App', 'Build iOS and Android app for our product.', adminId).lastInsertRowid;

// Add members
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(proj1Id, adminId, 'admin');
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(proj1Id, member1Id, 'member');
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(proj1Id, member2Id, 'member');
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(proj2Id, adminId, 'admin');
db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(proj2Id, member1Id, 'member');

// Create tasks (some overdue for demo)
const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 2);
const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7);
const fmt = d => d.toISOString().split('T')[0];

db.prepare('INSERT INTO tasks (title, description, status, due_date, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Design new homepage mockups', 'Create Figma mockups for the new homepage', 'inprogress', fmt(nextWeek), proj1Id, member2Id, adminId);
db.prepare('INSERT INTO tasks (title, description, status, due_date, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Update navigation menu', 'Implement new navigation as per designs', 'todo', fmt(nextWeek), proj1Id, member1Id, adminId);
db.prepare('INSERT INTO tasks (title, description, status, due_date, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Write homepage copy', 'Copywriting for the new homepage sections', 'completed', fmt(yesterday), proj1Id, member2Id, adminId);
db.prepare('INSERT INTO tasks (title, description, status, due_date, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Set up CI/CD pipeline', 'Configure GitHub Actions for automated deployment', 'todo', fmt(yesterday), proj1Id, member1Id, adminId);
db.prepare('INSERT INTO tasks (title, description, status, due_date, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Design app wireframes', 'Wireframes for all app screens', 'completed', fmt(yesterday), proj2Id, member2Id, adminId);
db.prepare('INSERT INTO tasks (title, description, status, due_date, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run('Set up React Native project', 'Initialize project with Expo and configure navigation', 'inprogress', fmt(nextWeek), proj2Id, member1Id, adminId);
db.prepare('INSERT INTO tasks (title, description, status, due_date, project_id, assigned_to, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run('API integration', 'Connect mobile app to backend REST APIs', 'todo', fmt(yesterday), proj2Id, member1Id, adminId);

console.log('✅ Seed complete!');
console.log('   Admin:  admin@demo.com / admin123');
console.log('   Member: member@demo.com / member123');
console.log('   Member: carol@demo.com  / member123');
