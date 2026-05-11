import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Shield, Search, UserX, Clock, CheckCircle, Mail } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/ui/Modal';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data.users);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    try {
      await api.put(`/users/${deactivateTarget._id}/deactivate`);
      setUsers(u => u.filter(usr => usr._id !== deactivateTarget._id));
      toast.success('OPERATIVE DEACTIVATED');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to deactivate user');
    } finally {
      setDeactivateTarget(null);
    }
  };

  const filtered = users.filter(u => {
    const matchSearch = !search ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const timeAgo = (d) => {
    if (!d) return 'Never';
    const diff = Date.now() - new Date(d);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return formatDate(d);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="cyber-spinner" style={{ margin: '0 auto 16px' }} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px' }}>SCANNING OPERATIVES...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Users size={20} color="var(--neon-cyan)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>ADMIN CONSOLE</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '2px' }}>
          USER MANAGEMENT
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', marginTop: 4 }}>
          {users.length} registered operatives in the nexus
        </p>
      </motion.div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'TOTAL', value: users.length, color: 'var(--neon-cyan)' },
          { label: 'ADMINS', value: users.filter(u => u.role === 'admin').length, color: 'var(--neon-pink)' },
          { label: 'MEMBERS', value: users.filter(u => u.role === 'member').length, color: '#7ab8d4' },
        ].map(({ label, value, color }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: 'var(--bg-panel)', border: `1px solid ${color}22`, borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 900, color }}>{value}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: 4 }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 360 }}>
          <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input className="cyber-input" style={{ paddingLeft: 34 }} placeholder="Search operatives..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {['', 'admin', 'member'].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} style={{
            padding: '9px 14px', cursor: 'pointer',
            background: roleFilter === r ? 'rgba(0,245,255,0.1)' : 'transparent',
            border: `1px solid ${roleFilter === r ? 'rgba(0,245,255,0.4)' : 'var(--border-dim)'}`,
            borderRadius: 'var(--radius-sm)', color: roleFilter === r ? 'var(--neon-cyan)' : 'var(--text-muted)',
            fontFamily: 'var(--font-display)', fontSize: '10px', letterSpacing: '1px', transition: 'all 0.15s'
          }}>
            {r ? r.toUpperCase() : 'ALL'}
          </button>
        ))}
      </div>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1.5fr auto auto auto auto',
          gap: 16, padding: '12px 20px', borderBottom: '1px solid var(--border-dim)',
          background: 'rgba(0,245,255,0.02)'
        }}>
          {['OPERATIVE', 'EMAIL', 'ROLE', 'JOINED', 'LAST SEEN', ''].map((h, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
            NO OPERATIVES FOUND
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((u, i) => (
              <motion.div
                key={u._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ delay: i * 0.03 }}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 1.5fr auto auto auto auto',
                  gap: 16, padding: '16px 20px', alignItems: 'center',
                  borderBottom: '1px solid var(--border-dim)',
                  background: u._id === currentUser._id ? 'rgba(0,245,255,0.02)' : 'transparent',
                  transition: 'background 0.15s'
                }}
                onMouseEnter={e => { if (u._id !== currentUser._id) e.currentTarget.style.background = 'rgba(0,245,255,0.02)'; }}
                onMouseLeave={e => { if (u._id !== currentUser._id) e.currentTarget.style.background = 'transparent'; }}
              >
                {/* Name + avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: `linear-gradient(135deg, ${u.role === 'admin' ? 'var(--neon-pink)' : 'var(--neon-cyan)'}, ${u.role === 'admin' ? 'var(--neon-purple)' : 'var(--neon-purple)'})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 700, color: 'var(--bg-void)'
                  }}>
                    {u.fullName?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.fullName} {u._id === currentUser._id && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--neon-cyan)' }}>(you)</span>}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <Mail size={11} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.email}
                  </span>
                </div>

                {/* Role */}
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: '9px', letterSpacing: '1px',
                  padding: '3px 10px', borderRadius: 2, whiteSpace: 'nowrap',
                  border: `1px solid ${u.role === 'admin' ? 'rgba(255,0,144,0.4)' : 'var(--border-dim)'}`,
                  color: u.role === 'admin' ? 'var(--neon-pink)' : 'var(--text-muted)',
                  background: u.role === 'admin' ? 'rgba(255,0,144,0.08)' : 'transparent',
                  display: 'flex', alignItems: 'center', gap: 4
                }}>
                  {u.role === 'admin' && <Shield size={9} />}
                  {u.role?.toUpperCase()}
                </span>

                {/* Joined */}
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {formatDate(u.createdAt)}
                </span>

                {/* Last seen */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
                  <Clock size={10} color="var(--text-muted)" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                    {timeAgo(u.lastSeen)}
                  </span>
                </div>

                {/* Actions */}
                <div>
                  {u._id !== currentUser._id && (
                    <button onClick={() => setDeactivateTarget(u)} style={{
                      background: 'transparent', border: '1px solid transparent',
                      borderRadius: 'var(--radius-sm)', padding: '6px 10px', cursor: 'pointer',
                      color: 'var(--text-muted)', fontFamily: 'var(--font-display)', fontSize: '9px',
                      letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: 5,
                      transition: 'all 0.15s'
                    }}
                      onMouseEnter={e => {
                        e.currentTarget.style.color = 'var(--neon-pink)';
                        e.currentTarget.style.borderColor = 'rgba(255,0,144,0.3)';
                        e.currentTarget.style.background = 'rgba(255,0,144,0.06)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = 'var(--text-muted)';
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <UserX size={11} /> DEACTIVATE
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Deactivate confirm */}
      <Modal isOpen={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} title="DEACTIVATE OPERATIVE" size="sm">
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', margin: '0 auto 16px',
            background: 'rgba(255,0,144,0.1)', border: '2px solid rgba(255,0,144,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <UserX size={24} color="var(--neon-pink)" />
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', marginBottom: 4 }}>
            Deactivate operative
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '16px', color: 'var(--neon-pink)', marginBottom: 4 }}>
            {deactivateTarget?.fullName}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: 24 }}>
            {deactivateTarget?.email}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-muted)', marginBottom: 24 }}>
            This user will lose access to the nexus immediately.
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setDeactivateTarget(null)} style={{
              flex: 1, padding: '12px', background: 'transparent',
              border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-sm)',
              color: 'var(--text-secondary)', fontFamily: 'var(--font-display)', fontSize: '11px',
              letterSpacing: '2px', cursor: 'pointer'
            }}>ABORT</button>
            <button onClick={handleDeactivate} style={{
              flex: 1, padding: '12px', background: 'rgba(255,0,144,0.12)',
              border: '1px solid var(--neon-pink)', borderRadius: 'var(--radius-sm)',
              color: 'var(--neon-pink)', fontFamily: 'var(--font-display)', fontSize: '11px',
              letterSpacing: '2px', cursor: 'pointer', fontWeight: 700
            }}>DEACTIVATE</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
