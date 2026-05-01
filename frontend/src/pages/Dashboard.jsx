import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import {
  CheckSquare, Clock, AlertTriangle, FolderKanban, Users, TrendingUp,
  ArrowRight, Calendar
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format, parseISO, isValid } from 'date-fns';

const COLORS = ['#94a3b8', '#3b82f6', '#22c55e'];

function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${bg}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function TaskBadge({ status, dueDate }) {
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = dueDate && dueDate < today && status !== 'completed';
  if (isOverdue) return <span className="badge-overdue">Overdue</span>;
  if (status === 'todo') return <span className="badge-todo">To Do</span>;
  if (status === 'inprogress') return <span className="badge-inprogress">In Progress</span>;
  return <span className="badge-completed">Completed</span>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  if (!data) return null;

  const { stats, recentTasks, overdueTasks, activities } = data;

  const pieData = [
    { name: 'To Do', value: stats.todoTasks },
    { name: 'In Progress', value: stats.inProgressTasks },
    { name: 'Completed', value: stats.completedTasks }
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = parseISO(dateStr);
      return isValid(d) ? format(d, 'MMM d') : dateStr;
    } catch {
      return dateStr;
    }
  };

  const formatActivity = (a) => {
    const map = { created: 'Created', updated: 'Updated', deleted: 'Deleted', added_member: 'Added member to', removed_member: 'Removed member from' };
    return `${map[a.action] || a.action} ${a.entity_type}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's what's happening with your tasks today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={CheckSquare} label="Total Tasks" value={stats.totalTasks} color="text-indigo-600" bg="bg-indigo-50" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgressTasks} color="text-blue-600" bg="bg-blue-50" />
        <StatCard icon={TrendingUp} label="Completed" value={stats.completedTasks} color="text-green-600" bg="bg-green-50" />
        <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdueTasks} color="text-red-600" bg="bg-red-50" />
      </div>

      {user?.role === 'admin' && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard icon={FolderKanban} label="Total Projects" value={stats.totalProjects} color="text-purple-600" bg="bg-purple-50" />
          <StatCard icon={Users} label="Team Members" value={stats.totalUsers} color="text-orange-600" bg="bg-orange-50" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Task distribution chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Task Status</h2>
          {stats.totalTasks > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No tasks yet</div>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-xs text-gray-500">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Overdue Tasks</h2>
            <span className="badge-overdue">{stats.overdueTasks}</span>
          </div>
          {overdueTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <CheckSquare className="w-8 h-8 text-green-400 mb-2" />
              <p className="text-sm text-gray-500">No overdue tasks!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overdueTasks.map(task => (
                <div key={task.id} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500">{task.project_name} · Due {formatDate(task.due_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Recent Activity</h2>
          {activities.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm">No activity yet</div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 6).map(a => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700 truncate">{a.details || formatActivity(a)}</p>
                    <p className="text-xs text-gray-400">{a.user_name} · {formatDate(a.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent tasks table */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Recent Tasks</h2>
          <Link to="/tasks" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {recentTasks.length === 0 ? (
          <div className="h-24 flex items-center justify-center text-gray-400 text-sm">No tasks yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-medium">Task</th>
                  <th className="pb-3 font-medium hidden sm:table-cell">Project</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Assignee</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Due Date</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentTasks.slice(0, 8).map(task => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="py-3 pr-4">
                      <span className="font-medium text-gray-900 line-clamp-1">{task.title}</span>
                    </td>
                    <td className="py-3 pr-4 text-gray-500 hidden sm:table-cell">{task.project_name}</td>
                    <td className="py-3 pr-4 text-gray-500 hidden md:table-cell">{task.assignee_name || '—'}</td>
                    <td className="py-3 pr-4 text-gray-500 hidden md:table-cell">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(task.due_date)}
                      </span>
                    </td>
                    <td className="py-3">
                      <TaskBadge status={task.status} dueDate={task.due_date} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
