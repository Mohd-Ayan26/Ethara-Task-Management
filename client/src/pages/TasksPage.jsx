import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckSquare, Search, SlidersHorizontal, Plus, AlertCircle, Zap,
  ChevronDown, Users, Flag, Calendar
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { TaskCard } from '../components/tasks/KanbanBoard';
import { KanbanBoard } from '../components/tasks/KanbanBoard';
import TaskDetailModal from '../components/tasks/TaskDetailModal';
import TaskForm from '../components/tasks/TaskForm';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = { low: '#00ff41', medium: '#ffea00', high: '#ff6b00', critical: '#ff0090' };
const STATUS_COLORS   = { todo: '#7ab8d4', inprogress: '#00f5ff', done: '#00ff41' };
const STATUS_LABELS   = { todo: 'TO DO', inprogress: 'IN PROGRESS', done: 'DONE' };

// ── FilterBtn ─────────────────────────────────────────────────────────────────
const FilterBtn = ({ label, active, color, onClick }) => (
  <button onClick={onClick} style={{
    padding: '6px 12px', cursor: 'pointer', transition: 'all 0.15s',
    background: active ? `${color}15` : 'transparent',
    border: `1px solid ${active ? color : 'var(--border-dim)'}`,
    borderRadius: 'var(--radius-sm)', color: active ? color : 'var(--text-muted)',
    fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1px', whiteSpace: 'nowrap'
  }}>
    {label}
  </button>
);

// ── Project selector with member loading ──────────────────────────────────────
function ProjectSelector({ projects, value, onChange, onMembersChange }) {
  const handleChange = (e) => {
    const pid = e.target.value;
    onChange(pid);
    // Propagate that project's member list up
    const proj = projects.find(p => p._id === pid);
    onMembersChange(proj?.members || []);
  };
  return (
    <div>
      <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8 }}>
        PROJECT *
      </label>
      <div style={{ position: 'relative' }}>
        <ChevronDown size={12} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <select
          className="cyber-input"
          style={{ appearance: 'none', paddingRight: 32, cursor: 'pointer' }}
          value={value}
          onChange={handleChange}
        >
          <option value="">Select project…</option>
          {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>
      </div>
    </div>
  );
}

