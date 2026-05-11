import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Calendar, AlertCircle, ChevronDown } from 'lucide-react';

const PRIORITY_CONFIG = {
  low:      { color: '#00ff41', label: 'LOW'  },
  medium:   { color: '#ffea00', label: 'MED'  },
  high:     { color: '#ff6b00', label: 'HIGH' },
  critical: { color: '#ff0090', label: 'CRIT' }
};

const STATUS_CONFIG = {
  todo:       { color: '#7ab8d4', label: 'TO DO'       },
  inprogress: { color: '#00f5ff', label: 'IN PROGRESS' },
  done:       { color: '#00ff41', label: 'DONE'        }
};

// ── Single task card ─────────────────────────────────────────────────────────
export function TaskCard({ task, onDelete, onStatusChange, userRole, projectMemberRole, onClick, currentUserId }) {
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();
  const canDelete = userRole === 'admin' || projectMemberRole === 'admin';

  // For display: member sees their own status, admin sees global
  const displayStatus = (userRole !== 'admin' && task.myStatus) ? task.myStatus : task.status;
  const statusCfg = STATUS_CONFIG[displayStatus] || STATUS_CONFIG.todo;

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

  // Assignee avatars — show each user's personal status badge
  const assignees = task.assignees?.length > 0 ? task.assignees : (task.assignee ? [task.assignee] : []);
  const userStatuses = task.userStatuses || [];

  const getUserStatus = (userId) => {
    const entry = userStatuses.find(us => (us.user?._id || us.user)?.toString() === userId?.toString());
    return entry?.status || 'todo';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      onClick={() => onClick && onClick(task)}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${isOverdue ? 'rgba(255,0,144,0.3)' : 'var(--border-dim)'}`,
        borderRadius: 'var(--radius-md)', padding: '14px',
        cursor: 'pointer', position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.15s, box-shadow 0.15s'
      }}
      whileHover={{
        borderColor: isOverdue ? 'rgba(255,0,144,0.5)' : 'rgba(0,245,255,0.3)',
        boxShadow: isOverdue ? '0 0 10px rgba(255,0,144,0.1)' : '0 0 10px rgba(0,245,255,0.08)'
      }}
    >
      {/* Priority stripe */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: priority.color, boxShadow: `0 0 8px ${priority.color}80` }} />

      <div style={{ paddingLeft: 8 }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1 }}>
            {task.title}
          </div>
          {canDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete && onDelete(task); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2, flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--neon-pink)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            ><Trash2 size={12} /></button>
          )}
        </div>

        {task.description && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {task.description}
          </p>
        )}

        {/* Meta row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '1px', padding: '2px 6px', borderRadius: 2, border: `1px solid ${priority.color}44`, color: priority.color, background: `${priority.color}11` }}>
            {priority.label}
          </span>

          {/* Global status pill (admin) or personal status (member) */}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '1px', padding: '2px 6px', borderRadius: 2, border: `1px solid ${statusCfg.color}44`, color: statusCfg.color, background: `${statusCfg.color}11` }}>
            {statusCfg.label}
          </span>

          {task.dueDate && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', display: 'flex', alignItems: 'center', gap: 3, color: isOverdue ? 'var(--neon-pink)' : 'var(--text-muted)' }}>
              {isOverdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
              {fmtDate(task.dueDate)}
            </span>
          )}
        </div>

        {/* Assignee avatars with per-user status dots */}
        {assignees.length > 0 && (
          <div style={{ display: 'flex', marginTop: 10, gap: 4, flexWrap: 'wrap' }}>
            {assignees.slice(0, 5).map((a, i) => {
              const uid = a._id || a;
              const uStatus = getUserStatus(uid);
              const uColor = STATUS_CONFIG[uStatus]?.color || '#7ab8d4';
              return (
                <div key={uid?.toString() || i} title={`${a.fullName || '?'} — ${uStatus}`}
                  style={{ position: 'relative', display: 'inline-flex' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: `linear-gradient(135deg, ${uColor}cc, ${uColor}44)`,
                    border: `2px solid ${uColor}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: '9px', fontWeight: 700,
                    color: 'var(--bg-void)'
                  }}>
                    {(a.fullName || '?')[0]?.toUpperCase()}
                  </div>
                  {/* Status dot */}
                  <div style={{
                    position: 'absolute', bottom: -1, right: -1,
                    width: 7, height: 7, borderRadius: '50%',
                    background: uColor, border: '1.5px solid var(--bg-card)',
                    boxShadow: `0 0 4px ${uColor}`
                  }} />
                </div>
              );
            })}
            {assignees.length > 5 && (
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--bg-hover)', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-mono)', fontSize: '8px', color: 'var(--text-muted)' }}>
                +{assignees.length - 5}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Kanban board ─────────────────────────────────────────────────────────────
const COLUMNS = [
  { id: 'todo',       label: 'TO DO',       color: '#7ab8d4' },
  { id: 'inprogress', label: 'IN PROGRESS', color: '#00f5ff' },
  { id: 'done',       label: 'DONE',        color: '#00ff41' }
];

export function KanbanBoard({ tasks, onStatusChange, onDelete, userRole, projectMemberRole, onTaskClick, currentUserId }) {
  const [dragOver, setDragOver] = useState(null);
  const [dragTask, setDragTask] = useState(null);

  // For members: group by their personal status; for admins: group by global status
  const getDisplayStatus = (task) => {
    if (userRole !== 'admin' && task.myStatus) return task.myStatus;
    return task.status;
  };

  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(t => getDisplayStatus(t) === col.id);
    return acc;
  }, {});

  const handleDrop = (e, colId) => {
    e.preventDefault();
    if (dragTask && getDisplayStatus(dragTask) !== colId) {
      onStatusChange(dragTask._id, colId);
    }
    setDragOver(null);
    setDragTask(null);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, alignItems: 'start' }}>
      {COLUMNS.map(col => (
        <div key={col.id}
          onDragOver={e => { e.preventDefault(); setDragOver(col.id); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={e => handleDrop(e, col.id)}
          style={{
            background: dragOver === col.id ? `${col.color}05` : 'var(--bg-panel)',
            border: `1px solid ${dragOver === col.id ? col.color + '44' : 'var(--border-dim)'}`,
            borderRadius: 'var(--radius-lg)', overflow: 'hidden', transition: 'all 0.15s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: `1px solid ${col.color}22` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: col.color, boxShadow: `0 0 6px ${col.color}` }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: col.color, letterSpacing: '2px' }}>{col.label}</span>
            </div>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', background: `${col.color}15`, color: col.color, padding: '2px 8px', borderRadius: 2 }}>
              {tasksByStatus[col.id]?.length || 0}
            </span>
          </div>

          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 100 }}>
            <AnimatePresence>
              {tasksByStatus[col.id]?.map(task => (
                <div key={task._id} draggable onDragStart={e => { setDragTask(task); e.dataTransfer.effectAllowed = 'move'; }} style={{ cursor: 'grab' }}>
                  <TaskCard
                    task={task} onDelete={onDelete} onStatusChange={onStatusChange}
                    userRole={userRole} projectMemberRole={projectMemberRole}
                    onClick={onTaskClick} currentUserId={currentUserId}
                  />
                </div>
              ))}
            </AnimatePresence>
            {tasksByStatus[col.id]?.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', border: `1px dashed ${col.color}22`, borderRadius: 'var(--radius-md)' }}>
                DROP TASKS HERE
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
