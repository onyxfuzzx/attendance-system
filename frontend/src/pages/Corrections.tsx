import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { FileEdit, CheckCircle2, AlertCircle, Clock, User, X, Plus, History, BadgeCheck, CalendarDays, MessageSquare, ShieldQuestion, Filter, Check, Send, ShieldAlert, FileText } from 'lucide-react';
import { api } from '../services/api';
import { formatISTDate, formatISTTime } from '../utils/datetime';

interface Correction { id: string; user_id: string; user_name: string; user_photo?: string; attendance_id?: string; original_scan_time?: string; request_type: string; reason: string; status: string; reviewer_notes?: string; request_date: string; reviewed_date?: string; }

export default function Corrections() {
  const { user } = useAuth();
  const [corrections, setCorrections] = useState<Correction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ request_type: '', reason: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => { loadCorrections(); }, [filter]);

  const loadCorrections = async () => { try { setLoading(true); const params: any = {}; if (filter) params.status = filter; const data = await api.corrections.getAll(params); setCorrections(data); } catch (err: any) { setError(err.message); } finally { setLoading(false); } };
  const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setError(''); setSaving(true); try { await api.corrections.create(formData); setMessage('Correction request submitted successfully.'); setShowForm(false); setFormData({ request_type: '', reason: '' }); loadCorrections(); } catch (err: any) { setError(err.message); } finally { setSaving(false); } };
  const handleReview = async (id: string, status: 'approved' | 'rejected') => { const notes = prompt(`Enter notes for ${status} (optional):`); try { await api.corrections.review(id, { status, reviewer_notes: notes || undefined }); loadCorrections(); } catch (err: any) { setError(err.message); } };
  const formatDate = (dateStr: string) => { const date = new Date(dateStr); return formatISTDate(date, { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + formatISTTime(date, { hour: '2-digit', minute: '2-digit' }); };

  if (loading) return (<div className="flex flex-col items-center justify-center h-[60vh] space-y-4"><div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div><p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.2em]">Synchronizing Case Files...</p></div>);

  return (
    <div className="max-w-5xl mx-auto space-y-10 animate-fade-in pb-20 font-['Inter']">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-500"><FileEdit size={16} /><span className="text-[10px] font-bold uppercase tracking-[0.3em]">Dispute Protocols</span></div>
          <h1 className="text-4xl font-bold text-on-surface tracking-tight">Case Resolution Center</h1>
          <p className="text-on-surface-variant text-sm font-medium">Review and resolve attendance discrepancies through formal administrative channels.</p>
        </div>
        {user?.role === 'employee' && (<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2 px-8"><Plus size={18} />Submit Dispute</button>)}
      </div>

      {message && (<div className="bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 px-8 py-5 rounded-xl flex items-center gap-4 animate-fade-in"><BadgeCheck size={20} /><p className="text-sm font-bold tracking-tight">{message}</p><button onClick={() => setMessage('')} className="ml-auto p-2 hover:bg-emerald-500/10 rounded-lg transition-colors"><X size={18} /></button></div>)}
      {error && (<div className="bg-rose-500/8 border border-rose-500/20 text-rose-400 px-8 py-5 rounded-xl flex items-center gap-4 animate-fade-in"><AlertCircle size={20} /><p className="text-sm font-bold tracking-tight">{error}</p><button onClick={() => setError('')} className="ml-auto p-2 hover:bg-rose-500/10 rounded-lg transition-colors"><X size={18} /></button></div>)}

      {user?.role === 'admin' && (
        <div className="flex items-center justify-between bg-surface p-2 rounded-xl border border-outline/20 shadow-midnight">
          <div className="flex gap-1.5">
            {[{ id: '', label: 'All Cases', icon: History }, { id: 'pending', label: 'Pending Audit', icon: Clock }, { id: 'approved', label: 'Resolved', icon: CheckCircle2 }].map(tab => (
              <button key={tab.id} onClick={() => setFilter(tab.id)} className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${filter === tab.id ? 'bg-amber-500 text-primary-dark shadow-amber-sm' : 'text-on-surface-variant/50 hover:bg-primary-dark'}`}><tab.icon size={14} />{tab.label}</button>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-4 px-6 border-l border-outline/20"><p className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-widest">{corrections.length} Total Records</p></div>
        </div>
      )}

      <div className="space-y-6">
        {corrections.map(corr => (
          <div key={corr.id} className="premium-card p-0 group relative overflow-hidden transition-all">
            <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${corr.status === 'pending' ? 'bg-amber-500/40 group-hover:bg-amber-500' : corr.status === 'approved' ? 'bg-emerald-400/40 group-hover:bg-emerald-400' : 'bg-rose-400/40 group-hover:bg-rose-400'}`}></div>
            <div className="p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <img src={corr.user_photo || `https://ui-avatars.com/api/?name=${corr.user_name}&background=d97706&color=0a0a0f&bold=true`} className="relative w-14 h-14 rounded-xl object-cover border border-amber-500/15" alt="" />
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-lg border-2 border-surface flex items-center justify-center"><User size={10} className="text-primary-dark" /></div>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-on-surface tracking-tight group-hover:text-amber-500 transition-colors">{corr.user_name}</h3>
                    <div className="flex items-center gap-4 mt-1"><span className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider"><CalendarDays size={12} className="text-amber-500/50" />Requested {formatDate(corr.request_date)}</span></div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[9px] font-bold uppercase tracking-[0.2em] ${corr.status === 'pending' ? 'bg-amber-500/8 text-amber-500 border-amber-500/15' : corr.status === 'approved' ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/15' : 'bg-rose-500/8 text-rose-400 border-rose-500/15'}`}><div className={`w-1.5 h-1.5 rounded-full ${corr.status === 'pending' ? 'bg-amber-500 animate-pulse' : corr.status === 'approved' ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>{corr.status}</div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="bg-primary-dark p-6 rounded-xl border border-outline/20 space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5"><MessageSquare size={56} /></div>
                    <div className="flex items-center gap-3"><div className="w-7 h-7 bg-surface rounded-lg flex items-center justify-center text-amber-500/50 border border-outline/20"><ShieldQuestion size={14} /></div><p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">Employee Statement</p></div>
                    <p className="text-sm text-on-surface leading-relaxed font-medium italic pl-4 border-l-2 border-amber-500/20">"{corr.reason}"</p>
                  </div>
                </div>
                <div>
                  <div className="bg-surface p-6 rounded-xl border border-outline/20 space-y-4">
                    <div className="space-y-1"><p className="text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-widest">Classification</p><div className="flex items-center gap-2 text-sm font-bold text-on-surface uppercase tracking-tight"><FileText size={14} className="text-amber-500" />{corr.request_type.replace('_', ' ')}</div></div>
                    {corr.original_scan_time && (<div className="space-y-1 pt-4 border-t border-outline/20"><p className="text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-widest">Target Record</p><div className="flex items-center gap-2 text-xs font-bold text-amber-500"><Clock size={14} />{formatDate(corr.original_scan_time)}</div></div>)}
                  </div>
                </div>
              </div>

              {corr.reviewer_notes && (
                <div className="bg-amber-500/[0.03] p-6 rounded-xl border border-amber-500/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldAlert size={44} /></div>
                  <div className="flex items-center gap-3 mb-3"><div className="w-7 h-7 bg-surface rounded-lg flex items-center justify-center text-amber-500 border border-outline/20"><BadgeCheck size={14} /></div><p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Administrative Verdict</p></div>
                  <p className="text-sm text-on-surface font-bold leading-relaxed">{corr.reviewer_notes}</p>
                </div>
              )}

              {user?.role === 'admin' && corr.status === 'pending' && (
                <div className="flex gap-4 pt-2">
                  <button onClick={() => handleReview(corr.id, 'approved')} className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-primary-dark rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-3"><Check size={16} />Authorize Correction</button>
                  <button onClick={() => handleReview(corr.id, 'rejected')} className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all shadow-lg flex items-center justify-center gap-3"><X size={16} />Deny Request</button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {corrections.length === 0 && (
          <div className="py-28 flex flex-col items-center justify-center bg-surface border border-dashed border-outline/20 rounded-2xl space-y-8">
            <div className="w-20 h-20 bg-primary-dark rounded-2xl flex items-center justify-center text-on-surface-variant/15 border border-dashed border-outline/15"><FileEdit size={40} /></div>
            <div className="text-center space-y-2"><p className="text-2xl font-bold text-on-surface tracking-tight">No active cases</p><p className="text-sm font-medium text-on-surface-variant/40">The dispute queue is currently synchronized.</p></div>
            {user?.role === 'employee' && (<button onClick={() => setShowForm(true)} className="btn-primary px-10">Initiate Protocol</button>)}
          </div>
        )}
      </div>

      {showForm && user?.role === 'employee' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
          <div className="premium-card w-full max-w-xl p-10 space-y-10 animate-scale-up shadow-midnight relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-amber-500/20"></div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl flex items-center justify-center text-primary-dark shadow-amber-md" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}><FileEdit size={24} /></div><div><h3 className="text-2xl font-bold tracking-tight text-on-surface">Case Initiation</h3><p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-1">Dispute Resolution Protocol</p></div></div>
              <button onClick={() => setShowForm(false)} className="p-3 hover:bg-primary-dark rounded-lg transition-colors text-on-surface-variant"><X size={22} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3"><label className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><Filter size={12} className="text-amber-500" />Correction Category</label><select value={formData.request_type} onChange={(e) => setFormData(prev => ({ ...prev, request_type: e.target.value }))} className="input-field py-4 font-bold text-[10px] uppercase tracking-widest" required><option value="">Select Protocol...</option><option value="missing_punch">Missing Check-in/out</option><option value="wrong_location">Geographic Misalignment</option><option value="wrong_time">Temporal Discrepancy</option><option value="technical_issue">System Malfunction</option><option value="other">Anomalous Activity</option></select></div>
              <div className="space-y-3"><label className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em] ml-1 flex items-center gap-2"><MessageSquare size={12} className="text-amber-500" />Case Telemetry & Explanation</label><textarea value={formData.reason} onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))} className="input-field min-h-[160px] py-4 resize-none font-medium text-sm leading-relaxed" placeholder="Provide comprehensive details regarding the requested adjustment..." required /></div>
              <div className="pt-6 flex gap-4"><button type="button" onClick={() => setShowForm(false)} className="btn-outline flex-1 py-4 text-[10px]">Abort Protocol</button><button type="submit" disabled={saving} className="btn-primary flex-1 py-4 flex items-center justify-center gap-3 text-[10px]">{saving ? (<div className="w-4 h-4 border-2 border-primary-dark/30 border-t-primary-dark rounded-full animate-spin"></div>) : (<><Send size={16} />Transmit Dispute</>)}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}