import React, { useState, useEffect, useCallback } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import api from './services/api';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Businesses from './pages/Businesses';
import Jobs from './pages/Jobs';
import CalendarView from './pages/CalendarView';
import ChatHub from './pages/ChatHub';
import Profile from './pages/Profile';

// Icons
import {
  LayoutDashboard,
  Briefcase,
  ClipboardList,
  CalendarDays,
  MessageSquare,
  UserCircle,
  ChevronDown,
  LogOut,
  Bell,
  Menu,
  X,
  CheckCheck,
} from 'lucide-react';

// ─── Protected Route ──────────────────────────────────────────────────────────
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-brand border-t-transparent animate-spin" />
          <p className="text-zinc-400 text-sm">Loading Delegate…</p>
        </div>
      </div>
    );
  }

  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

// ─── Notifications Panel ──────────────────────────────────────────────────────
interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  isRead: boolean;
  link?: string;
  createdAt: string;
}

const NotificationsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch { /* silent */ }
  };

  const markRead = async (id: string, link?: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      if (link) { onClose(); navigate(link); }
    } catch { /* silent */ }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />
      {/* Panel */}
      <div className="fixed right-2 top-[60px] z-50 w-[340px] max-h-[80vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="font-bold text-white text-sm">Notifications {unreadCount > 0 && <span className="ml-1.5 text-xs bg-brand text-zinc-900 px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>}</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand hover:underline flex items-center gap-1">
                <CheckCheck size={12} /> Mark all read
              </button>
            )}
            <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <p className="text-center text-zinc-500 text-sm py-8">Loading…</p>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell size={32} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => markRead(n.id, n.link)}
                className={`w-full text-left px-4 py-3.5 border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/50 transition-colors ${
                  !n.isRead ? 'bg-brand/5' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {!n.isRead && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand shrink-0" />}
                  <div className={!n.isRead ? '' : 'ml-4'}>
                    <p className="text-sm font-semibold text-zinc-200">{n.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{n.description}</p>
                    <p className="text-[10px] text-zinc-600 mt-1.5">
                      {new Date(n.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </>
  );
};

// ─── App Shell (with nav) ─────────────────────────────────────────────────────
const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/businesses', label: 'Teams', icon: Briefcase },
  { path: '/jobs', label: 'Jobs', icon: ClipboardList },
  { path: '/calendar', label: 'Calendar', icon: CalendarDays },
  { path: '/chat', label: 'Chat', icon: MessageSquare },
];

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, businesses, currentBusiness, selectBusiness, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [bizMenuOpen, setBizMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread notification count every 30s
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setUnreadCount(res.data.filter((n: any) => !n.isRead).length);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };



  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-white">
      {/* ── Top Header ── */}
      <header className="sticky top-0 z-40 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + Business Picker */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
              <span className="text-zinc-900 font-black text-sm">D</span>
            </div>
            <span className="font-bold text-white hidden sm:block">Delegate</span>
          </div>

          {/* Business Selector */}
          {businesses.length > 0 && (
            <div className="relative">
              <button
                id="business-selector-btn"
                onClick={() => setBizMenuOpen(!bizMenuOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm font-medium text-zinc-200 max-w-[140px] sm:max-w-[220px]"
              >
                <Briefcase size={13} className="text-brand shrink-0" />
                <span className="truncate">{currentBusiness?.name ?? 'Select Team'}</span>
                <ChevronDown size={13} className={`shrink-0 transition-transform ${bizMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {bizMenuOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {businesses.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => { selectBusiness(biz); setBizMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-4 py-3 text-sm hover:bg-zinc-700 transition-colors text-left ${currentBusiness?.id === biz.id ? 'text-brand font-semibold' : 'text-zinc-200'}`}
                    >
                      <div className="w-6 h-6 rounded-md bg-zinc-700 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                        {biz.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{biz.name}</span>
                      <span className="ml-auto text-xs text-zinc-500 capitalize">{biz.userRole}</span>
                    </button>
                  ))}
                  <div className="border-t border-zinc-700">
                    <button
                      onClick={() => { navigate('/businesses'); setBizMenuOpen(false); }}
                      className="w-full px-4 py-3 text-sm text-brand hover:bg-zinc-700 text-left transition-colors"
                    >
                      + Create / Join Team
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Notifications + Profile */}
        <div className="flex items-center gap-2">
          <button
            id="notifications-btn"
            onClick={() => { setNotifOpen(!notifOpen); if (!notifOpen) setUnreadCount(0); }}
            className="relative w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center justify-center"
          >
            <Bell size={16} className="text-zinc-300" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-brand text-zinc-900 text-[10px] font-black flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <button
            id="profile-nav-btn"
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center">
              <span className="text-zinc-900 font-bold text-xs">
                {user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'}
              </span>
            </div>
            <span className="text-sm text-zinc-200 hidden sm:block max-w-[80px] truncate">{user?.fullName}</span>
          </button>

          {/* Mobile hamburger for logout */}
          <button
            id="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="w-9 h-9 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors flex items-center justify-center sm:hidden"
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>

          <button
            id="logout-btn"
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-900/50 hover:text-red-400 transition-colors text-sm text-zinc-400"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden bg-zinc-900 border-b border-zinc-800 px-4 py-2 z-30">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      )}

      {/* ── Page Content ── */}
      <main className="flex-1 overflow-auto pb-20 sm:pb-6">
        {children}
      </main>

      {/* ── Bottom Navigation (mobile) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-900/95 backdrop-blur-md border-t border-zinc-800 sm:hidden">
        <div className="flex items-center justify-around px-2 py-2 safe-area-bottom">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname.startsWith(path);
            return (
              <button
                key={path}
                id={`nav-${label.toLowerCase()}`}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-brand'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <div className={`relative p-1 rounded-lg transition-all duration-200 ${isActive ? 'bg-brand/15' : ''}`}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                  {isActive && (
                    <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-brand" />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-brand' : ''}`}>{label}</span>
              </button>
            );
          })}
          {/* Profile in nav */}
          <button
            id="nav-profile"
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 ${
              location.pathname === '/profile' ? 'text-brand' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <div className={`relative p-1 rounded-lg transition-all duration-200 ${location.pathname === '/profile' ? 'bg-brand/15' : ''}`}>
              <UserCircle size={20} strokeWidth={location.pathname === '/profile' ? 2.5 : 1.8} />
            </div>
            <span className={`text-[10px] font-medium ${location.pathname === '/profile' ? 'text-brand' : ''}`}>Profile</span>
          </button>
        </div>
      </nav>

      {/* ── Side Navigation (desktop) ── */}
      <aside className="hidden sm:flex fixed left-0 top-[57px] bottom-0 w-56 bg-zinc-900 border-r border-zinc-800 flex-col gap-1 p-3 z-30">
        {navItems.map(({ path, label, icon: Icon }) => {
          const isActive = location.pathname.startsWith(path);
          return (
            <button
              key={path}
              id={`sidenav-${label.toLowerCase()}`}
              onClick={() => navigate(path)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left ${
                isActive
                  ? 'bg-brand/15 text-brand border border-brand/20'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 1.8} />
              {label}
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />}
            </button>
          );
        })}
        <button
          id="sidenav-profile"
          onClick={() => navigate('/profile')}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 w-full text-left ${
            location.pathname === '/profile'
              ? 'bg-brand/15 text-brand border border-brand/20'
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          }`}
        >
          <UserCircle size={18} />
          Profile
          {location.pathname === '/profile' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand" />}
        </button>

        <div className="mt-auto border-t border-zinc-800 pt-3">
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
            <p className="text-xs text-zinc-600">v1.0.0</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:bg-red-900/20 hover:text-red-400 transition-all duration-200 w-full text-left"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Desktop content offset for sidebar */}
      <style>{`
        @media (min-width: 640px) {
          main { margin-left: 224px; }
        }
      `}</style>

      {/* Click-away overlay for business menu */}
      {bizMenuOpen && (
        <div className="fixed inset-0 z-30" onClick={() => setBizMenuOpen(false)} />
      )}

      {/* Notifications Panel */}
      {notifOpen && <NotificationsPanel onClose={() => setNotifOpen(false)} />}
    </div>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
const AppRoutes: React.FC = () => {
  const { token } = useAuth();

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <Register />} />

      {/* Protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/businesses"
        element={
          <ProtectedRoute>
            <AppShell>
              <Businesses />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <AppShell>
              <Jobs />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <AppShell>
              <CalendarView />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <AppShell>
              <ChatHub />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppShell>
              <Profile />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* Default redirect */}
      <Route path="/" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
      <Route path="*" element={<Navigate to={token ? '/dashboard' : '/login'} replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
};

export default App;
