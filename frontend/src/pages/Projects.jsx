import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Plus, FolderKanban, Users, CheckSquare, Trash2, Edit2, X, ArrowRight } from 'lucide-react';

function ProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState({ name: project?.name || '', description: project?.description || '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    setLoading(true);
    try {
      if (project) {
        await api.put(`/projects/${project.id}`, form);
      } else {
        await api.post('/projects', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
            <input className="input" placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea className="input resize-none" rows={3} placeholder="Brief description..."
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving…' : project ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | project object

  const fetchProjects = () => {
    api.get('/projects').then(res => {
      setProjects(res.data.projects);
      setLoading(false);
    });
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this project? All tasks inside will be removed.')) return;
    await api.delete(`/projects/${id}`);
    fetchProjects();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderKanban className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-1">No projects yet</h3>
          <p className="text-sm text-gray-500">
            {user?.role === 'admin' ? 'Create your first project to get started.' : "You haven't been added to any projects yet."}
          </p>
          {user?.role === 'admin' && (
            <button onClick={() => setModal('create')} className="btn-primary mt-4 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map(project => (
            <div key={project.id} className="card p-5 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FolderKanban className="w-5 h-5 text-indigo-600" />
                </div>
                {user?.role === 'admin' && (
                  <div className="flex gap-1">
                    <button onClick={() => setModal(project)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(project.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-gray-500 mb-4 line-clamp-2 flex-1">{project.description}</p>
              )}

              <div className="flex items-center gap-4 mt-auto pt-4 border-t border-gray-100 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{project.member_count} members</span>
                <span className="flex items-center gap-1"><CheckSquare className="w-3.5 h-3.5" />{project.task_count} tasks</span>
              </div>

              <Link to={`/projects/${project.id}`}
                className="mt-3 flex items-center justify-center gap-1 text-sm text-indigo-600 font-medium hover:underline">
                Open project <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <ProjectModal
          project={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchProjects(); }}
        />
      )}
    </div>
  );
}
