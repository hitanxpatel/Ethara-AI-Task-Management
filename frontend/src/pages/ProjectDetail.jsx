import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  ArrowLeft, Plus, UserPlus, Trash2, X, Calendar, User, CheckSquare,
  Clock, AlertTriangle, Edit2
} from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

function TaskModal({ task, projectId, members, onClose, onSave }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    dueDate: task?.due_date || '',
    assignedTo: task?.assigned_to || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return setError('Title is required');
    setLoading(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        status: form.status,
        dueDate: form.dueDate || null,
        assignedTo: form.assignedTo || null,
        projectId
      };
      if (task) {
        await api.put(`/tasks/${task.id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title *</label>
            <input className="input" placeholder="Task title" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="Task description..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
              <select className="input" value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Due Date</label>
              <input type="date" className="input" value={form.dueDate}
                onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign to</label>
            <select className="input" value={form.assignedTo}
              onChange={e => setForm({ ...form, assignedTo: e.target.value })}>
              <option value="">Unassigned</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving…' : task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddMemberModal({ projectId, existingIds, onClose, onSave }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/users').then(res => {
      setUsers(res.data.users.filter(u => !existingIds.includes(u.id)));
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return setError('Please select a user');
    setLoading(true);
    try {
      await api.post(`/projects/${projectId}/members`, { userId: selectedUser });
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">Add Member</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Select User</label>
            <select className="input" value={selectedUser} onChange={e => setSelectedUser(e.target.value)}>
              <option value="">Choose a user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading || users.length === 0}>
              {loading ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TaskBadge({ status }) {
  if (status === 'todo') return <span className="badge-todo">To Do</span>;
  if (status === 'inprogress') return <span className="badge-inprogress">In Progress</span>;
  return <span className="badge-completed">Completed</span>;
}

const COLUMNS = [
  { key: 'todo', label: 'To Do', icon: Clock, color: 'text-gray-500', bg: 'bg-gray-50' },
  { key: 'inprogress', label: 'In Progress', icon: AlertTriangle, color: 'text-blue-500', bg: 'bg-blue-50' },
  { key: 'completed', label: 'Completed', icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-50' }
];

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModal, setTaskModal] = useState(null);
  const [memberModal, setMemberModal] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks');

  const fetchData = async () => {
    const [projRes, taskRes] = await Promise.all([
      api.get(`/projects/${id}`),
      api.get(`/tasks/project/${id}`)
    ]);
    setProject(projRes.data.project);
    setMembers(projRes.data.members);
    setTasks(taskRes.data.tasks);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${taskId}`);
    fetchData();
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member from the project?')) return;
    await api.delete(`/projects/${id}/members/${userId}`);
    fetchData();
  };

  const handleStatusChange = async (task, status) => {
    await api.put(`/tasks/${task.id}`, { status });
    fetchData();
  };

  const formatDate = (d) => {
    if (!d) return null;
    try {
      const parsed = parseISO(d);
      return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : d;
    } catch { return d; }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  if (!project) return <div className="p-6 text-gray-500">Project not found.</div>;

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = (t) => t.due_date && t.due_date < today && t.status !== 'completed';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-500 mt-1">{project.description}</p>}
          </div>
          {user?.role === 'admin' && (
            <button onClick={() => setTaskModal('create')} className="btn-primary flex items-center gap-2 flex-shrink-0">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {['tasks', 'members'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {tab} {tab === 'tasks' ? `(${tasks.length})` : `(${members.length})`}
          </button>
        ))}
      </div>

      {/* Tasks tab */}
      {activeTab === 'tasks' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key}>
                <div className={`flex items-center gap-2 px-3 py-2 rounded-t-lg ${col.bg} mb-3`}>
                  <col.icon className={`w-4 h-4 ${col.color}`} />
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="ml-auto text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded-full">
                    {colTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {colTasks.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                      No tasks
                    </div>
                  )}
                  {colTasks.map(task => (
                    <div key={task.id} className="card p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-medium text-gray-900 text-sm leading-snug flex-1">{task.title}</h3>
                        {user?.role === 'admin' && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button onClick={() => setTaskModal(task)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteTask(task.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{task.description}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {task.assignee_name && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {task.assignee_name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className={`flex items-center gap-1 ${isOverdue(task) ? 'text-red-500 font-medium' : ''}`}>
                            <Calendar className="w-3 h-3" /> {formatDate(task.due_date)}
                            {isOverdue(task) && ' · Overdue'}
                          </span>
                        )}
                      </div>
                      {/* Status changer for members */}
                      {user?.role === 'member' && task.assigned_to === user.id && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <select
                            className="input text-xs py-1"
                            value={task.status}
                            onChange={e => handleStatusChange(task, e.target.value)}
                          >
                            <option value="todo">To Do</option>
                            <option value="inprogress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Members tab */}
      {activeTab === 'members' && (
        <div>
          {user?.role === 'admin' && (
            <div className="flex justify-end mb-4">
              <button onClick={() => setMemberModal(true)} className="btn-primary flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Add Member
              </button>
            </div>
          )}
          <div className="card divide-y divide-gray-100">
            {members.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">No members yet</div>
            )}
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-4 p-4">
                <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 text-sm font-bold flex-shrink-0">
                  {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    member.system_role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {member.system_role}
                  </span>
                  {user?.role === 'admin' && member.id !== user.id && (
                    <button onClick={() => handleRemoveMember(member.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {taskModal && (
        <TaskModal
          task={taskModal === 'create' ? null : taskModal}
          projectId={parseInt(id)}
          members={members}
          onClose={() => setTaskModal(null)}
          onSave={() => { setTaskModal(null); fetchData(); }}
        />
      )}

      {memberModal && (
        <AddMemberModal
          projectId={id}
          existingIds={members.map(m => m.id)}
          onClose={() => setMemberModal(false)}
          onSave={() => { setMemberModal(false); fetchData(); }}
        />
      )}
    </div>
  );
}
