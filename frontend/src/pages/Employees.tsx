import { useState } from 'react';
import { Users, UserPlus, Shield, Mail, UserX, UserCheck, AlertCircle, X, Download, ShieldCheck, Trash2, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DataTable } from '../components/DataTable';

interface Employee { id: string; email: string; full_name: string; phone?: string; role: string; profile_pic_url?: string; is_active: boolean; assigned_shifts?: string; }

export default function Employees() {
  const queryClient = useQueryClient();
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '', phone: '', role: 'employee' });
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  const [adminPassword, setAdminPassword] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['employees', limit, offset, searchTerm], queryFn: () => api.employees.getAll({ limit, offset, search: searchTerm }) });
  const employees = data?.users || [];
  const total = data?.total || 0;
  const createMutation = useMutation({ mutationFn: (data: any) => api.employees.create(data), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setShowForm(false); setFormData({ email: '', password: '', full_name: '', phone: '', role: 'employee' }); }, onError: (err: any) => setError(err.response?.data?.message || err.response?.data?.error || err.message) });
  const updateMutation = useMutation({ mutationFn: ({ id, data }: { id: string; data: any }) => api.employees.update(id, data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }), onError: (err: any) => setError(err.response?.data?.message || err.response?.data?.error || err.message) });
  const deleteMutation = useMutation({ mutationFn: ({ id, pass }: { id: string; pass: string }) => api.employees.delete(id, pass), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setEmployeeToDelete(null); setAdminPassword(''); }, onError: (err: any) => setError(err.response?.data?.message || err.response?.data?.error || err.message) });

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); setError(''); createMutation.mutate(formData); };
  const handleDeleteSubmit = (e: React.FormEvent) => { e.preventDefault(); setError(''); if (employeeToDelete) deleteMutation.mutate({ id: employeeToDelete.id, pass: adminPassword }); };
  const handleToggleActive = (id: string, isActive: boolean) => { updateMutation.mutate({ id, data: { is_active: !isActive } }); };

  const columns = [
    { header: 'Principal Identity', accessor: (emp: Employee) => (<div className="flex items-center gap-4"><img src={emp.profile_pic_url || `https://ui-avatars.com/api/?name=${emp.full_name}&background=d97706&color=0a0a0f&bold=true`} className="w-10 h-10 rounded-lg object-cover border border-amber-500/15" alt="" /><div><p className="text-sm font-bold text-on-surface">{emp.full_name}</p><p className="text-xs text-on-surface-variant/50 flex items-center gap-1"><Mail size={12} /> {emp.email}</p></div></div>) },
    { header: 'System Clearance', accessor: (emp: Employee) => (<div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider ${emp.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/15' : 'bg-primary-dark text-on-surface-variant/60 border-outline/20'}`}>{emp.role === 'admin' ? <ShieldCheck size={12} /> : <Shield size={12} />}{emp.role}</div>) },
    { header: 'Synchronization', accessor: (emp: Employee) => (<span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border ${emp.is_active ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/15' : 'bg-primary-dark text-on-surface-variant/40 border-outline/20'}`}><div className={`w-1.5 h-1.5 rounded-full ${emp.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-on-surface-variant/30'}`}></div>{emp.is_active ? 'Authorized' : 'Suspended'}</span>) },
    { header: 'Assigned Shifts', accessor: (emp: Employee) => (<div className="flex items-center gap-2"><Calendar size={14} className="text-amber-500" /><span className="text-xs text-on-surface-variant truncate max-w-[150px]">{emp.assigned_shifts || 'No shifts assigned'}</span></div>) },
    { header: 'Actions', accessor: (emp: Employee) => (<div className="flex items-center gap-2"><button onClick={() => handleToggleActive(emp.id, emp.is_active)} title={emp.is_active ? 'Suspend' : 'Authorize'} className={`p-2 rounded-lg transition-all border ${emp.is_active ? 'text-on-surface-variant/50 bg-primary-dark hover:bg-primary-dark border-outline/20' : 'text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/15 border-emerald-500/15'}`}>{emp.is_active ? <UserX size={16} /> : <UserCheck size={16} />}</button><button onClick={() => { setEmployeeToDelete(emp); setAdminPassword(''); }} title="Delete Employee" className="p-2 hover:bg-rose-500/8 rounded-lg text-rose-400 transition-colors border border-transparent hover:border-rose-500/20"><Trash2 size={16} /></button></div>) }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500"><Users size={16} /><span className="text-[10px] font-bold uppercase tracking-[0.3em]">Identity Protocol</span></div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">Workforce Directory</h1>
          <p className="text-on-surface-variant text-sm font-medium">Manage system access nodes and monitor user identity synchronization.</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline flex items-center gap-2 px-4 py-2 text-sm"><Download size={16} />Export</button>
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"><UserPlus size={16} />Provision Identity</button>
        </div>
      </div>

      {error && (<div className="bg-rose-500/8 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl flex items-center gap-3 animate-fade-in"><AlertCircle size={18} /><p className="text-sm font-semibold">{error}</p><button onClick={() => setError('')} className="ml-auto p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors"><X size={16} /></button></div>)}

      <DataTable columns={columns as any} data={employees} total={total} limit={limit} offset={offset} onPageChange={setOffset} onSearch={setSearchTerm} isLoading={isLoading} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-lg p-8 space-y-8 animate-scale-up shadow-midnight border border-outline/20 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4"><div className="w-11 h-11 rounded-xl flex items-center justify-center text-primary-dark shadow-amber-sm" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><UserPlus size={22} /></div><h3 className="text-xl font-bold text-on-surface">Identity Provisioning</h3></div>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-primary-dark rounded-lg transition-colors text-on-surface-variant"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Full Name</label><input type="text" value={formData.full_name} onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))} className="input-field" placeholder="e.g. Jonathan Aris" required /></div>
              <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Email Address</label><input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} className="input-field" placeholder="j.aris@company.com" required /></div>
              <div className="space-y-2"><label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Password</label><input type="password" value={formData.password} onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))} className="input-field" placeholder="••••••••" required /></div>
              <div className="pt-4 flex gap-3"><button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1 py-3 text-sm">Cancel</button><button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1 py-3 flex items-center justify-center gap-2 text-sm">{createMutation.isPending ? 'Processing...' : 'Provision Identity'}</button></div>
            </form>
          </div>
        </div>
      )}

      {employeeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-2xl w-full max-w-sm p-8 space-y-6 animate-scale-up shadow-midnight border border-outline/20 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <AlertCircle size={20} />
                </div>
                <h3 className="text-lg font-bold text-on-surface">Confirm Deletion</h3>
              </div>
              <button onClick={() => { setEmployeeToDelete(null); setAdminPassword(''); }} className="p-2 hover:bg-primary-dark rounded-lg transition-colors text-on-surface-variant"><X size={18} /></button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant">
                You are about to delete <span className="font-bold text-on-surface">{employeeToDelete.full_name}</span>. This requires administrator verification.
              </p>
              {employeeToDelete.assigned_shifts && (
                <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-amber-500 text-xs">
                  <span className="font-bold">Warning:</span> This employee has active shifts assigned. You will not be able to delete them until their shifts are removed.
                </div>
              )}
              <form onSubmit={handleDeleteSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Admin Password</label>
                  <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="input-field" placeholder="Enter your password to confirm" required />
                </div>
                <button type="submit" disabled={deleteMutation.isPending || !adminPassword} className="w-full py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2">
                  {deleteMutation.isPending ? 'Processing...' : 'Delete Employee'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}