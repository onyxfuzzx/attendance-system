import { 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  TrendingUp, 
  UserPlus, 
  Settings, 
  Camera,
  ChevronRight,
  ArrowRight,
  History,
  Target,
  Zap,
  Globe,
  Flame
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { formatISTDate } from '../utils/datetime';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', user?.role],
    queryFn: () => {
      if (user?.role === 'admin') return api.analytics.getAdmin();
      return api.analytics.getEmployee();
    },
    enabled: !!user?.role,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
        <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.2em]">Aggregating Intelligence...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <AlertCircle size={48} className="text-rose-500/60" />
        <p className="text-sm font-bold text-on-surface-variant">Failed to load telemetry</p>
        <button 
          onClick={() => window.location.reload()}
          className="text-[10px] font-bold text-amber-500 uppercase tracking-widest hover:underline"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 font-['Inter']">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500">
            <Flame size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Operational Oversight</span>
          </div>
          <h1 className="text-4xl font-bold text-on-surface tracking-tight">
            Welcome, <span className="text-amber-gradient">{(user?.full_name || 'User').split(' ')[0]}</span>
          </h1>
          <p className="text-on-surface-variant text-sm font-medium">
            {user?.role === 'admin' 
              ? 'Global workforce telemetry and system diagnostics node.' 
              : 'Your personal attendance ledger and activity stream.'}
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-surface p-2.5 rounded-xl border border-outline/30 shadow-midnight">
          <div className="bg-amber-500/8 p-3 rounded-lg text-amber-500">
            <Calendar size={18} />
          </div>
          <div className="pr-5">
            <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">System Time</p>
            <p className="text-sm font-bold text-on-surface">{formatISTDate(new Date(), { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {user?.role === 'admin' && <AdminView data={data} />}
      {user?.role === 'employee' && <EmployeeView data={data} />}
    </div>
  );
}

function AdminView({ data }: { data: any }) {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Users size={20} />} 
          label="Total Workforce" 
          value={data?.location_usage?.reduce((acc: number, curr: any) => acc + (curr.total_scans || 0), 0) || 0} 
          trend="Total cumulative scans"
          type="primary"
        />
        <StatCard 
          icon={<Globe size={20} />} 
          label="Active Nodes" 
          value={data?.location_usage?.length || 0} 
          trend="All perimeters secure"
          type="success"
        />
        <StatCard 
          icon={<Zap size={20} />} 
          label="Recent Growth" 
          value={data?.user_growth?.length || 0} 
          trend="Identities added (30d)"
          type="warning"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <div className="premium-card p-8 min-h-[400px]">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h2 className="text-lg font-bold flex items-center gap-2 text-on-surface">
                  <TrendingUp size={18} className="text-amber-500" />
                  Growth Telemetry
                </h2>
                <p className="text-[10px] font-medium text-on-surface-variant/50 uppercase tracking-widest">Identity Acquisition (30-Day Window)</p>
              </div>
            </div>
            
            <div className="h-72 w-full">
              {data?.user_growth?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.user_growth}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#2a2520" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#8a7e6d' }}
                      tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a7e6d' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f0f18', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', boxShadow: '0 20px 40px -8px rgba(0,0,0,0.6)' }}
                      labelStyle={{ fontWeight: 'bold', fontSize: '12px', color: '#faf5ef' }}
                      itemStyle={{ color: '#f59e0b' }}
                    />
                    <Area type="monotone" dataKey="new_users" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorUsers)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-on-surface-variant/30 space-y-4">
                  <TrendingUp size={48} className="opacity-20" />
                  <p className="text-sm font-medium italic">Aggregating scale telemetry...</p>
                </div>
              )}
            </div>
          </div>

          <div className="premium-card p-8">
            <h2 className="text-lg font-bold mb-8 text-on-surface">Node Activity Density</h2>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.location_usage || []}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a7e6d' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#8a7e6d' }} />
                  <Tooltip 
                     contentStyle={{ backgroundColor: '#0f0f18', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.15)', boxShadow: '0 16px 32px -8px rgba(0,0,0,0.5)' }}
                  />
                  <Bar dataKey="total_scans" radius={[6, 6, 0, 0]}>
                    {(data?.location_usage || []).map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f'][index % 5]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-4 space-y-6">
          <div className="premium-card p-8">
            <h2 className="text-lg font-bold mb-8 text-on-surface">Command Center</h2>
            <div className="space-y-3">
              <ToolButton icon={<UserPlus size={18} />} label="Provision Identity" to="/employees" primary />
              <ToolButton icon={<MapPin size={18} />} label="Node Management" to="/locations" />
              <ToolButton icon={<Settings size={18} />} label="Kernel Config" to="/profile" />
            </div>
          </div>
          
          <Link to="/attendance" className="premium-card p-8 overflow-hidden relative group cursor-pointer block" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-black/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-125"></div>
            <div className="relative z-10 space-y-4">
              <History size={28} className="text-primary-dark/40" />
              <h3 className="text-xl font-bold tracking-tight text-primary-dark">System Audit Log</h3>
              <p className="text-xs text-primary-dark/60 font-medium leading-relaxed">Review all high-level security events and administrative overrides.</p>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest pt-2 text-primary-dark/80">
                Launch Explorer <ArrowRight size={14} />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

function EmployeeView({ data }: { data: any }) {
  const { data: shifts } = useQuery({
    queryKey: ['my-shifts'],
    queryFn: () => api.client.get('/profile/my-shifts').then((res: any) => res.data),
  });

  const formatShiftTime = (timeStr: string) => {
    if (!timeStr) return '';
    if (timeStr.includes('T')) {
      // Handle "1970-01-01T09:00:00.000Z" by extracting just the time part
      return timeStr.substring(11, 16);
    }
    // Fallback for "09:00:00"
    return timeStr.substring(0, 5);
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          icon={<Clock size={20} />} 
          label="Tracked Hours" 
          value={Math.round(data?.weekly?.total_hours || 0)} 
          subValue="Current Week"
          type="primary"
        />
        <StatCard 
          icon={<CheckCircle2 size={20} />} 
          label="Active Days" 
          value={data?.weekly?.days_worked || 0} 
          trend="Consistent performance"
          type="success"
        />
        <StatCard 
          icon={<History size={20} />} 
          label="Monthly Sessions" 
          value={data?.active_days_30 || 0} 
          subValue="Total Scans"
          type="warning"
        />
      </div>

      {/* Shifts Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/15">
            <Zap size={16} />
          </div>
          <h2 className="text-xl font-bold text-on-surface tracking-tight">Active Shift Assignment</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {shifts?.length > 0 ? (
            shifts.map((shift: any) => (
              <div key={shift.id} className="premium-card p-6 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/5 rounded-bl-full -mr-6 -mt-6"></div>
                <div className="relative z-10 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">{shift.location_name}</p>
                      <h3 className="text-lg font-bold text-on-surface">{shift.name}</h3>
                    </div>
                    <div className="bg-primary-dark p-2 rounded-lg text-on-surface-variant border border-outline/20">
                      <Clock size={16} />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 pt-2">
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1">Start Time</p>
                      <p className="text-sm font-bold text-on-surface">{formatShiftTime(shift.start_time)}</p>
                    </div>
                    <ArrowRight size={14} className="text-amber-500/30" />
                    <div className="flex-1">
                      <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mb-1">End Time</p>
                      <p className="text-sm font-bold text-on-surface">{formatShiftTime(shift.end_time)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full premium-card p-8 border-dashed flex items-center justify-center text-on-surface-variant/30 italic text-sm">
              No shifts assigned for current period.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <div className="premium-card p-10 overflow-hidden relative group">
            <div className="absolute top-0 right-0 w-[350px] h-[350px] bg-amber-500/[0.03] rounded-full -mr-28 -mt-28 transition-transform duration-1000 group-hover:scale-110"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
              <div className="flex-1 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/8 text-amber-500 rounded-lg border border-amber-500/15">
                  <Zap size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Presence Verified</span>
                </div>
                <h2 className="text-3xl font-bold text-on-surface tracking-tight">Ready to verify presence?</h2>
                <p className="text-on-surface-variant text-sm font-medium leading-relaxed max-w-md">
                  Capture your face and verify your location within the assigned geofence to check in.
                </p>
                <div className="pt-4 flex gap-4">
                  <Link to="/scan" className="btn-primary flex items-center gap-3 px-8">
                    <Camera size={18} />
                    Start Check-In
                  </Link>
                  <Link to="/attendance" className="p-3.5 bg-primary-dark border border-outline/30 rounded-xl hover:bg-surface hover:border-amber-500/20 transition-all">
                    <Target size={18} className="text-amber-500" />
                  </Link>
                </div>
              </div>
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-amber-500/8 rounded-full blur-3xl scale-125"></div>
                <Camera size={160} className="text-amber-500/8 relative" />
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-4">
          <div className="premium-card p-10 h-full flex flex-col">
            <div className="w-12 h-12 bg-amber-500/8 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/15 mb-8">
              <AlertCircle size={22} />
            </div>
            <h2 className="text-xl font-bold mb-4 text-on-surface tracking-tight">Report Discrepancy</h2>
            <p className="text-sm text-on-surface-variant font-medium leading-relaxed mb-8">
              Missed a scan or encountered a hardware failure? Submit a correction request for administrative review.
            </p>
            <Link to="/corrections" className="btn-outline w-full flex items-center justify-center gap-2 py-4 mt-auto">
              Open Case Manager
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subValue, trend, type }: any) {
  const styles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    primary: { bg: 'bg-amber-500/8', text: 'text-amber-500', border: 'border-amber-500/15', dot: 'bg-amber-500' },
    success: { bg: 'bg-emerald-500/8', text: 'text-emerald-400', border: 'border-emerald-500/15', dot: 'bg-emerald-400' },
    warning: { bg: 'bg-orange-500/8', text: 'text-orange-400', border: 'border-orange-500/15', dot: 'bg-orange-400' },
    error: { bg: 'bg-rose-500/8', text: 'text-rose-400', border: 'border-rose-500/15', dot: 'bg-rose-400' },
  };

  const s = styles[type] || styles.primary;

  return (
    <div className="premium-card p-7 relative overflow-hidden group transition-all hover:-translate-y-0.5">
      <div className={`absolute top-0 right-0 w-20 h-20 ${s.bg} rounded-bl-full -mr-6 -mt-6 opacity-50 transition-transform duration-700 group-hover:scale-125`}></div>
      <div className="relative z-10 space-y-5">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${s.bg} ${s.text} ${s.border}`}>
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.2em]">{label}</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-on-surface tracking-tight">{value}</h3>
            {subValue && <span className="text-sm font-bold text-on-surface-variant/30">{subValue}</span>}
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-2 pt-1">
            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}></div>
            <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{trend}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolButton({ icon, label, to, primary }: any) {
  return (
    <Link to={to} className={`flex items-center justify-between w-full p-4 rounded-xl transition-all hover:translate-x-0.5 group ${
      primary 
        ? 'text-primary-dark shadow-amber-sm hover:shadow-amber-md' 
        : 'bg-primary-dark border border-outline/20 text-on-surface hover:border-amber-500/20 hover:shadow-amber-sm'
    }`} style={primary ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' } : {}}>
      <div className="flex items-center gap-3">
        <div className={`${primary ? 'bg-black/10' : 'bg-amber-500/8'} p-2 rounded-lg text-current`}>
          {icon}
        </div>
        <span className="text-sm font-bold tracking-tight">{label}</span>
      </div>
      <ChevronRight size={16} className={`${primary ? 'opacity-40' : 'text-amber-500 opacity-0 group-hover:opacity-100'} transition-opacity`} />
    </Link>
  );
}