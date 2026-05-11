import { motion } from 'framer-motion';

export default function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--bg-void)',
      gap: '24px'
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center' }}
      >
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: '28px',
          fontWeight: 900,
          color: 'var(--neon-cyan)',
          letterSpacing: '6px',
          textShadow: '0 0 20px var(--neon-cyan)',
          marginBottom: '8px'
        }}>
          ETHARA AI
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-muted)',
          letterSpacing: '4px'
        }}>
          INITIALIZING NEXUS...
        </div>
      </motion.div>

      <div style={{ position: 'relative', width: 60, height: 60 }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '100%',
            height: '100%',
            border: '2px solid var(--border-dim)',
            borderTopColor: 'var(--neon-cyan)',
            borderRadius: '50%'
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: 8,
            border: '2px solid var(--border-dim)',
            borderTopColor: 'var(--neon-pink)',
            borderRadius: '50%'
          }}
        />
      </div>
    </div>
  );
}
