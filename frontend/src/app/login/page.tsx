'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn, getCurrentUser, getHomeForRole, DEMO_CREDENTIALS } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    const user = getCurrentUser();
    if (user) router.replace(getHomeForRole(user));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const user = await signIn(username.trim(), password);
      router.push(getHomeForRole(user));
    } catch {
      setError('AUTHORIZATION FAILED: INVALID CREDENTIALS');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.6rem 0.75rem',
    background: 'transparent',
    border: '1px solid rgba(240,235,224,0.2)',
    color: 'var(--setu-paper)',
    fontSize: '0.85rem',
    fontFamily: 'Courier New, monospace',
    outline: 'none',
    transition: 'border-color 150ms',
    boxSizing: 'border-box',
    borderRadius: '0',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--setu-paper)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-ui)',
      position: 'relative',
    }}>
      {/* Subtle Terminal Grid Background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        backgroundImage: `linear-gradient(var(--setu-dust) 1px, transparent 1px),
                          linear-gradient(90deg, var(--setu-dust) 1px, transparent 1px)`,
        backgroundSize: '2rem 2rem',
        opacity: 0.3,
        zIndex: 0,
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--setu-paper)',
          border: '1px solid var(--setu-dust)',
          padding: '2rem',
          position: 'relative',
          zIndex: 1,
          boxShadow: '0 20px 40px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: '1.8rem',
            letterSpacing: '-0.03em',
            color: 'var(--setu-ink)',
            lineHeight: 1,
            marginBottom: '0.2rem'
          }}>
            SETU // TERMINAL
          </div>
          <div className="setu-label">System Authentication</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label className="setu-label" style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--setu-ink)' }}>
              &gt; OPERATOR_ID
            </label>
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              placeholder="e.g. coordinator.demo"
              style={{ ...inputStyle, color: 'var(--setu-ink)', borderColor: 'var(--setu-dust)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--setu-ink)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--setu-dust)')}
            />
          </div>
          <div>
            <label className="setu-label" style={{ display: 'block', marginBottom: '0.4rem', color: 'var(--setu-ink)' }}>
              &gt; PASSPHRASE
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              style={{ ...inputStyle, color: 'var(--setu-ink)', borderColor: 'var(--setu-dust)' }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--setu-ink)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--setu-dust)')}
            />
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{
                  padding: '0.5rem',
                  borderLeft: '2px solid var(--setu-crisis)',
                  background: 'rgba(185,28,28,0.1)',
                  fontSize: '0.75rem',
                  color: 'var(--setu-crisis)',
                  fontWeight: 600,
                  fontFamily: 'Courier New, monospace',
                  marginTop: '-0.5rem'
                }}>
                  {error}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            id="login-submit"
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{
              marginTop: '0.5rem',
              padding: '0.75rem',
              background: loading || !username.trim() || !password ? 'var(--setu-bone)' : 'var(--setu-ink)',
              color: loading || !username.trim() || !password ? 'var(--setu-ash)' : 'var(--setu-paper)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.8rem',
              letterSpacing: '0.1em',
              cursor: loading || !username.trim() || !password ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-ui)',
              transition: 'all 150ms',
            }}
          >
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE SESSION'}
          </button>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--setu-dust)' }}>
          <div className="setu-label" style={{ marginBottom: '0.75rem', color: 'var(--setu-dim)' }}>DEMO ACCESS PROFILES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {DEMO_CREDENTIALS.map(cred => (
              <button
                key={cred.username}
                onClick={() => fillDemo(cred.username, cred.password)}
                style={{
                  background: 'var(--setu-bone)',
                  border: '1px solid var(--setu-dust)',
                  padding: '0.4rem 0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  transition: 'background 150ms',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--setu-dust)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--setu-bone)')}
              >
                <span style={{ fontSize: '0.7rem', color: 'var(--setu-ink)', fontWeight: 600 }}>{cred.label}</span>
                <span style={{ fontSize: '0.65rem', color: 'var(--setu-dim)', fontFamily: 'Courier New, monospace' }}>{cred.username}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