// ── Member status indicator for list rows ─────────────────────────────────────
function AssigneePills({ task, currentUserId, isAdmin }) {
  const list = task.assignees?.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : []);
  if (!list.length) return null;

  const getUserStatus = (uid) => {
    const entry = (task.userStatuses || []).find(us =>
      (us.user?._id || us.user)?.toString() === uid?.toString()
    );
    return entry?.status || 'todo';
  };

  return (
    <div style={{ display: 'flex', flexShrink: 0, alignItems: 'center' }}>
      {list.slice(0, 4).map((a, i) => {
        const uid = a._id || a;
        const uStatus = isAdmin ? getUserStatus(uid) : (task.myStatus || task.status);
        const color = STATUS_COLORS[uStatus] || '#7ab8d4';
        const isMe = uid?.toString() === currentUserId?.toString();
        return (
          <div key={uid?.toString() || i} title={`${a.fullName || '?'} — ${uStatus}`}
            style={{ position: 'relative', marginLeft: i > 0 ? -6 : 0, zIndex: 4 - i }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: `linear-gradient(135deg, ${color}cc, ${color}44)`,
              border: `2px solid ${isMe ? color : 'var(--bg-panel)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, color: 'var(--bg-void)',
              boxShadow: isMe ? `0 0 8px ${color}80` : 'none'
            }}>
              {(a.fullName || '?')[0]?.toUpperCase()}
            </div>
            {/* tiny status dot */}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 7, height: 7, borderRadius: '50%', background: color, border: '1.5px solid var(--bg-panel)', boxShadow: `0 0 4px ${color}` }} />
          </div>
        );
      })}
      {list.length > 4 && (
        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-hover)', border: '2px solid var(--bg-panel)', marginLeft: -6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
          +{list.length - 4}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const { user } = useAuth();
  const isAdmin = user.role === 'admin';

  const [tasks,       setTasks]       = useState([]);
  const [projects,    setProjects]    = useState([]);
  const [members,     setMembers]     = useState([]);   // for create modal
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState('list');
  const [search,      setSearch]      = useState('');
  const [filters,     setFilters]     = useState({ status: '', priority: '', project: '' });
  const [sort,        setSort]        = useState('createdAt');
  const [showCreate,  setShowCreate]  = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailOpen,  setDetailOpen]  = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [creating,    setCreating]    = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [createProject, setCreateProject] = useState('');
  const [createMembers, setCreateMembers] = useState([]);

  const searchTimer = useRef(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [filters, sort]);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(fetchTasks, 380);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status)   params.set('status',   filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.project)  params.set('project',  filters.project);
      if (sort)             params.set('sort',      sort);
      if (search)           params.set('search',    search);
      const { data } = await api.get(`/tasks?${params.toString()}`);
      setTasks(data.tasks);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data } = await api.get('/projects');
      setProjects(data.projects);
    } catch {}
  };

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreateTask = async (formData) => {
    if (!createProject) return toast.error('Select a project first');
    setCreating(true);
    try {
      const { data } = await api.post('/tasks', { ...formData, project: createProject });
      setTasks(t => [data.task, ...t]);
      setShowCreate(false);
      setCreateProject('');
      setCreateMembers([]);
      toast.success('TASK DEPLOYED');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create task');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      // Members send userStatus; admins send status
      const payload = isAdmin ? { status: newStatus } : { userStatus: newStatus };
      const { data } = await api.put(`/tasks/${taskId}`, payload);
      setTasks(t => t.map(task =>
        task._id === taskId
          ? { ...data.task, myStatus: data.task.myStatus || newStatus }
          : task
      ));
    } catch { toast.error('Failed to update status'); }
  };

  const handleTaskUpdated = (updated) => {
    setTasks(t => t.map(task => task._id === updated._id ? { ...updated } : task));
    setSelectedTask({ ...updated });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/tasks/${deleteTarget._id}`);
      setTasks(t => t.filter(task => task._id !== deleteTarget._id));
      toast.success('TASK TERMINATED');
    } catch { toast.error('Failed to delete task'); }
    finally { setDeleteTarget(null); }
  };

  const clearFilters = () => setFilters({ status: '', priority: '', project: '' });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Members for detail modal (collected from all projects)
  const allMembers = projects.reduce((acc, p) => {
    p.members?.forEach(m => {
      if (m.user && !acc.some(x => x.user?._id === m.user?._id)) acc.push(m);
    });
    return acc;
  }, []);

  // My status display for list row
  const getDisplayStatus = (task) => {
    if (!isAdmin && task.myStatus) return task.myStatus;
    return task.status;
  };

  return (
    <div style={{ padding: 32 }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <CheckSquare size={20} color="var(--neon-cyan)" />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>
              {isAdmin ? 'MISSION CONTROL' : 'MY ASSIGNMENTS'}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '2px' }}>
            {isAdmin ? 'ALL TASKS' : 'MY TASKS'}
          </h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', marginTop: 4 }}>
            {isAdmin
              ? `${tasks.length} tasks across all operations`
              : `${tasks.length} tasks assigned to you`}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowCreate(true)} style={{
            display: 'flex', alignItems: 'center', gap: 8, background: 'var(--neon-cyan)',
            border: 'none', borderRadius: 'var(--radius-sm)', padding: '12px 20px', cursor: 'pointer',
            fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700,
            letterSpacing: '2px', color: 'var(--bg-void)', boxShadow: '0 0 20px rgba(0,245,255,0.3)'
          }}>
            <Plus size={14} /> NEW TASK
          </button>
        )}
      </div>

      {/* ── Member: My personal stats row ──────────────────────────────── */}
      {!isAdmin && tasks.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'ASSIGNED', value: tasks.length, color: 'var(--text-secondary)' },
            { label: 'TO DO',    value: tasks.filter(t => (t.myStatus || t.status) === 'todo').length,       color: '#7ab8d4' },
            { label: 'IN PROG',  value: tasks.filter(t => (t.myStatus || t.status) === 'inprogress').length, color: 'var(--neon-cyan)' },
            { label: 'DONE',     value: tasks.filter(t => (t.myStatus || t.status) === 'done').length,       color: '#00ff41' },
          ].map(({ label, value, color }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ background: 'var(--bg-panel)', border: `1px solid ${color}22`, borderRadius: 'var(--radius-lg)', padding: '16px 20px' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 900, color }}>{value}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: 4 }}>{label}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="cyber-input" style={{ paddingLeft: 34 }} placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <button onClick={() => setShowFilters(f => !f)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
          background: showFilters ? 'rgba(0,245,255,0.1)' : 'transparent',
          border: `1px solid ${showFilters ? 'rgba(0,245,255,0.4)' : 'var(--border-dim)'}`,
          borderRadius: 'var(--radius-sm)', cursor: 'pointer',
          color: showFilters ? 'var(--neon-cyan)' : 'var(--text-muted)',
          fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1px', transition: 'all 0.15s'
        }}>
          <SlidersHorizontal size={13} />
          FILTERS {activeFilterCount > 0 && `(${activeFilterCount})`}
        </button>

        <div style={{ position: 'relative' }}>
          <ChevronDown size={11} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <select className="cyber-input" style={{ appearance: 'none', paddingRight: 28, cursor: 'pointer', width: 'auto' }} value={sort} onChange={e => setSort(e.target.value)}>
            <option value="createdAt">SORT: NEWEST</option>
            <option value="dueDate">SORT: DUE DATE</option>
            <option value="priority">SORT: PRIORITY</option>
            <option value="title">SORT: TITLE</option>
          </select>
        </div>

        {/* View toggle — kanban / list */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)', padding: 4 }}>
          {['list', 'kanban'].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '6px 12px', background: view === v ? 'rgba(0,245,255,0.12)' : 'transparent',
              border: `1px solid ${view === v ? 'rgba(0,245,255,0.3)' : 'transparent'}`,
              borderRadius: 4, cursor: 'pointer', color: view === v ? 'var(--neon-cyan)' : 'var(--text-muted)',
              fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1px', transition: 'all 0.15s'
            }}>
              {v.toUpperCase()}
            </button>
          ))}
        </div>

        {activeFilterCount > 0 && (
          <button onClick={clearFilters} style={{ padding: '10px 14px', background: 'rgba(255,0,144,0.1)', border: '1px solid rgba(255,0,144,0.3)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: 'var(--neon-pink)', fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1px' }}>
            CLEAR ALL
          </button>
        )}
      </div>

      {/* ── Filter Panel ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-lg)', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Status */}
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 8 }}>
                  {isAdmin ? 'OVERALL STATUS' : 'MY STATUS'}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <FilterBtn label="ALL" active={!filters.status} color="var(--neon-cyan)" onClick={() => setFilters(f => ({ ...f, status: '' }))} />
                  {Object.entries(STATUS_LABELS).map(([key, label]) => (
                    <FilterBtn key={key} label={label} active={filters.status === key} color={STATUS_COLORS[key]} onClick={() => setFilters(f => ({ ...f, status: key }))} />
                  ))}
                </div>
              </div>

              {/* Priority */}
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 8 }}>PRIORITY</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <FilterBtn label="ALL" active={!filters.priority} color="var(--neon-cyan)" onClick={() => setFilters(f => ({ ...f, priority: '' }))} />
                  {['low', 'medium', 'high', 'critical'].map(p => (
                    <FilterBtn key={p} label={p.toUpperCase()} active={filters.priority === p} color={PRIORITY_COLORS[p]} onClick={() => setFilters(f => ({ ...f, priority: p }))} />
                  ))}
                </div>
              </div>

              {/* Project */}
              {projects.length > 0 && (
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 8 }}>PROJECT</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <FilterBtn label="ALL" active={!filters.project} color="var(--neon-cyan)" onClick={() => setFilters(f => ({ ...f, project: '' }))} />
                    {projects.map(p => (
                      <FilterBtn key={p._id} label={p.name} active={filters.project === p._id} color={p.color || '#00f5ff'} onClick={() => setFilters(f => ({ ...f, project: p._id }))} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Task Content ─────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="cyber-spinner" style={{ margin: '0 auto 16px' }} />
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px' }}>LOADING TASKS…</div>
          </div>
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <CheckSquare size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--text-muted)', letterSpacing: '2px' }}>NO TASKS FOUND</div>
          {!isAdmin && <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginTop: 8 }}>Tasks assigned to you will appear here</p>}
        </div>
      ) : view === 'kanban' ? (
        /* ── Kanban view ── */
        <KanbanBoard
          tasks={tasks}
          onStatusChange={handleStatusChange}
          onDelete={isAdmin ? (t) => setDeleteTarget(t) : null}
          userRole={user.role}
          projectMemberRole={user.role}
          onTaskClick={(t) => { setSelectedTask(t); setDetailOpen(true); }}
          currentUserId={user._id}
        />
      ) : (
        /* ── List view ── */
        <motion.div layout style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {tasks.map(task => {
              const displayStatus = getDisplayStatus(task);
              const statusColor = STATUS_COLORS[displayStatus] || '#7ab8d4';
              const priorityColor = PRIORITY_COLORS[task.priority] || '#7ab8d4';
              const overdue = task.dueDate && displayStatus !== 'done' && new Date(task.dueDate) < new Date();
              const completionPct = (task.userStatuses?.length > 0)
                ? Math.round((task.userStatuses.filter(us => us.status === 'done').length / task.userStatuses.length) * 100)
                : (task.status === 'done' ? 100 : 0);

              return (
                <motion.div key={task._id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }}>
                  <div
                    onClick={() => { setSelectedTask(task); setDetailOpen(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                      background: 'var(--bg-panel)', border: '1px solid var(--border-dim)',
                      borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      borderLeft: `3px solid ${priorityColor}`,
                      position: 'relative', overflow: 'hidden', transition: 'all 0.15s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,245,255,0.25)'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.background = 'var(--bg-panel)'; }}
                  >
                    {/* Completion progress bar (behind content) */}
                    {isAdmin && completionPct > 0 && (
                      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: `${completionPct}%`, background: statusColor, opacity: 0.5, transition: 'width 0.5s', boxShadow: `0 0 6px ${statusColor}` }} />
                    )}

                    {/* Personal / overall status dot */}
                    <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0, background: statusColor, boxShadow: `0 0 6px ${statusColor}80` }} />

                    {/* Title + project */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                        {task.project && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: task.project.color || 'var(--text-muted)' }}>
                            {task.project.name}
                          </span>
                        )}
                        {/* My personal status badge (member) */}
                        {!isAdmin && task.myStatus && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '1px', padding: '1px 6px', borderRadius: 2, border: `1px solid ${statusColor}44`, color: statusColor, background: `${statusColor}11` }}>
                            MY: {STATUS_LABELS[task.myStatus] || task.myStatus}
                          </span>
                        )}
                        {/* Admin: completion fraction */}
                        {isAdmin && task.userStatuses?.length > 0 && (
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)' }}>
                            {task.userStatuses.filter(us => us.status === 'done').length}/{task.userStatuses.length} done
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Assignee pills with status colors */}
                    <AssigneePills task={task} currentUserId={user._id} isAdmin={isAdmin} />

                    {/* Priority badge */}
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '1px', padding: '3px 8px', borderRadius: 2, flexShrink: 0, border: `1px solid ${priorityColor}44`, color: priorityColor, background: `${priorityColor}11` }}>
                      {task.priority?.toUpperCase()}
                    </span>

                    {/* Due date */}
                    {task.dueDate && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', flexShrink: 0, color: overdue ? 'var(--neon-pink)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {overdue && <AlertCircle size={10} />}
                        {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}

                    {/* Member: quick status update */}
                    {!isAdmin && (
                      <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        {Object.entries(STATUS_LABELS).map(([key, label]) => {
                          const active = (task.myStatus || task.status) === key;
                          const sc = STATUS_COLORS[key];
                          return (
                            <button key={key} onClick={() => handleStatusChange(task._id, key)} style={{
                              padding: '4px 8px', cursor: 'pointer', transition: 'all 0.15s',
                              background: active ? `${sc}18` : 'transparent',
                              border: `1px solid ${active ? sc : 'var(--border-dim)'}`,
                              borderRadius: 3, color: active ? sc : 'var(--text-muted)',
                              fontFamily: 'var(--font-display)', fontSize: '8px', letterSpacing: '1px'
                            }}>
                              {key === 'todo' ? 'TODO' : key === 'inprogress' ? 'WIP' : 'DONE'}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Admin delete */}
                    {isAdmin && (
                      <button onClick={e => { e.stopPropagation(); setDeleteTarget(task); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, flexShrink: 0 }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--neon-pink)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      >✕</button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Task Detail Modal ─────────────────────────────────────────────── */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setSelectedTask(null); }}
        onUpdated={handleTaskUpdated}
        members={allMembers}
        userRole={user.role}
        projectMemberRole={user.role}
        currentUserId={user._id}
      />

      {/* ── Create Task Modal ─────────────────────────────────────────────── */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setCreateProject(''); setCreateMembers([]); }} title="DEPLOY NEW TASK" size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ marginBottom: 20 }}>
            <ProjectSelector
              projects={projects}
              value={createProject}
              onChange={setCreateProject}
              onMembersChange={setCreateMembers}
            />
          </div>
          <TaskForm
            key={createProject} // re-mount when project changes so members refresh
            onSubmit={handleCreateTask}
            members={createMembers}
            loading={creating}
            submitLabel="DEPLOY TASK"
            isAdmin={true}
          />
        </div>
      </Modal>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="DELETE TASK" size="sm">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', color: 'var(--neon-pink)', marginBottom: 20 }}>
            "{deleteTarget?.title}"
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '12px', background: 'transparent', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', cursor: 'pointer' }}>ABORT</button>
            <button onClick={handleDelete} style={{ flex: 1, padding: '12px', background: 'rgba(255,0,144,0.12)', border: '1px solid var(--neon-pink)', borderRadius: 'var(--radius-sm)', color: 'var(--neon-pink)', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', cursor: 'pointer', fontWeight: 700 }}>DELETE</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
