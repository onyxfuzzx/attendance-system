import { useState } from 'react';
import { Clock, MapPin, Calendar, Trash2, Plus, X, AlertCircle, Settings, Timer, LayoutGrid, Users, Edit2 } from 'lucide-react';
import { api } from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Shift { id: string; location_id: string; location_name: string; name: string; start_time: string; end_time: string; days_mask: number; }
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatShiftTime = (timeStr: string) => {
  if (!timeStr) return '';
  if (timeStr.includes('T')) return timeStr.substring(11, 16);
  return timeStr.substring(0, 5);
};

export default function Shifts() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ location_id: '', name: '', start_time: '09:00', end_time: '17:00', days_mask: 127 });
  const [selectedShiftForAssign, setSelectedShiftForAssign] = useState<Shift | null>(null);

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({ queryKey: ['shifts'], queryFn: () => api.shifts.getAll() });
  const { data: locations = [] } = useQuery({ queryKey: ['locations'], queryFn: () => api.locations.getAll() });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingShiftId(null);
    setFormData({ location_id: '', name: '', start_time: '09:00', end_time: '17:00', days_mask: 127 });
  };

  const createMutation = useMutation({ mutationFn: (data: any) => api.shifts.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shifts'] }); handleCloseForm(); }, onError: (err: any) => setError(err.response?.data?.message || err.response?.data?.error || err.message) });
  const updateMutation = useMutation({ mutationFn: (params: {id: string, data: any}) => api.shifts.update(params.id, params.data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['shifts'] }); handleCloseForm(); }, onError: (err: any) => setError(err.response?.data?.message || err.response?.data?.error || err.message) });
  const deleteMutation = useMutation({ mutationFn: (id: string) => api.shifts.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts'] }), onError: (err: any) => setError(err.response?.data?.message || err.response?.data?.error || err.message) });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setError(''); if (editingShiftId) updateMutation.mutate({ id: editingShiftId, data: formData }); else createMutation.mutate(formData); };
  const handleDelete = (id: string) => { if (!confirm('Delete this shift?')) return; deleteMutation.mutate(id); };
  
  const handleEdit = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setFormData({
      location_id: shift.location_id,
      name: shift.name,
      start_time: formatShiftTime(shift.start_time),
      end_time: formatShiftTime(shift.end_time),
      days_mask: shift.days_mask
    });
    setShowForm(true);
  };
  const toggleDay = (dayIndex: number) => { const bit = Math.pow(2, dayIndex); setFormData(prev => ({ ...prev, days_mask: prev.days_mask & bit ? prev.days_mask - bit : prev.days_mask + bit })); };

  if (shiftsLoading) return (<div className="flex flex-col items-center justify-center h-[60vh] space-y-4"><div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div><p className="text-sm font-bold text-on-surface-variant/50 uppercase tracking-widest">Loading Operational Windows...</p></div>);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500"><Clock size={18} /><span className="text-[10px] font-bold uppercase tracking-[0.2em]">Operational Scheduling</span></div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">Shift Management</h1>
          <p className="text-on-surface-variant text-sm">Define and orchestrate working hours for different location nodes.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><Plus size={18} />Create New Shift</button>
      </div>

      {error && (<div className="bg-rose-500/8 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl flex items-center gap-3 animate-fade-in"><AlertCircle size={18} /><p className="text-sm font-medium">{error}</p><button onClick={() => setError('')} className="ml-auto hover:text-rose-300"><X size={18} /></button></div>)}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {shifts.map((shift: Shift) => (
              <div key={shift.id} className="premium-card p-6 flex flex-col group transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"><button onClick={() => handleEdit(shift)} className="p-2 text-amber-500 hover:bg-amber-500/8 rounded-lg transition-colors"><Edit2 size={16} /></button><button onClick={() => handleDelete(shift.id)} className="p-2 text-rose-400 hover:bg-rose-500/8 rounded-lg transition-colors"><Trash2 size={16} /></button></div>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-amber-500/8 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/15"><Timer size={22} /></div>
                    <div className="space-y-1"><h3 className="text-lg font-bold text-on-surface tracking-tight">{shift.name}</h3><div className="flex items-center gap-1.5 text-on-surface-variant/60"><MapPin size={12} /><span className="text-[10px] font-bold uppercase tracking-wider">{shift.location_name}</span></div></div>
                  </div>
                  <div className="p-4 bg-primary-dark rounded-xl border border-outline/20 flex items-center justify-between">
                    <div className="space-y-0.5"><p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Time Window</p><p className="text-sm font-bold font-mono text-amber-500">{formatShiftTime(shift.start_time)} <span className="text-on-surface-variant/30 mx-1 font-sans">—</span> {formatShiftTime(shift.end_time)}</p></div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest flex items-center gap-1.5"><Calendar size={10} />Operation Days</p>
                    <div className="flex flex-wrap gap-1">{DAYS.map((day, i) => (<span key={day} className={`text-[9px] font-bold px-2 py-1 rounded-md border transition-all ${shift.days_mask & Math.pow(2, i) ? 'bg-amber-500/8 text-amber-500 border-amber-500/15' : 'bg-primary-dark text-on-surface-variant/30 border-outline/10'}`}>{day.toUpperCase()}</span>))}</div>
                  </div>
                  <div className="pt-2"><button onClick={() => setSelectedShiftForAssign(shift)} className="w-full py-3 bg-amber-500/8 hover:bg-amber-500/12 text-amber-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors border border-amber-500/15 flex items-center justify-center gap-2"><Users size={14} />Assign Personnel</button></div>
                </div>
              </div>
            ))}
            {shifts.length === 0 && (<div className="col-span-full py-20 flex flex-col items-center justify-center bg-primary-dark border-2 border-dashed border-outline/20 rounded-2xl space-y-4"><Clock size={48} className="text-on-surface-variant/15" /><div className="text-center"><p className="text-lg font-bold text-on-surface">No shifts defined</p><p className="text-sm text-on-surface-variant">Create working windows to start tracking attendance.</p></div><button onClick={() => setShowForm(true)} className="btn-outline flex items-center gap-2 mt-4"><Plus size={18} />Add First Shift</button></div>)}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="premium-card w-full max-w-lg p-8 space-y-8 animate-scale-up shadow-midnight">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/15"><Settings size={22} /></div><h3 className="text-xl font-bold tracking-tight">{editingShiftId ? 'Edit Shift' : 'Shift Configuration'}</h3></div>
              <button onClick={handleCloseForm} className="p-2 hover:bg-primary-dark rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-2"><MapPin size={12} />Assigned Location Node</label><select value={formData.location_id} onChange={(e) => setFormData(prev => ({ ...prev, location_id: e.target.value }))} className="input-field" required><option value="">Select location node...</option>{locations.map((loc: any) => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}</select></div>
              <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest flex items-center gap-2"><LayoutGrid size={12} />Schedule Identifier</label><input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} className="input-field" placeholder="e.g. CORE_SQUAD_MORNING" required /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Check-in Threshold</label><input type="time" value={formData.start_time} onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))} className="input-field font-mono" required /></div>
                <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Check-out Window</label><input type="time" value={formData.end_time} onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))} className="input-field font-mono" required /></div>
              </div>
              <div className="space-y-3"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Recurrence Policy</label><div className="grid grid-cols-7 gap-2">{DAYS.map((day, i) => (<button key={i} type="button" onClick={() => toggleDay(i)} className={`h-10 rounded-lg text-[10px] font-bold transition-all border ${formData.days_mask & Math.pow(2, i) ? 'bg-amber-500 text-primary-dark border-amber-500 shadow-amber-sm' : 'bg-primary-dark text-on-surface-variant/50 border-outline/20 hover:border-amber-500/30'}`}>{day[0]}</button>))}</div></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={handleCloseForm} className="btn-outline flex-1">Cancel</button><button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">{(createMutation.isPending || updateMutation.isPending) ? 'PROCESSING...' : (editingShiftId ? 'UPDATE SCHEDULE' : 'INITIALIZE SCHEDULE')}</button></div>
            </form>
          </div>
        </div>
      )}
      {selectedShiftForAssign && <AssignPersonnelModal shift={selectedShiftForAssign} onClose={() => setSelectedShiftForAssign(null)} />}
    </div>
  );
}

