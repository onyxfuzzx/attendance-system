import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { 
  LayoutDashboard, 
  Camera, 
  UserCircle, 
  MapPin, 
  Clock, 
  Users, 
  FileEdit, 
  BookOpen, 
  LogOut,
  Menu,
  X,
  Flame
} from 'lucide-react';
import { useState } from 'react';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Locations from './pages/Locations';
import Shifts from './pages/Shifts';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Corrections from './pages/Corrections';
import QRScanner from './pages/QRScanner';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <div className="relative">
          <div className="w-14 h-14 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-14 h-14 border-2 border-transparent border-b-amber-500/40 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        </div>
        <p className="mt-6 text-amber-500/60 font-bold text-[10px] uppercase tracking-[0.3em] animate-pulse">Initializing Security Layer</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, category: 'Core Intelligence' },
    ...(user?.role !== 'admin' ? [{ to: '/scan', label: 'Check In', icon: Camera, category: 'Core Intelligence' }] : []),
    { to: '/profile', label: 'Account Settings', icon: UserCircle, category: 'Core Intelligence' },
  ];

  const adminItems = [
    { to: '/locations', label: 'Geofence Nodes', icon: MapPin },
    { to: '/shifts', label: 'Shift Windows', icon: Clock },
    { to: '/employees', label: 'Workforce Hub', icon: Users },
    { to: '/corrections', label: 'Case Manager', icon: FileEdit },
    { to: '/attendance', label: 'Master Ledger', icon: BookOpen },
  ];
  
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-on-surface font-['Inter']">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-outline/30 z-[60]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-500 to-amber-700 rounded-lg flex items-center justify-center shadow-amber-sm">
            <Flame size={18} className="text-primary-dark" />
          </div>
          <span className="font-bold tracking-tight text-amber-gradient">Chronos</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-on-surface-variant hover:text-amber-500 transition-colors">
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[60] w-[272px] bg-surface border-r border-outline/20 p-6 flex flex-col transition-transform duration-300 md:relative md:translate-x-0
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand */}
        <div className="flex items-center gap-3.5 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-amber-md">
            <Flame size={22} className="text-primary-dark" />
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold tracking-tight text-amber-gradient">Chronos</h1>
            <p className="text-[8px] text-on-surface-variant/60 font-bold uppercase tracking-[0.25em]">Attendance System</p>
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-1">
          <div>
            <p className="text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-[0.3em] mb-3 ml-3">Management</p>
            <div className="space-y-0.5">
              {navItems.map(item => (
                <NavLink 
                  key={item.to}
                  to={item.to} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all duration-200
                    ${isActive 
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15 shadow-amber-sm' 
                      : 'text-on-surface-variant/70 hover:bg-amber-500/[0.04] hover:text-amber-500/80 border border-transparent'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {user?.role === 'admin' && (
            <div>
              <p className="text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-[0.3em] mb-3 ml-3">Administration</p>
              <div className="space-y-0.5">
                {adminItems.map(item => (
                  <NavLink 
                    key={item.to}
                    to={item.to} 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all duration-200
                      ${isActive 
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15 shadow-amber-sm' 
                        : 'text-on-surface-variant/70 hover:bg-amber-500/[0.04] hover:text-amber-500/80 border border-transparent'
                      }
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          {user?.role !== 'admin' && (
            <div>
              <p className="text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-[0.3em] mb-3 ml-3">Logs</p>
              <NavLink 
                to="/attendance" 
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold uppercase tracking-wider transition-all duration-200
                  ${isActive 
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/15 shadow-amber-sm' 
                    : 'text-on-surface-variant/70 hover:bg-amber-500/[0.04] hover:text-amber-500/80 border border-transparent'
                  }
                `}
              >
                <BookOpen size={16} />
                Personal Ledger
              </NavLink>
            </div>
          )}
        </nav>

        <div className="mt-auto pt-6 border-t border-outline/20">
          <div className="flex items-center gap-3 mb-4 p-3 bg-primary-dark rounded-xl border border-outline/20">
            <img 
              src={user?.profile_pic_url || `https://ui-avatars.com/api/?name=${user?.full_name || 'User'}&background=d97706&color=0a0a0f&bold=true`} 
              className="w-9 h-9 rounded-lg object-cover border border-amber-500/20"
              alt="Profile"
            />
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-bold text-on-surface truncate">{user?.full_name}</p>
              <p className="text-[9px] text-amber-500/60 font-bold uppercase tracking-widest truncate">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl bg-surface border border-outline/20 text-on-surface-variant/60 text-[10px] font-bold uppercase tracking-[0.15em] hover:bg-rose-500/8 hover:text-rose-400 hover:border-rose-500/20 transition-all active:scale-[0.98]"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-background relative h-[100vh]">
        <div className="max-w-[1400px] mx-auto p-6 md:p-10 min-h-screen">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><AppLayout><Profile /></AppLayout></PrivateRoute>} />
          <Route path="/scan" element={<PrivateRoute><AppLayout><QRScanner /></AppLayout></PrivateRoute>} />
          <Route path="/locations" element={<PrivateRoute><AppLayout><Locations /></AppLayout></PrivateRoute>} />
          <Route path="/shifts" element={<PrivateRoute><AppLayout><Shifts /></AppLayout></PrivateRoute>} />
          <Route path="/employees" element={<PrivateRoute><AppLayout><Employees /></AppLayout></PrivateRoute>} />
          <Route path="/attendance" element={<PrivateRoute><AppLayout><Attendance /></AppLayout></PrivateRoute>} />
          <Route path="/corrections" element={<PrivateRoute><AppLayout><Corrections /></AppLayout></PrivateRoute>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}