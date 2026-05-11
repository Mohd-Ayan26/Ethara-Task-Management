import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  Activity, CheckCircle, Clock, AlertTriangle,
  FolderOpen, TrendingUp, Calendar, Zap, Users, User
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

// ── Palette ──────────────────────────────────────────────────────────────────
const STATUS_COLORS   = { todo: '#7ab8d4', inprogress: '#00f5ff', done: '#00ff41' };
const PRIORITY_COLORS = { low: '#00ff41', medium: '#ffea00', high: '#ff6b00', critical: '#ff0090' };
const STATUS_LABELS   = { todo: 'TO DO', inprogress: 'IN PROGRESS', done: 'DONE' };
const PRIORITY_LABELS = { low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'CRITICAL' };

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';

// ── Sub-components ────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.4 }}
    style={{
      background: 'var(--bg-panel)', border: `1px solid ${color}22`,
      borderRadius: 'var(--radius-lg)', padding: '24px',
      display: 'flex', flexDirection: 'column', gap: 16,
      position: 'relative', overflow: 'hidden'
    }}
    whileHover={{ borderColor: color + '55', boxShadow: `0 0 20px ${color}12` }}
  >
    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`, borderRadius: '50%' }} />
    <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: `${color}15`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={18} color={color} />
    </div>
    <div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color, textShadow: `0 0 15px ${color}80` }}>
        {value ?? '—'}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px', marginTop: 4 }}>
        {label}
      </div>
    </div>
  </motion.div>
);

const CyberTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)', padding: '10px 14px' }}>
      {label && <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: p.color || p.fill || 'var(--neon-cyan)' }}>
          {p.name}: {p.value}
        </div>
      ))}
    </div>
  );
};

// ── Member Task Status Matrix (admin only) ────────────────────────────────────
const MemberMatrix = ({ data }) => {
  if (!data || data.length === 0) return (
    <div style={{ textAlign: 'center', padding: 24, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
      NO ASSIGNEE DATA
    </div>
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
        <thead>
          <tr>
            {['OPERATIVE', 'TO DO', 'IN PROGRESS', 'DONE', 'TOTAL', 'COMPLETION'].map((h, i) => (
              <th key={i} style={{
                fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '1px',
                color: 'var(--text-muted)', padding: '8px 12px',
                textAlign: i === 0 ? 'left' : 'center',
                borderBottom: '1px solid var(--border-dim)'
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const pct = row.total > 0 ? Math.round((row.done / row.total) * 100) : 0;
            return (
              <motion.tr key={row.user?._id || i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                style={{ borderBottom: '1px solid var(--border-dim)', transition: 'background 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,245,255,0.03)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Operative */}
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontFamily: 'var(--font-display)', fontSize: '12px', fontWeight: 700, color: 'var(--bg-void)'
                    }}>
                      {row.user?.fullName?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {row.user?.fullName}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                        {row.user?.email}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Status counts */}
                {[
                  { val: row.todo,       color: '#7ab8d4' },
                  { val: row.inprogress, color: '#00f5ff' },
                  { val: row.done,       color: '#00ff41' },
                  { val: row.total,      color: 'var(--text-primary)' }
                ].map(({ val, color }, ci) => (
                  <td key={ci} style={{ textAlign: 'center', padding: '12px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, color }}>
                      {val || 0}
                    </span>
                  </td>
                ))}

                {/* Completion bar */}
                <td style={{ padding: '12px', minWidth: 120 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-hover)', borderRadius: 3 }}>
                      <motion.div
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.1 * i }}
                        style={{
                          height: '100%', borderRadius: 3,
                          background: pct >= 80 ? '#00ff41' : pct >= 50 ? '#ffea00' : '#ff0090',
                          boxShadow: `0 0 6px ${pct >= 80 ? '#00ff41' : pct >= 50 ? '#ffea00' : '#ff0090'}80`
                        }}
                      />
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', width: 32, textAlign: 'right' }}>
                      {pct}%
                    </span>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ── Activity Feed (works for both admin + member) ─────────────────────────────
const ActivityFeed = ({ activities, isAdmin }) => {
  const ACTION_COLOR = {
    'created task':  'var(--neon-cyan)',
    'updated task':  '#ffea00',
    'deleted task':  'var(--neon-pink)',
    'created project': 'var(--neon-purple)',
    'updated project': '#7ab8d4',
    'added member':    'var(--neon-green)',
    'removed member':  'var(--neon-orange)',
  };

  if (activities.length === 0) return (
    <div style={{ textAlign: 'center', padding: 24, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>
      NO ACTIVITY RECORDED
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {activities.map((a, i) => {
        const dotColor = ACTION_COLOR[a.action] || 'var(--neon-cyan)';
        return (
          <motion.div key={i}
            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
            style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border-dim)' }}
          >
            {/* Timeline dot */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: dotColor, flexShrink: 0, boxShadow: `0 0 6px ${dotColor}` }} />
              {i < activities.length - 1 && <div style={{ width: 1, flex: 1, background: 'var(--border-dim)', marginTop: 4 }} />}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
              <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {isAdmin && (
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    {a.user?.fullName || 'System'}{' '}
                  </span>
                )}
                <span style={{ color: dotColor }}>{a.action}</span>
                {a.target && (
                  <span style={{ color: 'var(--text-primary)' }}> "{a.target}"</span>
                )}
              </div>
              {a.detail && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
                  {a.detail}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--neon-cyan)' }}>
                  {a.projectName}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
                  {new Date(a.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: res } = await api.get('/analytics/dashboard');
        setData(res);
      } catch (err) {
        console.error('Dashboard load failed', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="cyber-spinner" style={{ margin: '0 auto 16px' }} />
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', letterSpacing: '2px' }}>LOADING NEXUS DATA…</div>
      </div>
    </div>
  );

  const {
    stats = {}, charts = {},
    memberTaskMatrix = [], upcomingDeadlines = [],
    recentActivity = [], isAdmin = false,
    userActivityCounts = []
  } = data || {};

  // Chart data
  const statusChartData = (charts.tasksByStatus || []).map(i => ({
    name: STATUS_LABELS[i._id] || i._id, value: i.count, color: STATUS_COLORS[i._id] || '#7ab8d4'
  }));
  const priorityChartData = (charts.tasksByPriority || []).map(i => ({
    name: PRIORITY_LABELS[i._id] || i._id, value: i.count, color: PRIORITY_COLORS[i._id] || '#00f5ff'
  }));
  const userChartData = (charts.tasksByUser || []).map(i => ({
    name: i.user?.fullName?.split(' ')[0] || 'Unknown',
    Total: i.total, Done: i.done, 'In Progress': i.inprogress
  }));

  const PieSection = ({ title, chartData }) => (
    <div style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--neon-cyan)', letterSpacing: '2px', marginBottom: 20 }}>{title}</h3>
      {chartData.length > 0 ? (
        <>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" innerRadius={46} outerRadius={76} paddingAngle={3} dataKey="value">
                {chartData.map((e, i) => <Cell key={i} fill={e.color} stroke="transparent" />)}
              </Pie>
              <Tooltip content={<CyberTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            {chartData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-secondary)' }}>{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '12px' }}>NO DATA</div>
      )}
    </div>
  );

  return (
    <div style={{ padding: '32px', maxWidth: 1400 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Zap size={20} color="var(--neon-cyan)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>
            {isAdmin ? 'ADMIN NEXUS CONTROL' : 'OPERATIVE DASHBOARD'}
          </span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '2px' }}>
          DASHBOARD
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-secondary)', marginTop: 4 }}>
          {isAdmin
            ? `All-ops view — ${stats.totalTasks || 0} tasks tracked across ${stats.totalProjects || 0} projects`
            : `Welcome back, ${user?.fullName} — your personal mission status`}
        </p>
      </motion.div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard icon={FolderOpen}   label="PROJECTS"         value={stats.totalProjects}     color="#00f5ff" delay={0}    />
        <StatCard icon={Activity}     label="TOTAL TASKS"      value={stats.totalTasks}         color="#bf00ff" delay={0.05} />
        <StatCard icon={CheckCircle}  label="COMPLETED"        value={stats.completedTasks}     color="#00ff41" delay={0.1}  />
        <StatCard icon={Clock}        label="IN PROGRESS"      value={stats.inProgressTasks}    color="#ffea00" delay={0.15} />
        <StatCard icon={AlertTriangle}label="OVERDUE"          value={stats.overdueTasks}       color="#ff0090" delay={0.2}  />
        <StatCard icon={TrendingUp}   label="COMPLETION RATE"  value={`${stats.completionRate || 0}%`} color="#ff6b00" delay={0.25} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <PieSection title="TASKS BY STATUS" chartData={statusChartData} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <PieSection title="TASKS BY PRIORITY" chartData={priorityChartData} />
        </motion.div>

        {/* Bar chart – tasks per user */}
        {userChartData.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--neon-cyan)', letterSpacing: '2px', marginBottom: 20 }}>TASKS PER OPERATIVE</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={userChartData} barSize={12} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,245,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#7ab8d4', fontSize: 10, fontFamily: 'Share Tech Mono' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#7ab8d4', fontSize: 10, fontFamily: 'Share Tech Mono' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CyberTooltip />} />
                <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontFamily: 'Share Tech Mono', fontSize: 10, color: '#7ab8d4' }} />
                <Bar dataKey="Total"       fill="#00f5ff" radius={[2,2,0,0]} opacity={0.85} />
                <Bar dataKey="Done"        fill="#00ff41" radius={[2,2,0,0]} opacity={0.85} />
                <Bar dataKey="In Progress" fill="#ffea00" radius={[2,2,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Admin: Member Task Status Matrix */}
      {isAdmin && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={{ background: 'var(--bg-panel)', border: '1px solid rgba(0,245,255,0.15)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Users size={14} color="var(--neon-cyan)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>
              MEMBER TASK STATUS OVERVIEW
            </h3>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
              ADMIN VIEW
            </span>
          </div>
          <MemberMatrix data={memberTaskMatrix} />
        </motion.div>
      )}

      {/* Admin: User Activity Count */}
      {isAdmin && userActivityCounts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.48 }}
          style={{ background: 'var(--bg-panel)', border: '1px solid rgba(191,0,255,0.15)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Activity size={14} color="var(--neon-purple)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--neon-purple)', letterSpacing: '2px' }}>
              USER ACTIVITY COUNT
            </h3>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)' }}>
              TOTAL ACTIONS PER OPERATIVE
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {userActivityCounts.slice(0, 12).map((entry, i) => {
              const max = userActivityCounts[0]?.count || 1;
              const pct = Math.round((entry.count / max) * 100);
              return (
                <motion.div key={entry.user?._id || i}
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  style={{ background: 'rgba(191,0,255,0.04)', border: '1px solid rgba(191,0,255,0.12)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--neon-purple), var(--neon-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, color: 'var(--bg-void)' }}>
                      {entry.user?.fullName?.[0]?.toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.user?.fullName}
                      </div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 900, color: 'var(--neon-purple)' }}>
                        {entry.count} <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 400, letterSpacing: '1px' }}>ACTIONS</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg-hover)', borderRadius: 2 }}>
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, delay: 0.05 * i }}
                      style={{ height: '100%', borderRadius: 2, background: 'var(--neon-purple)', boxShadow: '0 0 6px rgba(191,0,255,0.6)' }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Bottom row: deadlines + activity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Upcoming Deadlines */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <Calendar size={14} color="var(--neon-cyan)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>UPCOMING DEADLINES</h3>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 24, fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-muted)' }}>NO UPCOMING DEADLINES</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingDeadlines.slice(0, 7).map(task => {
                const daysLeft = Math.ceil((new Date(task.dueDate) - new Date()) / 86400000);
                const urgentColor = daysLeft <= 1 ? 'var(--neon-pink)' : daysLeft <= 3 ? 'var(--neon-orange)' : 'var(--neon-cyan)';
                const assigneeList = task.assignees?.map(a => a.fullName).join(', ') || '—';
                return (
                  <div key={task._id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 12px', background: 'rgba(0,245,255,0.02)',
                    border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-md)'
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', marginTop: 2 }}>
                        <span style={{ color: task.project?.color }}>{task.project?.name}</span>
                        {isAdmin && assigneeList !== '—' && <span> · {assigneeList}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '11px', color: urgentColor }}>{fmtDate(task.dueDate)}</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: urgentColor, marginTop: 2 }}>
                        {daysLeft === 0 ? 'TODAY' : daysLeft === 1 ? '1 DAY' : `${daysLeft} DAYS`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Activity Feed */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-dim)', borderRadius: 'var(--radius-lg)', padding: 24, maxHeight: 520, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexShrink: 0 }}>
            <Activity size={14} color="var(--neon-cyan)" />
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: 'var(--neon-cyan)', letterSpacing: '2px' }}>
              {isAdmin ? 'ALL SYSTEM ACTIVITY' : 'YOUR ACTIVITY'}
            </h3>
            {isAdmin && (
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'var(--text-muted)', background: 'rgba(0,245,255,0.06)', border: '1px solid rgba(0,245,255,0.2)', padding: '2px 8px', borderRadius: 2 }}>
                ALL USERS
              </span>
            )}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <ActivityFeed activities={recentActivity} isAdmin={isAdmin} />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
