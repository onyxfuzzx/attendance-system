import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { BookOpen, MapPin, Clock, User, CheckCircle2, AlertCircle, Clock3, X, Calendar, Navigation, Eye, RefreshCw, ShieldCheck, Download } from 'lucide-react';
import { api } from '../services/api';
import { formatISTDate, formatISTTime } from '../utils/datetime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '../components/DataTable';

interface AttendanceLog { id: string; user_id: string; user_name: string; location_name: string; latitude: number; longitude: number; distance_from_center: number; is_within_geofence: boolean; face_photo_url?: string; device_info?: string; status: string; scan_time: string; }

export default function Attendance() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ date: '', month: '', location_id: '', status: '', user_id: '' });
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['attendance', filters, limit, offset], queryFn: () => api.attendance.getAll({ ...filters, limit, offset }) });
  const { data: locations = [] } = useQuery({ queryKey: ['locations-all'], queryFn: () => api.locations.getAll() });
  const { data: employeesData } = useQuery({ queryKey: ['employees-all'], queryFn: () => api.employees.getAll({ limit: 1000 }), enabled: user?.role === 'admin' });
  const employees = employeesData?.users || [];
  const logs = data?.logs || [];
  const total = data?.total || 0;

  const formatDate = (dateStr: string) => { const date = new Date(dateStr); return { date: formatISTDate(date), time: formatISTTime(date, { hour: '2-digit', minute: '2-digit' }) }; };
  const getStatusMeta = (status: string) => { const label = status.replace(/_/g, ' '); if (status.includes('on_time')) return { label, tone: 'success' }; if (status.includes('late')) return { label, tone: 'warning' }; if (status.includes('early_departure')) return { label, tone: 'warning' }; if (status.includes('outside_shift') || status.includes('denied')) return { label, tone: 'error' }; return { label, tone: 'neutral' }; };

  const handleExport = async () => { try { const params = new URLSearchParams(); if (filters.date) params.append('date', filters.date); if (filters.month) params.append('month', filters.month); if (filters.location_id) params.append('location_id', filters.location_id); if (filters.status) params.append('status', filters.status); if (filters.user_id) params.append('user_id', filters.user_id); const response = await api.client.get(`/attendance/export?${params.toString()}`, { responseType: 'blob' }); const url = window.URL.createObjectURL(new Blob([response.data as any])); const link = document.createElement('a'); link.href = url; link.setAttribute('download', 'attendance_report.csv'); document.body.appendChild(link); link.click(); link.remove(); } catch (err) { console.error('Failed to export CSV', err); } };

  const columns = [
    { header: 'Employee Profile', accessor: (log: AttendanceLog) => (<div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-amber-500/8 flex items-center justify-center text-amber-500 font-bold border border-amber-500/15">{log.user_name.charAt(0)}</div><div><p className="text-sm font-bold text-on-surface">{log.user_name}</p><p className="text-[10px] text-on-surface-variant/40 font-mono tracking-tighter uppercase">ID: {log.id.slice(0, 8)}</p></div></div>) },
    { header: 'Deployment Node', accessor: (log: AttendanceLog) => (<div className="flex flex-col gap-1"><div className="flex items-center gap-2"><MapPin size={12} className="text-amber-500" /><p className="text-sm text-on-surface font-medium">{log.location_name}</p></div><p className={`text-[10px] font-bold uppercase tracking-widest ${log.is_within_geofence ? 'text-emerald-400' : 'text-rose-400'}`}>{log.is_within_geofence ? 'Geofence Verified' : 'Perimeter Breach'}</p></div>) },
    { header: 'Temporal Signature', accessor: (log: AttendanceLog) => { const { date, time } = formatDate(log.scan_time); return (<div className="space-y-1"><div className="flex items-center gap-2"><Clock size={12} className="text-on-surface-variant/40" /><p className="text-sm text-on-surface font-bold">{time}</p></div><p className="text-[10px] text-on-surface-variant/40 font-bold uppercase tracking-widest">{date}</p></div>); } },
    { header: 'Validation', accessor: (log: AttendanceLog) => { const m = getStatusMeta(log.status); return (<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest border ${m.tone === 'success' ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/15' : m.tone === 'warning' ? 'bg-amber-500/8 text-amber-500 border-amber-500/15' : m.tone === 'error' ? 'bg-rose-500/8 text-rose-400 border-rose-500/15' : 'bg-surface text-on-surface-variant/50 border-outline/20'}`}>{m.tone === 'success' ? <CheckCircle2 size={12} /> : m.tone === 'warning' ? <Clock3 size={12} /> : <AlertCircle size={12} />}{m.label}</span>); } },
    { header: 'Identity Auth', accessor: (log: AttendanceLog) => (log.face_photo_url ? (<button onClick={() => setSelectedPhoto(log.face_photo_url!)} className="group/img relative w-12 h-12 rounded-lg overflow-hidden border-2 border-outline/20 hover:border-amber-500/40 transition-all"><img src={log.face_photo_url} alt="Verification" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" /><div className="absolute inset-0 bg-primary-dark/50 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center"><Eye size={16} className="text-amber-500" /></div></button>) : (<div className="w-12 h-12 rounded-lg bg-primary-dark border border-outline/20 flex items-center justify-center text-on-surface-variant/30"><User size={18} /></div>)) }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500"><BookOpen size={18} /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Operational Oversight</span></div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">Attendance Ledger</h1>
          <p className="text-on-surface-variant text-sm">Review verified check-in logs and geospatial validation history.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-outline flex items-center gap-2"><Download size={16} />Export CSV</button>
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['attendance'] })} className="btn-outline flex items-center gap-2"><RefreshCw size={16} />Refresh</button>
        </div>
      </div>

      <div className="bg-surface p-6 rounded-xl border border-outline/20">
        <div className="flex items-center gap-3 mb-6"><Navigation size={14} className="text-amber-500" /><h3 className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Filter Matrix</h3></div>
        <div className={`grid grid-cols-1 md:grid-cols-3 ${user?.role === 'admin' ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-6 items-end`}>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} />Target Month</label>
            <div className="flex gap-2">
              <select value={filters.month ? filters.month.split('-')[1] : ''} onChange={(e) => { const currentYear = filters.month ? filters.month.split('-')[0] : new Date().getFullYear().toString(); const newMonth = e.target.value; setFilters(prev => ({ ...prev, month: newMonth ? `${currentYear}-${newMonth}` : '', date: '' })); }} className="input-field flex-1 px-2">
                <option value="">Month</option>
                {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (<option key={m} value={(i + 1).toString().padStart(2, '0')}>{m}</option>))}
              </select>
              <select value={filters.month ? filters.month.split('-')[0] : ''} onChange={(e) => { const currentMonth = filters.month ? filters.month.split('-')[1] : '01'; const newYear = e.target.value; setFilters(prev => ({ ...prev, month: newYear ? `${newYear}-${currentMonth}` : '', date: '' })); }} className="input-field w-[80px] px-2 text-center">
                <option value="">Year</option>
                {Array.from({ length: 5 }, (_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={y}>{y}</option>; })}
              </select>
            </div>
          </div>
          <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-2"><Calendar size={12} />Exact Date</label><input type="date" value={filters.date} onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value, month: '' }))} className="input-field" /></div>
          {user?.role === 'admin' && (
            <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-2"><User size={12} />Employee</label><select value={filters.user_id} onChange={(e) => setFilters(prev => ({ ...prev, user_id: e.target.value }))} className="input-field"><option value="">All Employees</option>{employees.map((emp: any) => (<option key={emp.id} value={emp.id}>{emp.full_name}</option>))}</select></div>
          )}
          <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-2"><Navigation size={12} />Geofence Node</label><select value={filters.location_id} onChange={(e) => setFilters(prev => ({ ...prev, location_id: e.target.value }))} className="input-field"><option value="">All Locations</option>{Array.isArray(locations) && locations.map((loc: any) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}</select></div>
          <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-2"><CheckCircle2 size={12} />Validation Status</label><select value={filters.status} onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))} className="input-field"><option value="">All Statuses</option><option value="in_on_time">In On Time</option><option value="in_late">In Late</option><option value="out_on_time">Out On Time</option><option value="out_early_departure">Out Early</option></select></div>
          <button onClick={() => setFilters({ date: '', month: '', location_id: '', status: '', user_id: '' })} className="btn-outline h-[48px] flex items-center justify-center gap-2"><X size={16} />Reset</button>
        </div>
      </div>

      <DataTable columns={columns as any} data={logs} total={total} limit={limit} offset={offset} onPageChange={setOffset} isLoading={isLoading} />

      {selectedPhoto && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setSelectedPhoto(null)}>
          <div className="bg-surface rounded-2xl w-full max-w-lg overflow-hidden animate-scale-up shadow-midnight border border-outline/20" onClick={e => e.stopPropagation()}>
            <div className="relative aspect-square bg-primary-dark"><img src={selectedPhoto} alt="Identity Verification" className="w-full h-full object-cover" /><button onClick={() => setSelectedPhoto(null)} className="absolute top-6 right-6 p-2 bg-surface/90 backdrop-blur-md rounded-lg text-on-surface hover:text-rose-400 transition-colors border border-outline/20"><X size={20} /></button></div>
            <div className="p-8 space-y-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-500/8 rounded-lg flex items-center justify-center text-amber-500 border border-amber-500/15"><ShieldCheck size={22} /></div><div><h3 className="text-xl font-bold text-on-surface">Identity Authentication</h3><p className="text-xs text-on-surface-variant font-medium">Optical signature captured during verification.</p></div></div></div>
          </div>
        </div>
      )}
    </div>
  );
}