function AssignPersonnelModal({ shift, onClose }: { shift: Shift, onClose: () => void }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const { data: employeesData, isLoading: employeesLoading } = useQuery({ queryKey: ['employees'], queryFn: () => api.employees.getAll({ limit: 100 }) });
  const allEmployees = employeesData?.users || [];
  const { data: assignedEmployees = [], isLoading: assignedLoading } = useQuery({ queryKey: ['shifts', shift.id, 'employees'], queryFn: () => api.shifts.getEmployees(shift.id) });
  const assignMutation = useMutation({ mutationFn: (userId: string) => api.shifts.assignEmployees(shift.id, { user_ids: [userId] }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts', shift.id, 'employees'] }), onError: (err: any) => setError(err.response?.data?.error || err.message) });
  const removeMutation = useMutation({ mutationFn: (userId: string) => api.shifts.removeEmployee(shift.id, userId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shifts', shift.id, 'employees'] }), onError: (err: any) => setError(err.response?.data?.error || err.message) });
  const assignedIds = new Set(assignedEmployees.map((e: any) => e.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="premium-card w-full max-w-lg p-8 space-y-6 animate-scale-up shadow-midnight flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/15"><Users size={22} /></div><div><h3 className="text-xl font-bold tracking-tight">Assign Personnel</h3><p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">{shift.name}</p></div></div>
          <button onClick={onClose} className="p-2 hover:bg-primary-dark rounded-lg transition-colors"><X size={20} /></button>
        </div>
        {error && (<div className="bg-rose-500/8 text-rose-400 p-3 rounded-xl text-xs font-bold flex items-center gap-2"><AlertCircle size={14} /> {error}</div>)}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {employeesLoading || assignedLoading ? (<div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div></div>) : (
            allEmployees.map((emp: any) => { const isAssigned = assignedIds.has(emp.id); const isPending = assignMutation.isPending || removeMutation.isPending; return (
              <div key={emp.id} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${isAssigned ? 'bg-amber-500/5 border-amber-500/15' : 'bg-primary-dark border-outline/20 hover:border-amber-500/15'}`}>
                <div><p className="text-sm font-bold text-on-surface">{emp.full_name}</p><p className="text-[10px] text-on-surface-variant/50">{emp.email}</p></div>
                <button disabled={isPending} onClick={() => isAssigned ? removeMutation.mutate(emp.id) : assignMutation.mutate(emp.id)} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${isAssigned ? 'bg-amber-500 text-primary-dark' : 'bg-surface border border-outline/20 text-on-surface hover:border-amber-500/30'}`}>{isAssigned ? 'Remove' : 'Assign'}</button>
              </div>); })
          )}
        </div>
        <div className="pt-4 border-t border-outline/20"><button onClick={onClose} className="btn-primary w-full py-4 text-[11px]">Done Mapping</button></div>
      </div>
    </div>
  );
}