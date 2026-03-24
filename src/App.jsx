import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import IRCTCEditor from './components/IRCTCEditor';
import LoginPage from './pages/LoginPage';

function RequireAuth({ user, loading, children }) {
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-600">Loading…</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  async function refreshMe() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json().catch(() => null);
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshMe();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage user={user} onLogin={refreshMe} />} />
        <Route
          path="/"
          element={
            <RequireAuth user={user} loading={loading}>
              <IRCTCEditor />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;