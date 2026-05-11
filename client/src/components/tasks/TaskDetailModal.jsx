import { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, User, Flag, Clock, AlertCircle, CheckCircle, Edit3, Users, TrendingUp } from 'lucide-react';
import Modal from '../ui/Modal';
import TaskForm from './TaskForm';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const PRIORITY_CONFIG = {
  low:      { color: '#00ff41', label: 'LOW'      },
  medium:   { color: '#ffea00', label: 'MEDIUM'   },
  high:     { color: '#ff6b00', label: 'HIGH'     },
  critical: { color: '#ff0090', label: 'CRITICAL' }
};

const STATUS_CONFIG = {
  todo:       { color: '#7ab8d4', label: 'TO DO'       },
  inprogress: { color: '#00f5ff', label: 'IN PROGRESS' },
  done:       { color: '#00ff41', label: 'DONE'        }
};

const Badge = ({ color, children }) => (
  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px', padding: '3px 8px', borderRadius: 2, border: `1px solid ${color}44`, color, background: `${color}11` }}>
    {children}
  </span>
);

const InfoRow = ({ icon: Icon, label, children }) => (
  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 110, flexShrink: 0, color: 'var(--text-muted)' }}>
      <Icon size={12} />
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px' }}>{label}</span>
    </div>
    <div style={{ flex: 1 }}>{children}</div>
  </div>
);

