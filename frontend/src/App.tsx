import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/authContext';
import { ThemeProvider } from './store/themeContext';
import { LocaleProvider } from './store/localeContext';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Practice from './pages/Practice';
import Admin from './pages/Admin';
import ParentDashboard from './pages/ParentDashboard';
import LeaderboardPage from './pages/LeaderboardPage';
import SpeedRunPage from './pages/SpeedRunPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function ParentRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'parent' && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
    <LocaleProvider>
    <div className="app">
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/practice"
          element={
            <ProtectedRoute>
              <Practice />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        <Route
          path="/parent"
          element={
            <ParentRoute>
              <ParentDashboard />
            </ParentRoute>
          }
        />
        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute>
              <LeaderboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/speedrun"
          element={
            <ProtectedRoute>
              <SpeedRunPage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
    </LocaleProvider>
    </ThemeProvider>
  );
}

export default App;
