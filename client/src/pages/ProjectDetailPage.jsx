import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Plus, Users, Search,
  LayoutGrid, List, UserPlus, UserMinus, Shield, Zap,
  TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import { TaskCard } from '../components/tasks/KanbanBoard';
import TaskForm from '../components/tasks/TaskForm';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  todo:       { color: '#7ab8d4', label: 'TO DO'       },
  inprogress: { color: '#00f5ff', label: 'IN PROGRESS' },
  done:       { color: '#00ff41', label: 'DONE'        }
};

const PRIORITY_CONFIG = {
  low:      { color: '#00ff41', label: 'LOW'      },
  medium:   { color: '#ffea00', label: 'MEDIUM'   },
  high:     { color: '#ff6b00', label: 'HIGH'     },
  critical: { color: '#ff0090', label: 'CRITICAL' }
};

// ── Task Assignment Analytics (admin) ────────────────────────────────────────
function TaskAssignmentAnalytics({ analytics, projectColor }) {
  const [expanded, setExpanded] = useState(null);

  if (!analytics || analytics.length === 0) return (
    <div style={{ textAlign: 'center', padding: 24, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
      NO TASK ASSIGNMENTS YET
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {analytics.map(task => {
        const total     = task.assigneeStatuses?.length || 0;
        const doneCount = task.assigneeStatuses?.filter(a => a.status === 'done').length || 0;
        const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0;
        const isOpen    = expanded === task.taskId;
        const pColor    = PRIORITY_CONFIG[task.priority]?.color || '#7ab8d4';
        const overdue   = task.dueDate && task.overallStatus !== 'done' && new Date(task.dueDate) < new Date();

        return (
          <div key={task.taskId} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', overflow: 'hidden', transition: 'border-color 0.2s' }}
            onMouseEnter={e => !isOpen && (e.currentTarget.style.borderColor = 'rgba(0,245,255,0.2)')}
            onMouseLeave={e => !isOpen && (e.currentTarget.style.borderColor = 'var(--border-dim)')}
          >
            {/* Task header row */}
            <button onClick={() => setExpanded(isOpen ? null : task.taskId)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>

              {/* Priority stripe */}
              <div style={{ width: 4, height: 36, borderRadius: 2, background: pColor, flexShrink: 0, boxShadow: `0 0 8px ${pColor}80` }} />

              {/* Title + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: pColor, letterSpacing: '1px' }}>{task.priority?.toUpperCase()}</span>
                  {task.dueDate && (
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: overdue ? 'var(--neon-pink)' : 'var(--text-muted)' }}>
                      DUE {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {overdue && ' ⚠'}
                    </span>
                  )}
                </div>
              </div>

              {/* Assignee count */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginBottom: 4 }}>
                  {total} {total === 1 ? 'operative' : 'operatives'}
                </div>

                {/* Mini progress bar */}
                <div style={{ width: 80, height: 4, background: 'var(--bg-hover)', borderRadius: 2, marginBottom: 2 }}>
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                    style={{ height: '100%', borderRadius: 2, background: pct === 100 ? 'var(--neon-green)' : projectColor || 'var(--neon-cyan)', boxShadow: `0 0 6px ${pct === 100 ? 'var(--neon-green)' : projectColor || 'var(--neon-cyan)'}60` }}
                  />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: pct === 100 ? 'var(--neon-green)' : 'var(--neon-cyan)' }}>
                  {doneCount}/{total} DONE
                </div>
              </div>

              {/* Expand toggle */}
              <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </button>

            {/* Expanded: per-user status rows */}
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}
                >
                  <div style={{ borderTop: '1px solid var(--border-dim)' }}>
                    {/* Column headers */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, padding: '8px 16px 6px', background: 'rgba(0,0,0,0.2)' }}>
                      {['OPERATIVE', 'STATUS', 'COMPLETED'].map((h, i) => (
                        <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px', textAlign: i > 0 ? 'center' : 'left' }}>{h}</div>
                      ))}
                    </div>

                    {(task.assigneeStatuses || []).map((as, i) => {
                      const user = as.user;
                      const sc   = STATUS_CONFIG[as.status] || STATUS_CONFIG.todo;
                      const name = user?.fullName || 'Unknown';
                      return (
                        <div key={user?._id?.toString() || i}
                          style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 12, padding: '10px 16px', alignItems: 'center', borderTop: '1px solid rgba(0,245,255,0.04)', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.03)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          {/* User */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                              background: `linear-gradient(135deg, ${sc.color}cc, ${sc.color}44)`,
                              border: `2px solid ${sc.color}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--bg-void)'
                            }}>
                              {name[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{name}</div>
                              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>{user?.email}</div>
                            </div>
                          </div>

                          {/* Status badge */}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '1px', padding: '3px 8px', borderRadius: 2, border: `1px solid ${sc.color}44`, color: sc.color, background: `${sc.color}11`, textAlign: 'center' }}>
                            {sc.label}
                          </span>

                          {/* Completed date */}
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: as.status === 'done' ? 'var(--neon-green)' : 'var(--text-muted)', textAlign: 'center', minWidth: 70 }}>
                            {as.completedAt
                              ? new Date(as.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : '—'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project,    setProject]    = useState(null);
  const [tasks,      setTasks]      = useState([]);
  const [analytics,  setAnalytics]  = useState([]);
  const [allUsers,   setAllUsers]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState('kanban');
  const [activeTab,  setActiveTab]  = useState('board');   // 'board' | 'analytics'
  const [search,     setSearch]     = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showTaskModal,    setShowTaskModal]    = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTask,     setSelectedTask]     = useState(null);
  const [taskDetailOpen,   setTaskDetailOpen]   = useState(false);
  const [deleteTarget,     setDeleteTarget]     = useState(null);
  const [creatingTask,     setCreatingTask]     = useState(false);
  const [addingMember,     setAddingMember]     = useState(false);
  const [newMemberEmail,   setNewMemberEmail]   = useState('');

  const myMemberRole  = project?.members?.find(m => m.user?._id === user._id)?.role;
  const isProjectAdmin = myMemberRole === 'admin' || user.role === 'admin';

  useEffect(() => {
    fetchProject();
    if (user.role === 'admin') fetchUsers();
  }, [id]);

  const fetchProject = async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data.project);
      setTasks(data.tasks);
      setAnalytics(data.taskAssignmentAnalytics || []);
    } catch {
      toast.error('Failed to load project');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setAllUsers(data.users);
    } catch {}
  };

  const handleCreateTask = async (formData) => {
    setCreatingTask(true);
    try {
      const { data } = await api.post('/tasks', { ...formData, project: id });
      setTasks(t => [data.task, ...t]);
      // Update analytics
      const newEntry = {
        taskId: data.task._id, title: data.task.title,
        priority: data.task.priority, dueDate: data.task.dueDate,
        overallStatus: data.task.status,
        assigneeStatuses: (data.task.userStatuses || [])
      };
      setAnalytics(a => [newEntry, ...a]);
      setShowTaskModal(false);
      toast.success('TASK DEPLOYED');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // If member, send as userStatus; if admin send as status
      const payload = user.role !== 'admin' ? { userStatus: newStatus } : { status: newStatus };
      const { data } = await api.put(`/tasks/${taskId}`, payload);
      setTasks(t => t.map(task => task._id === taskId ? { ...data.task, myStatus: data.task.myStatus || newStatus } : task));
      // Refresh analytics
      setAnalytics(a => a.map(entry =>
        entry.taskId === taskId
          ? { ...entry, overallStatus: data.task.status, assigneeStatuses: data.task.userStatuses || entry.assigneeStatuses }
          : entry
      ));
    } catch { toast.error('Failed to update status'); }
  };

  const handleTaskUpdated = (updatedTask) => {
    setTasks(t => t.map(task => task._id === updatedTask._id ? updatedTask : task));
    if (selectedTask?._id === updatedTask._id) setSelectedTask(updatedTask);
    setAnalytics(a => a.map(entry =>
      entry.taskId === updatedTask._id
        ? { ...entry, overallStatus: updatedTask.status, assigneeStatuses: updatedTask.userStatuses || entry.assigneeStatuses }
        : entry
    ));
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/tasks/${deleteTarget._id}`);
      setTasks(t => t.filter(task => task._id !== deleteTarget._id));
      setAnalytics(a => a.filter(e => e.taskId !== deleteTarget._id));
      toast.success('TASK TERMINATED');
    } catch { toast.error('Failed to delete task'); }
    finally { setDeleteTarget(null); }
  };

  const handleAddMember = async () => {
    const found = allUsers.find(u => u.email.toLowerCase() === newMemberEmail.toLowerCase());
    if (!found) return toast.error('User not found');
    setAddingMember(true);
    try {
      const { data } = await api.post(`/projects/${id}/members`, { userId: found._id });
      setProject(data.project);
      setNewMemberEmail('');
      toast.success('OPERATIVE ADDED');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add member'); }
    finally { setAddingMember(false); }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const { data } = await api.delete(`/projects/${id}/members/${userId}`);
      setProject(data.project);
      toast.success('OPERATIVE REMOVED');
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to remove member'); }
  };

  const filteredTasks = tasks.filter(t => {
    const matchSearch   = !search || t.title.toLowerCase().includes(search.toLowerCase());
    const matchPriority = !priorityFilter || t.priority === priorityFilter;
    return matchSearch && matchPriority;
  });

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="cyber-spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px' }}>LOADING PROJECT...</div>
      </div>
    </div>
  );

  if (!project) return null;

  const PRIORITIES = ['', 'low', 'medium', 'high', 'critical'];
  const PRIORITY_LABELS = { '': 'ALL', low: 'LOW', medium: 'MED', high: 'HIGH', critical: 'CRIT' };
  const PRIORITY_COLORS = { '': '#7ab8d4', low: '#00ff41', medium: '#ffea00', high: '#ff6b00', critical: '#ff0090' };

  // Per-member summary for stats
  const memberSummary = project.members?.map(m => {
    const uid     = m.user?._id;
    const myTasks = analytics.filter(a => a.assigneeStatuses?.some(as => (as.user?._id || as.user)?.toString() === uid?.toString()));
    const done    = myTasks.filter(a => a.assigneeStatuses?.find(as => (as.user?._id || as.user)?.toString() === uid?.toString())?.status === 'done').length;
    return { ...m, taskTotal: myTasks.length, taskDone: done };
  }) || [];

  return (
    <div style={{ padding: 32 }}>
      {/* Back button */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <button onClick={() => navigate('/projects')} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', marginBottom: 16, padding: 0, transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--neon-cyan)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={14} /> BACK TO PROJECTS
        </button>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: project.color, boxShadow: `0 0 8px ${project.color}` }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: project.color, letterSpacing: '2px' }}>PROJECT NEXUS</span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '2px' }}>{project.name}</h1>
            {project.description && <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', marginTop: 4 }}>{project.description}</p>}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => setShowMembersModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', color: 'var(--neon-cyan)', transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <Users size={13} /> TEAM ({project.members?.length || 0})
            </button>
            {isProjectAdmin && (
              <button onClick={() => setShowTaskModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--neon-cyan)', border: 'none', borderRadius: 'var(--radius-sm)', padding: '10px 16px', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '2px', color: 'var(--bg-void)', boxShadow: '0 0 20px rgba(0,245,255,0.3)' }}>
                <Plus size={13} /> ADD TASK
              </button>
            )}
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'flex', gap: 20, marginTop: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'TASKS', value: tasks.length, color: 'var(--text-secondary)' },
            { label: 'TO DO', value: tasks.filter(t => t.status === 'todo').length, color: '#7ab8d4' },
            { label: 'IN PROGRESS', value: tasks.filter(t => t.status === 'inprogress').length, color: 'var(--neon-cyan)' },
            { label: 'DONE', value: tasks.filter(t => t.status === 'done').length, color: '#00ff41' },
            { label: 'OVERDUE', value: tasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length, color: '#ff0090' }
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 900, color }}>{value}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px' }}>{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Tabs (admin gets Analytics tab) */}
      {isProjectAdmin && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: 4, width: 'fit-content' }}>
          {[
            { id: 'board',     icon: LayoutGrid,  label: 'BOARD'     },
            { id: 'analytics', icon: TrendingUp,   label: 'ANALYTICS' }
          ].map(({ id: tabId, icon: Icon, label }) => (
            <button key={tabId} onClick={() => setActiveTab(tabId)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              background: activeTab === tabId ? 'rgba(0,245,255,0.12)' : 'transparent',
              border: `1px solid ${activeTab === tabId ? 'rgba(0,245,255,0.3)' : 'transparent'}`,
              borderRadius: 'var(--radius-sm)', cursor: 'pointer',
              color: activeTab === tabId ? 'var(--neon-cyan)' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1.5px',
              transition: 'all 0.15s'
            }}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      )}

      {/* ── ANALYTICS TAB (admin) ──────────────────────────────────────────── */}
      {activeTab === 'analytics' && isProjectAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {/* Member summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
            {memberSummary.map(m => {
              const pct = m.taskTotal > 0 ? Math.round((m.taskDone / m.taskTotal) * 100) : 0;
              return (
                <div key={m.user?._id} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--bg-void)' }}>
                      {m.user?.fullName?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.user?.fullName}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: m.role === 'admin' ? 'var(--neon-pink)' : 'var(--text-muted)', letterSpacing: '1px' }}>{m.role?.toUpperCase()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{m.taskDone}/{m.taskTotal} tasks</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: pct === 100 ? 'var(--neon-green)' : 'var(--neon-cyan)' }}>{pct}%</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2 }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }}
                      style={{ height: '100%', borderRadius: 2, background: pct === 100 ? 'var(--neon-green)' : project.color, boxShadow: `0 0 6px ${pct === 100 ? 'var(--neon-green)' : project.color}60` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Task breakdown accordion */}
          <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <TrendingUp size={14} color="var(--neon-cyan)" />
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>
                TASK → OPERATIVE STATUS BREAKDOWN
              </h3>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                {analytics.length} tasks
              </span>
            </div>
            <TaskAssignmentAnalytics analytics={analytics} projectColor={project.color} />
          </div>
        </motion.div>
      )}

      {/* ── BOARD TAB ─────────────────────────────────────────────────────── */}
      {activeTab === 'board' && (
        <>
          {/* Toolbar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input className="cyber-input" style={{ paddingLeft: 34 }} placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => setPriorityFilter(p)} style={{
                  padding: '7px 10px', cursor: 'pointer',
                  background: priorityFilter === p ? `${PRIORITY_COLORS[p]}15` : 'transparent',
                  border: `1px solid ${priorityFilter === p ? PRIORITY_COLORS[p] : 'var(--border-dim)'}`,
                  borderRadius: 'var(--radius-sm)', color: priorityFilter === p ? PRIORITY_COLORS[p] : 'var(--text-muted)',
                  fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1px', transition: 'all 0.15s'
                }}>
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
              {[{ id: 'kanban', icon: LayoutGrid }, { id: 'list', icon: List }].map(({ id: vId, icon: Icon }) => (
                <button key={vId} onClick={() => setView(vId)} style={{ padding: '6px 10px', background: view === vId ? 'rgba(0,245,255,0.12)' : 'transparent', border: `1px solid ${view === vId ? 'rgba(0,245,255,0.3)' : 'transparent'}`, borderRadius: 4, cursor: 'pointer', color: view === vId ? 'var(--neon-cyan)' : 'var(--text-muted)', display: 'flex', transition: 'all 0.15s' }}>
                  <Icon size={14} />
                </button>
              ))}
            </div>
          </div>

          {filteredTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <Zap size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--text-muted)', letterSpacing: '2px' }}>
                {search || priorityFilter ? 'NO TASKS MATCH FILTERS' : 'NO TASKS YET'}
              </div>
            </div>
          ) : view === 'kanban' ? (
            <KanbanBoard tasks={filteredTasks} onStatusChange={handleStatusChange}
              onDelete={(task) => setDeleteTarget(task)}
              userRole={user.role} projectMemberRole={myMemberRole}
              onTaskClick={(task) => { setSelectedTask(task); setTaskDetailOpen(true); }}
              currentUserId={user._id}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredTasks.map(task => (
                <TaskCard key={task._id} task={task}
                  onDelete={(t) => setDeleteTarget(t)}
                  onStatusChange={handleStatusChange}
                  userRole={user.role} projectMemberRole={myMemberRole}
                  onClick={(t) => { setSelectedTask(t); setTaskDetailOpen(true); }}
                  currentUserId={user._id}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <Modal isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} title="DEPLOY NEW TASK">
        <TaskForm onSubmit={handleCreateTask} members={project.members} loading={creatingTask} submitLabel="DEPLOY TASK" isAdmin={isProjectAdmin} />
      </Modal>

      <TaskDetailModal task={selectedTask} isOpen={taskDetailOpen}
        onClose={() => { setTaskDetailOpen(false); setSelectedTask(null); }}
        onUpdated={handleTaskUpdated} members={project.members}
        userRole={user.role} projectMemberRole={myMemberRole}
        currentUserId={user._id}
      />

      <Modal isOpen={showMembersModal} onClose={() => setShowMembersModal(false)} title="TEAM OPERATIVES" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isProjectAdmin && user.role === 'admin' && (
            <div style={{ background: 'rgba(0,245,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', marginBottom: 10 }}>ADD OPERATIVE</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input className="cyber-input" placeholder="Email address..." value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddMember()} style={{ flex: 1 }} />
                <button onClick={handleAddMember} disabled={addingMember || !newMemberEmail} style={{ padding: '10px 16px', background: 'var(--neon-cyan)', border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '1px', color: 'var(--bg-void)', opacity: addingMember || !newMemberEmail ? 0.5 : 1 }}>
                  <UserPlus size={14} />
                </button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {project.members?.map(member => {
              const ms = memberSummary.find(m => m.user?._id === member.user?._id);
              const pct = ms?.taskTotal > 0 ? Math.round((ms.taskDone / ms.taskTotal) * 100) : 0;
              return (
                <div key={member.user?._id} style={{ padding: '12px 14px', background: 'rgba(0,245,255,0.02)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: ms?.taskTotal > 0 ? 10 : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, color: 'var(--bg-void)' }}>
                        {member.user?.fullName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{member.user?.fullName}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>{member.user?.email}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {ms?.taskTotal > 0 && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                          {ms.taskDone}/{ms.taskTotal} done
                        </span>
                      )}
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1px', padding: '3px 8px', borderRadius: 2, border: `1px solid ${member.role === 'admin' ? 'rgba(255,0,144,0.4)' : 'var(--border-dim)'}`, color: member.role === 'admin' ? 'var(--neon-pink)' : 'var(--text-muted)', background: member.role === 'admin' ? 'rgba(255,0,144,0.08)' : 'transparent', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {member.role === 'admin' && <Shield size={9} />} {member.role?.toUpperCase()}
                      </span>
                      {isProjectAdmin && member.user?._id !== user._id && (
                        <button onClick={() => handleRemoveMember(member.user?._id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--neon-pink)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                        ><UserMinus size={14} /></button>
                      )}
                    </div>
                  </div>
                  {ms?.taskTotal > 0 && (
                    <div style={{ height: 3, background: 'var(--bg-hover)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: `${pct}%`, borderRadius: 2, background: pct === 100 ? 'var(--neon-green)' : 'var(--neon-cyan)', transition: 'width 0.5s', boxShadow: `0 0 6px ${pct === 100 ? 'var(--neon-green)' : 'var(--neon-cyan)'}60` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="DELETE TASK" size="sm">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--neon-pink)', marginBottom: 20 }}>"{deleteTarget?.title}"</div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', cursor: 'pointer' }}>ABORT</button>
            <button onClick={handleDeleteTask} style={{ flex: 1, padding: '12px', background: 'rgba(255,0,144,0.12)', border: '1px solid var(--neon-pink)', borderRadius: 'var(--radius-sm)', color: 'var(--neon-pink)', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', cursor: 'pointer', fontWeight: 700 }}>DELETE</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
