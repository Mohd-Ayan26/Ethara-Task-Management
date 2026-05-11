import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, Lock, Mail, User, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const validatePassword = (pass) => {
  const errors = [];
  if (pass.length < 8) errors.push('Min 8 characters');
  if (!/[A-Z]/.test(pass)) errors.push('One uppercase letter');
  if (!/[0-9]/.test(pass)) errors.push('One number');
  return errors;
};

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'member' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const passErrors = form.password ? validatePassword(form.password) : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passErrors.length > 0) {
      toast.error('Password does not meet requirements');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('ACCESS GRANTED — WELCOME TO THE NEXUS');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const inputProps = (field, type = 'text', placeholder = '', icon) => ({
    type: type === 'password' ? (showPass ? 'text' : 'password') : type,
    className: 'cyber-input',
    style: { paddingLeft: 36 },
    placeholder,
    value: form[field],
    onChange: e => setForm(f => ({ ...f, [field]: e.target.value })),
    required: true
  });

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-void)', padding: '20px', position: 'relative', overflow: 'hidden'
    }} className="grid-bg">
      <div style={{
        position: 'absolute', top: '30%', right: '20%',
        width: 500, height: 500, background: 'radial-gradient(circle, rgba(191,0,255,0.05) 0%, transparent 70%)',
        pointerEvents: 'none'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ width: '100%', maxWidth: 480 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Zap size={36} color="var(--neon-cyan)" style={{ marginBottom: 10 }} />
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 900,
            color: 'var(--neon-cyan)', letterSpacing: '5px',
            textShadow: '0 0 20px var(--neon-cyan)'
          }}>
            ETHARA AI
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '3px', marginTop: 4 }}>
            REQUEST SYSTEM CLEARANCE
          </p>
        </div>

        <div style={{
          background: 'var(--bg-panel)', border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-xl)', padding: '36px',
          boxShadow: '0 0 60px rgba(0,245,255,0.06)'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Full Name */}
            <div>
              <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8 }}>
                OPERATIVE NAME
              </label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input {...inputProps('fullName', 'text', 'Full Name')} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8 }}>
                EMAIL IDENTIFIER
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input {...inputProps('email', 'email', 'operative@ethara.ai')} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8 }}>
                ACCESS KEY
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input {...inputProps('password', 'password', 'Min 8 chars, 1 uppercase, 1 number')} style={{ paddingLeft: 36, paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {form.password && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['Min 8 characters', 'One uppercase letter', 'One number'].map(req => {
                    const passing = !passErrors.includes(req);
                    return (
                      <span key={req} style={{
                        fontFamily: 'var(--font-mono)', fontSize: '10px',
                        color: passing ? 'var(--neon-green)' : 'var(--text-muted)',
                        display: 'flex', alignItems: 'center', gap: 4
                      }}>
                        {passing ? '✓' : '○'} {req}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Role */}
            <div>
              <label style={{ fontFamily: 'var(--font-display)', fontSize: '10px', color: 'var(--neon-cyan)', letterSpacing: '2px', display: 'block', marginBottom: 8 }}>
                CLEARANCE LEVEL
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['member', 'admin'].map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role }))}
                    style={{
                      flex: 1, padding: '12px', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 8,
                      background: form.role === role ? (role === 'admin' ? 'rgba(255,0,144,0.1)' : 'rgba(0,245,255,0.1)') : 'transparent',
                      border: `1px solid ${form.role === role ? (role === 'admin' ? 'var(--neon-pink)' : 'var(--neon-cyan)') : 'var(--border-dim)'}`,
                      borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '1px',
                      color: form.role === role ? (role === 'admin' ? 'var(--neon-pink)' : 'var(--neon-cyan)') : 'var(--text-muted)',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Shield size={14} />
                    {role.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading || passErrors.length > 0}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              style={{
                marginTop: 8, width: '100%', padding: '14px',
                background: (loading || passErrors.length > 0) ? 'rgba(0,245,255,0.2)' : 'var(--neon-cyan)',
                border: 'none', borderRadius: 'var(--radius-sm)', cursor: (loading || passErrors.length > 0) ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700,
                letterSpacing: '3px', color: 'var(--bg-void)',
                boxShadow: loading ? 'none' : '0 0 30px rgba(0,245,255,0.4)'
              }}
            >
              {loading ? 'PROCESSING...' : 'REQUEST ACCESS'}
            </motion.button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center', fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--text-muted)' }}>
            Already cleared?{' '}
            <Link to="/login" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }}>
              AUTHENTICATE
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
