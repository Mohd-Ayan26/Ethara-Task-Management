import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FolderOpen, Users, CheckCircle, AlertTriangle, Search, Trash2, Settings, Zap } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const PROJECT_COLORS = ['#00f5ff', '#ff0090', '#bf00ff', '#00ff41', '#ffea00', '#ff6b00'];

const ProjectCard = ({ project, onDelete, onNavigate, userRole }) => {
  const { stats = {} } = project;
  const completionPct = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      onClick={() => onNavigate(project._id)}
      style={{
        background: 'var(--bg-panel)',
        border: `1px solid ${project.color}22`,
        borderRadius: 'var(--radius-lg)',
        padding: 24, cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = project.color + '44';
        e.currentTarget.style.boxShadow = `0 0 20px ${project.color}10`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = project.color + '22';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Color accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${project.color}, transparent)`
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700,
            color: 'var(--text-primary)', letterSpacing: '1px', marginBottom: 4
          }}>
            {project.name}
          </h3>
          <p style={{
            fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)',
            lineHeight: 1.4, maxHeight: 38, overflow: 'hidden'
          }}>
            {project.description || 'No description'}
          </p>
        </div>
        {userRole === 'admin' && (
          <button
            onClick={e => { e.stopPropagation(); onDelete(project); }}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 4, borderRadius: 4,
              flexShrink: 0, marginLeft: 8
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--neon-pink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>PROGRESS</span>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: project.color }}>{completionPct}%</span>
        </div>
        <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2 }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPct}%` }}
            transition={{ duration: 0.8, delay: 0.2 }}
            style={{ height: '100%', background: project.color, borderRadius: 2, boxShadow: `0 0 8px ${project.color}80` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={12} color="var(--text-muted)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {project.members?.length || 0}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CheckCircle size={12} color="var(--neon-green)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-secondary)' }}>
            {stats.completed || 0}/{stats.total || 0}
          </span>
        </div>
        {stats.overdue > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={12} color="var(--neon-pink)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--neon-pink)' }}>
              {stats.overdue}
            </span>
          </div>
        )}
      </div>

      {/* Members avatars */}
      <div style={{ display: 'flex', marginTop: 16, alignItems: 'center' }}>
        {project.members?.slice(0, 5).map((member, i) => (
          <div key={member.user?._id || i} title={member.user?.fullName} style={{
            width: 24, height: 24, borderRadius: '50%',
            background: `linear-gradient(135deg, ${project.color}, ${project.color}66)`,
            border: '2px solid var(--bg-panel)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700,
            color: 'var(--bg-void)', marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i
          }}>
            {member.user?.fullName?.[0]?.toUpperCase() || '?'}
          </div>
        ))}
        {project.members?.length > 5 && (
          <div style={{
            width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-hover)',
            border: '2px solid var(--bg-panel)', marginLeft: -8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)'
          }}>
            +{project.members.length - 5}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#00f5ff', dueDate: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Project name required');
    setCreating(true);
    try {
      const { data } = await api.post('/projects', form);
      setProjects(p => [data.project, ...p]);
      setShowModal(false);
      setForm({ name: '', description: '', color: '#00f5ff', dueDate: '' });
      toast.success('PROJECT INITIALIZED');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/projects/${deleteTarget._id}`);
      setProjects(p => p.filter(proj => proj._id !== deleteTarget._id));
      toast.success('PROJECT TERMINATED');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete project');
    } finally {
      setDeleteTarget(null);
    }
  };

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="cyber-spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px' }}>LOADING PROJECTS...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <FolderOpen size={20} color="var(--neon-cyan)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>PROJECT NEXUS</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '2px' }}>
            PROJECTS
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', marginTop: 4 }}>
            {projects.length} active operations
          </p>
        </div>
        <button onClick={() => setShowModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--neon-cyan)', border: 'none',
          borderRadius: 'var(--radius-sm)', padding: '12px 20px',
          fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
          letterSpacing: '2px', color: 'var(--bg-void)', cursor: 'pointer',
          boxShadow: '0 0 20px rgba(0,245,255,0.3)'
        }}>
          <Plus size={14} />
          NEW PROJECT
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 400, marginBottom: 24 }}>
        <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          className="cyber-input"
          style={{ paddingLeft: 36 }}
          placeholder="Search projects..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <FolderOpen size={48} color="var(--text-muted)" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
            {search ? 'NO MATCHES FOUND' : 'NO PROJECTS YET'}
          </div>
          {!search && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)', marginTop: 8 }}>
              Create your first project to get started
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          <AnimatePresence>
            {filtered.map(project => (
              <ProjectCard
                key={project._id}
                project={project}
                userRole={user.role}
                onNavigate={(id) => navigate(`/projects/${id}`)}
                onDelete={(p) => setDeleteTarget(p)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="INITIALIZE PROJECT">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8 }}>
              PROJECT NAME *
            </label>
            <input className="cyber-input" placeholder="Mission designation" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8 }}>
              DESCRIPTION
            </label>
            <textarea
              className="cyber-input"
              rows={3}
              placeholder="Operational briefing..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8 }}>
              PROJECT COLOR
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {PROJECT_COLORS.map(color => (
                <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))} style={{
                  width: 32, height: 32, borderRadius: '50%', background: color,
                  border: form.color === color ? `3px solid white` : '3px solid transparent',
                  cursor: 'pointer', boxShadow: form.color === color ? `0 0 12px ${color}` : 'none'
                }} />
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8 }}>
              TARGET DATE
            </label>
            <input type="date" className="cyber-input" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="button" onClick={() => setShowModal(false)} style={{
              flex: 1, padding: '12px', background: 'transparent',
              border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '11px',
              letterSpacing: '2px', cursor: 'pointer'
            }}>
              ABORT
            </button>
            <button type="submit" disabled={creating} style={{
              flex: 1, padding: '12px', background: 'var(--neon-cyan)', border: 'none',
              borderRadius: 'var(--radius-sm)', color: 'var(--bg-void)',
              fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
              letterSpacing: '2px', cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.7 : 1
            }}>
              {creating ? 'CREATING...' : 'DEPLOY'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="CONFIRM TERMINATION" size="sm">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 8 }}>
            This will permanently delete
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--neon-pink)', marginBottom: 8 }}>
            "{deleteTarget?.name}"
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 24 }}>
            and all associated tasks. This cannot be undone.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setDeleteTarget(null)} style={{
              flex: 1, padding: '12px', background: 'transparent',
              border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '11px',
              letterSpacing: '2px', cursor: 'pointer'
            }}>ABORT</button>
            <button onClick={handleDelete} style={{
              flex: 1, padding: '12px', background: 'rgba(255,0,144,0.15)',
              border: '1px solid var(--neon-pink)', borderRadius: 'var(--radius-sm)',
              color: 'var(--neon-pink)', fontFamily: 'var(--font-display)', fontSize: '11px',
              letterSpacing: '2px', cursor: 'pointer', fontWeight: 700
            }}>TERMINATE</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
