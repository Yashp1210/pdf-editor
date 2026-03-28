import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { encryptedJsonFetch } from '../utils/encryptedJsonFetch';

export default function LoginPage({ user, onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();

  const fromPath = useMemo(() => {
    const stateFrom = location.state?.from?.pathname;
    return typeof stateFrom === 'string' && stateFrom.length > 0 ? stateFrom : '/';
  }, [location.state]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileTokenRef = useRef('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!turnstileSiteKey) return;

    if (document.querySelector('script[data-turnstile="1"]')) return;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    s.defer = true;
    s.setAttribute('data-turnstile', '1');
    document.head.appendChild(s);
  }, [turnstileSiteKey]);

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!turnstileSiteKey) return;

    // IMPORTANT: Don't gate on `window.turnstile`.
    // The script loads async; the callback functions must exist on `window`
    // so Turnstile can call them when the user completes the challenge.
    window.onTurnstileCallback = (token) => {
      const nextToken = typeof token === 'string' ? token : '';
      turnstileTokenRef.current = nextToken;
      setTurnstileToken(nextToken);
      if (nextToken) setError('');
      console.log('[Turnstile] Token received:', nextToken ? `${nextToken.slice(0, 20)}...` : 'empty');
    };
    window.onTurnstileExpire = () => {
      turnstileTokenRef.current = '';
      setTurnstileToken('');
      console.log('[Turnstile] Token expired');
    };
    window.onTurnstileError = (errorCode) => {
      turnstileTokenRef.current = '';
      setTurnstileToken('');
      console.error('[Turnstile] Error:', errorCode);
    };
  }, [turnstileSiteKey]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const tokenToSend = String(turnstileTokenRef.current || turnstileToken || '');

    if (!turnstileSiteKey) {
      setError('Captcha is not configured');
      return;
    }
    if (!tokenToSend) {
      setError('Please complete the captcha');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await encryptedJsonFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password, turnstileToken: tokenToSend },
      });

      if (!data?.success) {
        setError(data?.message || 'Login failed');
        return;
      }

      await onLogin?.();
      navigate(fromPath, { replace: true });
    } catch (err) {
      setError(err?.message || 'Login failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  const styles = {
    container: {
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
      position: 'relative',
      overflow: 'hidden',
    },
    orb1: {
      position: 'absolute',
      top: '-50%',
      right: '-50%',
      width: '600px',
      height: '600px',
      background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
      borderRadius: '50%',
      filter: 'blur(60px)',
    },
    orb2: {
      position: 'absolute',
      bottom: '-30%',
      left: '-30%',
      width: '500px',
      height: '500px',
      background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
      borderRadius: '50%',
      filter: 'blur(60px)',
    },
    card: {
      position: 'relative',
      zIndex: 10,
      width: '100%',
      maxWidth: '420px',
      background: 'rgba(30, 41, 59, 0.7)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(148, 163, 184, 0.2)',
      borderRadius: '20px',
      padding: '48px 40px',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    },
    header: {
      textAlign: 'center',
      marginBottom: '32px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#f1f5f9',
      marginBottom: '8px',
      letterSpacing: '-0.5px',
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: '20px',
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    },
    label: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#e2e8f0',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      fontSize: '14px',
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      border: '1.5px solid rgba(148, 163, 184, 0.2)',
      borderRadius: '12px',
      color: '#f1f5f9',
      transition: 'all 0.3s ease',
      outline: 'none',
      fontFamily: 'inherit',
    },
    inputFocus: {
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      borderColor: 'rgba(99, 102, 241, 0.5)',
      boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)',
    },
    errorMessage: {
      fontSize: '13px',
      color: '#ff6b6b',
      fontWeight: '500',
      padding: '12px 14px',
      backgroundColor: 'rgba(255, 107, 107, 0.1)',
      borderRadius: '8px',
      borderLeft: '3px solid #ff6b6b',
    },
    captchaContainer: {
      padding: '12px',
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      border: '1.5px solid rgba(148, 163, 184, 0.2)',
      borderRadius: '12px',
      display: 'flex',
      justifyContent: 'center',
    },
    button: {
      width: '100%',
      padding: '14px 20px',
      marginTop: '8px',
      fontSize: '15px',
      fontWeight: '600',
      color: '#ffffff',
      background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
      border: 'none',
      borderRadius: '12px',
      cursor: isSubmitting ? 'not-allowed' : 'pointer',
      transition: 'all 0.3s ease',
      opacity: isSubmitting ? 0.7 : 1,
      boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
    },
    buttonHover: {
      transform: 'translateY(-2px)',
      boxShadow: '0 15px 35px rgba(99, 102, 241, 0.4)',
    },
  };

  const [buttonHover, setButtonHover] = useState(false);

  return (
    <div style={styles.container}>
      <div style={styles.orb1} />
      <div style={styles.orb2} />

      <div style={styles.card}>
        <div style={styles.header}>
          <h1 style={styles.title}>PDF Editor</h1>
        </div>

        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>📧 Email Address</label>
            <input
              style={{
                ...styles.input,
                ...(focusedField === 'email' ? styles.inputFocus : {}),
              }}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>🔐 Password</label>
            <input
              style={{
                ...styles.input,
                ...(focusedField === 'password' ? styles.inputFocus : {}),
              }}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>✓ Verification</label>
            <div style={styles.captchaContainer}>
              {turnstileSiteKey ? (
                <div
                  className="cf-turnstile"
                  data-sitekey={turnstileSiteKey}
                  data-callback="onTurnstileCallback"
                  data-error-callback="onTurnstileError"
                  data-expired-callback="onTurnstileExpire"
                  data-theme="dark"
                />
              ) : (
                <div style={{ fontSize: '12px', color: '#cbd5e1' }}>Captcha not configured</div>
              )}
            </div>
          </div>

          {error && (
            <div style={styles.errorMessage}>
              ⚠️ {error}
            </div>
          )}

          <button
            style={{
              ...styles.button,
              ...(buttonHover && !isSubmitting ? styles.buttonHover : {}),
            }}
            type="submit"
            disabled={isSubmitting}
            onMouseEnter={() => setButtonHover(true)}
            onMouseLeave={() => setButtonHover(false)}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  animation: 'spin 1s linear infinite',
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                }}>
                </span>
                Logging in…
              </span>
            ) : (
              '🚀 Login to Dashboard'
            )}
          </button>
        </form>

        <p style={{
          marginTop: '24px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#94a3b8',
        }}>
          Secured by encryption • Premium access
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(226, 232, 240, 0.5);
        }
        /* Fix browser autofill styles - keep dark theme */
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px rgba(15, 23, 42, 0.8) inset !important;
          -webkit-text-fill-color: #f1f5f9 !important;
          border-color: rgba(99, 102, 241, 0.5) !important;
        }
        /* Turnstile dark theme styling */
        .cf-turnstile {
          transform: scale(0.9);
          transform-origin: 0 0;
          margin: -8px 0;
        }
      `}</style>
    </div>
  );
}


// Ensure Turnstile callbacks exist at window level
// (Turnstile calls these when challenge events occur)
if (typeof window !== 'undefined') {
  if (!window.onTurnstileCallback) window.onTurnstileCallback = () => {};
  if (!window.onTurnstileError) window.onTurnstileError = () => {};
  if (!window.onTurnstileExpire) window.onTurnstileExpire = () => {};
}
