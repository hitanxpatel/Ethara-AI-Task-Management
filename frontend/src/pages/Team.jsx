import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { Users, Mail, Shield, User } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';

export default function Team() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users').then(res => {
      setUsers(res.data.users);
      setLoading(false);
    });
  }, []);

  const formatDate = (d) => {
    if (!d) return '—';
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

  const admins = users.filter(u => u.role === 'admin');
  const members = users.filter(u => u.role === 'member');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-gray-500 mt-1">{users.length} total members</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
            <p className="text-sm text-gray-500">Admins</p>
          </div>
        </div>
        <div className="card p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{members.length}</p>
            <p className="text-sm text-gray-500">Members</p>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">All Users</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {users.map(user => (
            <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-indigo-100 text-indigo-700">
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{user.name}</p>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> {user.email}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                  user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {user.role}
                </span>
                <p className="text-xs text-gray-400 mt-1">Joined {formatDate(user.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
