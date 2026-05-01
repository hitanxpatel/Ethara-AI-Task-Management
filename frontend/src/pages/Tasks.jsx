import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Calendar, User, Filter, CheckSquare, Clock, AlertTriangle, Search } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

function TaskBadge({ status, dueDate }) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = dueDate && dueDate < today && status !== 'completed';
  if (isOverdue) return <span className="badge-overdue">Overdue</span>;
  if (status === 'todo') return <span className="badge-todo">To Do</span>;
  if (status === 'inprogress') return <span className="badge-inprogress">In Progress</span>;
  return <span className="badge-completed">Completed</span>;
}

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const fetchTasks = () => {
    const endpoint = user?.role === 'admin' ? '/tasks' : '/tasks/my';
    api.get(endpoint).then(res => {
      setTasks(res.data.tasks);
      setLoading(false);
    });
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleStatusChange = async (taskId, status) => {
    await api.put(`/tasks/${taskId}`, { status });
    fetchTasks();
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try {
      const parsed = parseISO(d);
      return isValid(parsed) ? format(parsed, 'MMM d, yyyy') : d;
    } catch { return d; }
  };

  const today = new Date().toISOString().split('T')[0];
  const isOverdue = (t) => t.due_date && t.due_date < today && t.status !== 'completed';

  const filtered = tasks.filter(t => {
    const matchFilter =
      filter === 'all' ||
      (filter === 'todo' && t.status === 'todo') ||
      (filter === 'inprogress' && t.status === 'inprogress') ||
      (filter === 'completed' && t.status === 'completed') ||
      (filter === 'overdue' && isOverdue(t));
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
      || (t.project_name || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inprogress: tasks.filter(t => t.status === 'inprogress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(isOverdue).length
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {user?.role === 'admin' ? 'All Tasks' : 'My Tasks'}
        </h1>
        <p className="text-gray-500 mt-1">{tasks.length} task{tasks.length !== 1 ? 's' : ''} total</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search tasks..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'todo', label: 'To Do' },
            { key: 'inprogress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' },
            { key: 'overdue', label: 'Overdue' }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? f.key === 'overdue'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-indigo-100 text-indigo-700'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
              {counts[f.key] > 0 && (
                <span className="ml-1.5 text-xs opacity-70">{counts[f.key]}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-1">No tasks found</h3>
          <p className="text-sm text-gray-500">
            {search ? 'Try a different search term.' : 'No tasks match this filter.'}
          </p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {filtered.map(task => (
            <div key={task.id} className={`p-4 sm:p-5 hover:bg-gray-50 transition-colors ${isOverdue(task) ? 'bg-red-50/30' : ''}`}>
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-3 mb-2">
                    <h3 className="font-medium text-gray-900 leading-snug">{task.title}</h3>
                    <div className="flex-shrink-0">
                      <TaskBadge status={task.status} dueDate={task.due_date} />
                    </div>
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1 font-medium text-indigo-600">
                      {task.project_name}
                    </span>
                    {task.assignee_name && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {task.assignee_name}
                      </span>
                    )}
                    {task.due_date && (
                      <span className={`flex items-center gap-1 ${isOverdue(task) ? 'text-red-500 font-medium' : ''}`}>
                        <Calendar className="w-3 h-3" /> {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Status update for assigned member or admin */}
                {(user?.role === 'admin' || task.assigned_to === user?.id) && (
                  <div className="flex-shrink-0">
                    <select
                      className="input text-xs py-1.5 min-w-[120px]"
                      value={task.status}
                      onChange={e => handleStatusChange(task.id, e.target.value)}
                    >
                      <option value="todo">To Do</option>
                      <option value="inprogress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
