import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      toast.error('All fields required');
      return;
    }
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('NEURAL LINK ESTABLISHED');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-void)', padding: '20px', position: 'relative', overflow: 'hidden'
    }}
    className="grid-bg">
      {/* Ambient glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, background: 'radial-gradient(circle, rgba(0,245,255,0.05) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', left: '30%',
        width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,0,144,0.04) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: 440 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <motion.div
            animate={{ filter: ['drop-shadow(0 0 10px #00f5ff)', 'drop-shadow(0 0 20px #00f5ff)', 'drop-shadow(0 0 10px #00f5ff)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ marginBottom: 12 }}
          >
            <Zap size={40} color="var(--neon-cyan)" />
          </motion.div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '32px', fontWeight: 900,
            color: 'var(--neon-cyan)', letterSpacing: '6px',
            textShadow: '0 0 20px var(--neon-cyan), 0 0 40px rgba(0,245,255,0.3)'
          }}>
            ETHARA AI
          </h1>
          <p style={{
            fontFamily: 'var(--font-mono)', fontSize: '10px',
            color: 'var(--text-muted)', letterSpacing: '4px', marginTop: 4
          }}>
            TASK NEXUS // AUTHENTICATE
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          boxShadow: '0 0 60px rgba(0,245,255,0.08), 0 25px 60px rgba(0,0,0,0.5)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Email */}
            <div>
              <label style={{
                fontFamily: 'var(--font-display)', fontSize: '10px',
                color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8
              }}>
                EMAIL IDENTIFIER
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', pointerEvents: 'none'
                }} />
                <input
                  type="email"
                  className="cyber-input"
                  style={{ paddingLeft: 36 }}
                  placeholder="user@ethara.ai"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{
                fontFamily: 'var(--font-display)', fontSize: '10px',
                color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8
              }}>
                ACCESS KEY
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)', pointerEvents: 'none'
                }} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="cyber-input"
                  style={{ paddingLeft: 36, paddingRight: 40 }}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)'
                  }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                marginTop: 8,
                width: '100%', padding: '14px',
                background: loading ? 'rgba(0,245,255,0.2)' : 'var(--neon-cyan)',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
                letterSpacing: '3px', color: 'var(--bg-void)',
                boxShadow: loading ? 'none' : '0 0 30px rgba(0,245,255,0.4)',
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'AUTHENTICATING...' : 'INITIALIZE CONNECTION'}
            </motion.button>
          </form>

          <div style={{
            marginTop: 24, textAlign: 'center',
            fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)'
          }}>
            No access credentials?{' '}
            <Link to="/register" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }}>
              SIGNUP
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
