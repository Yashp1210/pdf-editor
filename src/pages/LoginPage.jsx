import { useEffect, useMemo, useState } from 'react';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!turnstileSiteKey) return;

    // Load Turnstile script once.
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
    function onToken(e) {
      const token = e?.detail?.token;
      if (typeof token === 'string') setTurnstileToken(token);
    }
    window.addEventListener('turnstile-token', onToken);
    return () => window.removeEventListener('turnstile-token', onToken);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!turnstileSiteKey) {
      setError('Captcha is not configured');
      return;
    }
    if (!turnstileToken) {
      setError('Please complete the captcha');
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await encryptedJsonFetch('/api/auth/login', {
        method: 'POST',
        body: { email, password, turnstileToken },
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

  return (
    <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-900">Login</h1>
        <p className="text-sm text-gray-600 mt-1">Access is restricted.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Captcha</label>
            <div className="mt-2">
              {turnstileSiteKey ? (
                <div
                  className="cf-turnstile"
                  data-sitekey={turnstileSiteKey}
                  data-callback="onTurnstile"
                />
              ) : (
                <div className="text-sm text-gray-600">Captcha not configured.</div>
              )}
            </div>
          </div>

          {error ? (
            <div className="text-sm text-red-600">{error}</div>
          ) : null}

          <button
            className="w-full rounded-md bg-gray-900 text-white px-4 py-2 text-sm font-medium disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// Turnstile calls a global callback; keep it minimal and wire into React via a custom event.
if (typeof window !== 'undefined' && !window.onTurnstile) {
  window.onTurnstile = (token) => {
    window.dispatchEvent(new CustomEvent('turnstile-token', { detail: { token } }));
  };
}