// ── Per-user status progress table ───────────────────────────────────────────
function UserStatusBreakdown({ userStatuses, isAdmin }) {
  if (!userStatuses || userStatuses.length === 0) return null;

  const total = userStatuses.length;
  const done  = userStatuses.filter(us => us.status === 'done').length;
  const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div style={{ background: 'rgba(0,245,255,0.02)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border-dim)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={12} color="var(--neon-cyan)" />
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>
            ASSIGNEE PROGRESS
          </span>
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: pct === 100 ? 'var(--neon-green)' : 'var(--neon-cyan)' }}>
          {done}/{total} DONE
        </span>
      </div>

      {/* Overall bar */}
      <div style={{ padding: '10px 14px 4px' }}>
        <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2 }}>
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }}
            style={{ height: '100%', borderRadius: 2, background: pct === 100 ? 'var(--neon-green)' : 'var(--neon-cyan)', boxShadow: `0 0 8px ${pct === 100 ? 'var(--neon-green)' : 'var(--neon-cyan)'}60` }}
          />
        </div>
      </div>

      {/* Per-user rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {userStatuses.map((us, i) => {
          const user = us.user;
          const sc   = STATUS_CONFIG[us.status] || STATUS_CONFIG.todo;
          const name = user?.fullName || 'Unknown';
          return (
            <div key={user?._id?.toString() || i}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderTop: i === 0 ? '1px solid var(--border-dim)' : 'none', borderBottom: i < userStatuses.length - 1 ? '1px solid rgba(0,245,255,0.04)' : 'none' }}
            >
              {/* Avatar */}
              <div style={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg, ${sc.color}cc, ${sc.color}44)`, border: `2px solid ${sc.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, color: 'var(--bg-void)' }}>
                {name[0]?.toUpperCase()}
              </div>

              {/* Name */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                {us.completedAt && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--neon-green)', marginTop: 1 }}>
                    Done {new Date(us.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                )}
              </div>

              {/* Status badge */}
              <Badge color={sc.color}>{sc.label}</Badge>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────
export default function TaskDetailModal({ task, isOpen, onClose, onUpdated, members = [], userRole, projectMemberRole, currentUserId }) {
  const [editMode, setEditMode]   = useState(false);
  const [saving,   setSaving]     = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!task) return null;

  const isAdmin   = userRole === 'admin' || projectMemberRole === 'admin';
  const priority  = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const isOverdue = task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date();

  // Member's personal status for this task
  const myStatusEntry = (task.userStatuses || []).find(us =>
    (us.user?._id || us.user)?.toString() === currentUserId?.toString()
  );
  const myStatus = task.myStatus || myStatusEntry?.status || 'todo';

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : null;

  // ── Admin saves full edits via TaskForm ───────────────────────────────────
  const handleSave = async (formData) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/tasks/${task._id}`, formData);
      onUpdated(data.task);
      setEditMode(false);
      toast.success('TASK UPDATED');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  // ── Member updates their personal status ──────────────────────────────────
  const handleMyStatusChange = async (newStatus) => {
    setUpdatingStatus(true);
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { userStatus: newStatus });
      onUpdated(data.task);
      toast.success(`STATUS → ${newStatus.toUpperCase()}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // ── Admin quick-changes aggregate status ──────────────────────────────────
  const handleAdminStatusChange = async (newStatus) => {
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { status: newStatus });
      onUpdated(data.task);
      toast.success('STATUS UPDATED');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { setEditMode(false); onClose(); }} title={editMode ? 'EDIT TASK' : 'TASK DETAILS'} size="md">
      {!editMode ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Title row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <h2 style={{ fontFamily: 'var(--font-body)', fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, flex: 1 }}>
              {task.title}
            </h2>
            {isAdmin && (
              <button onClick={() => setEditMode(true)} style={{ background: 'rgba(0,245,255,0.1)', border: '1px solid rgba(0,245,255,0.3)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', cursor: 'pointer', color: 'var(--neon-cyan)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1px', flexShrink: 0 }}>
                <Edit3 size={12} /> EDIT
              </button>
            )}
          </div>

          {/* Description */}
          {task.description && (
            <div style={{ background: 'rgba(0,245,255,0.02)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)', padding: '14px' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{task.description}</p>
            </div>
          )}

          {/* ── MEMBER: update MY status ── */}
          {!isAdmin && myStatusEntry && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 8 }}>
                MY PROGRESS
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <button key={key} disabled={updatingStatus} onClick={() => handleMyStatusChange(key)} style={{
                    flex: 1, padding: '10px 6px', cursor: updatingStatus ? 'not-allowed' : 'pointer',
                    background: myStatus === key ? `${val.color}18` : 'transparent',
                    border: `1px solid ${myStatus === key ? val.color : 'var(--border-dim)'}`,
                    borderRadius: 'var(--radius-sm)', color: myStatus === key ? val.color : 'var(--text-muted)',
                    fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1px', transition: 'all 0.15s'
                  }}>
                    {val.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── ADMIN: quick global status change + per-user breakdown ── */}
          {isAdmin && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginBottom: 8 }}>
                GLOBAL STATUS OVERRIDE
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <button key={key} onClick={() => handleAdminStatusChange(key)} style={{
                    flex: 1, padding: '8px 4px', cursor: 'pointer',
                    background: task.status === key ? `${val.color}18` : 'transparent',
                    border: `1px solid ${task.status === key ? val.color : 'var(--border-dim)'}`,
                    borderRadius: 'var(--radius-sm)', color: task.status === key ? val.color : 'var(--text-muted)',
                    fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1px', transition: 'all 0.15s'
                  }}>{val.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* ── Per-user status table (both admin and member can see) ── */}
          {task.userStatuses && task.userStatuses.length > 0 && (
            <UserStatusBreakdown userStatuses={task.userStatuses} isAdmin={isAdmin} />
          )}

          {/* Meta info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: '1px solid var(--border-dim)', paddingTop: 16 }}>
            <InfoRow icon={Flag} label="PRIORITY">
              <Badge color={priority.color}>{priority.label}</Badge>
            </InfoRow>

            <InfoRow icon={CheckCircle} label="OVERALL">
              <Badge color={STATUS_CONFIG[task.status]?.color || '#7ab8d4'}>
                {STATUS_CONFIG[task.status]?.label || task.status}
              </Badge>
            </InfoRow>

            {task.dueDate && (
              <InfoRow icon={isOverdue ? AlertCircle : Calendar} label="DUE DATE">
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: isOverdue ? 'var(--neon-pink)' : 'var(--text-primary)' }}>
                  {fmtDate(task.dueDate)} {isOverdue && '— OVERDUE'}
                </span>
              </InfoRow>
            )}

            {task.creator && (
              <InfoRow icon={User} label="CREATED BY">
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {task.creator.fullName}
                </span>
              </InfoRow>
            )}

            <InfoRow icon={Clock} label="CREATED">
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
                {fmtDate(task.createdAt)}
              </span>
            </InfoRow>
          </div>
        </div>
      ) : (
        <div>
          <TaskForm
            onSubmit={handleSave}
            members={members}
            loading={saving}
            submitLabel="SAVE CHANGES"
            isAdmin={isAdmin}
            initialData={{
              title: task.title,
              description: task.description || '',
              status: task.status,
              priority: task.priority,
              assignees: task.assignees?.length > 0
                ? task.assignees.map(a => a?._id || a).filter(Boolean)
                : [],
              dueDate: task.dueDate ? task.dueDate.split('T')[0] : ''
            }}
          />
          <button onClick={() => setEditMode(false)} style={{ marginTop: 10, width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', cursor: 'pointer' }}>
            CANCEL
          </button>
        </div>
      )}
    </Modal>
  );
}
