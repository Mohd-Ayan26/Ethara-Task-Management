import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, FolderOpen, CheckSquare, Users,
  LogOut, Menu, X, Zap, ChevronRight, Shield
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'DASHBOARD' },
  { to: '/projects', icon: FolderOpen, label: 'PROJECTS' },
  { to: '/tasks', icon: CheckSquare, label: 'TASKS' },
];

const adminItems = [
  { to: '/users', icon: Users, label: 'USERS' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('DISCONNECTED FROM NEXUS');
    navigate('/login');
  };

  const navStyle = ({ isActive }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : 12,
    padding: collapsed ? '12px' : '12px 16px',
    justifyContent: collapsed ? 'center' : 'flex-start',
    borderRadius: 'var(--radius-md)',
    textDecoration: 'none',
    fontFamily: 'var(--font-display)',
    fontSize: '11px',
    letterSpacing: '1.5px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    position: 'relative',
    color: isActive ? 'var(--neon-cyan)' : 'var(--text-muted)',
    background: isActive ? 'rgba(0, 245, 255, 0.08)' : 'transparent',
    border: `1px solid ${isActive ? 'rgba(0, 245, 255, 0.2)' : 'transparent'}`,
    overflow: 'hidden'
  });

  const SidebarContent = () => (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%',
      background: 'var(--bg-panel)',
      borderRight: '1px solid var(--border-dim)',
      transition: 'width 0.3s ease',
      width: collapsed ? 64 : 240
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 12px' : '24px 20px',
        borderBottom: '1px solid var(--border-dim)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        {!collapsed && (
          <div>
            <div style={{
              fontFamily: 'var(--font-display)', fontWeight: 900,
              fontSize: '16px', color: 'var(--neon-cyan)',
              textShadow: '0 0 10px var(--neon-cyan)', letterSpacing: '3px'
            }}>
              ETHARA AI
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '9px',
              color: 'var(--text-muted)', letterSpacing: '2px', marginTop: 2
            }}>
              TASK NEXUS v1.0
            </div>
          </div>
        )}
        {collapsed && <Zap size={20} color="var(--neon-cyan)" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', display: 'flex', padding: 4
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <X size={16} />}
        </button>
      </div>

      {/* User badge */}
      {!collapsed && (
        <div style={{
          margin: '16px',
          padding: '12px',
          background: 'rgba(0, 245, 255, 0.04)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--radius-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-pink))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: '12px',
              fontWeight: 700, color: 'var(--bg-void)', flexShrink: 0
            }}>
              {user?.fullName?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontFamily: 'var(--font-body)', fontSize: '13px',
                fontWeight: 600, color: 'var(--text-primary)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
                {user?.fullName}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4
              }}>
                {user?.role === 'admin' && <Shield size={10} color="var(--neon-pink)" />}
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '9px',
                  color: user?.role === 'admin' ? 'var(--neon-pink)' : 'var(--text-muted)',
                  letterSpacing: '1px'
                }}>
                  {user?.role?.toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {!collapsed && (
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '9px',
            color: 'var(--text-muted)', letterSpacing: '2px',
            padding: '8px 4px 4px'
          }}>
            NAVIGATION
          </div>
        )}
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={navStyle}
            onMouseEnter={e => {
              if (!e.currentTarget.style.background.includes('0.08')) {
                e.currentTarget.style.background = 'rgba(0, 245, 255, 0.04)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.style.background.includes('0.08')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-muted)';
              }
            }}
          >
            <Icon size={16} style={{ flexShrink: 0 }} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}

        {user?.role === 'admin' && (
          <>
            {!collapsed && (
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '9px',
                color: 'var(--text-muted)', letterSpacing: '2px',
                padding: '12px 4px 4px'
              }}>
                ADMIN
              </div>
            )}
            {adminItems.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} style={navStyle}>
                <Icon size={16} style={{ flexShrink: 0 }} />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px', borderTop: '1px solid var(--border-dim)' }}>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 12, padding: collapsed ? '10px' : '10px 16px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent', border: '1px solid transparent',
            borderRadius: 'var(--radius-md)', cursor: 'pointer',
            color: 'var(--text-muted)', fontFamily: 'var(--font-display)',
            fontSize: '11px', letterSpacing: '1.5px', fontWeight: 600,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--neon-pink)';
            e.currentTarget.style.borderColor = 'rgba(255, 0, 144, 0.2)';
            e.currentTarget.style.background = 'rgba(255, 0, 144, 0.05)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <LogOut size={16} style={{ flexShrink: 0 }} />
          {!collapsed && <span>DISCONNECT</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div style={{ display: 'flex', height: '100vh', position: 'sticky', top: 0, flexShrink: 0 }}
        className="desktop-sidebar">
        <SidebarContent />
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="mobile-menu-btn"
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 999,
          background: 'var(--bg-panel)', border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-sm)', padding: 10, cursor: 'pointer',
          color: 'var(--neon-cyan)', display: 'none'
        }}
      >
        <Menu size={18} />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
                zIndex: 1000, backdropFilter: 'blur(4px)'
              }}
            />
            <motion.div
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 30 }}
              style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 1001 }}
            >
              <div style={{ position: 'relative', height: '100%' }}>
                <SidebarContent />
                <button
                  onClick={() => setMobileOpen(false)}
                  style={{
                    position: 'absolute', top: 20, right: -40,
                    background: 'var(--bg-panel)', border: '1px solid var(--border-dim)',
                    borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                    padding: 8, cursor: 'pointer', color: 'var(--text-muted)'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
