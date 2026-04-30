import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  UserCircle, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Lock, 
  Camera, 
  Key, 
  CheckCircle2, 
  AlertCircle,
  Save,
  Fingerprint,
  HardDrive,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';

interface ProfileData {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: string;
  profile_pic_url?: string;
}

export default function Profile() {
  useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const data = await api.profile.get();
      setProfile(data);
      setFullName(data.full_name);
      setPhone(data.phone || '');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    try {
      await api.profile.update({ full_name: fullName, phone });
      setMessage('Identity profile synchronized successfully.');
      const data = await api.profile.get();
      setProfile(data);
      const localUser = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...localUser, ...data }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    if (newPassword !== confirmPassword) {
      setError('Credential mismatch detected.');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('Security token too short.');
      return;
    }
    
    setSaving(true);
    
    try {
      await api.profile.updatePassword({ currentPassword, newPassword });
      setMessage('Security credentials updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      setSaving(true);
      const response = await fetch('/api/profile/picture', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Upload failed');
      
      await api.profile.update({ profile_pic_url: data.profile_pic_url });
      await loadProfile();
      setMessage('Visual signature updated.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-on-surface-variant/50 uppercase tracking-widest">Accessing Profile Vault...</p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-fade-in max-w-5xl mx-auto pb-20">
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-amber-500">
          <UserCircle size={18} />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Identity Management</span>
        </div>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight">
          Profile Workspace
        </h1>
        <p className="text-on-surface-variant text-sm">Configure your operational identity and security parameters.</p>
      </div>
      
      {message && (
        <div className="bg-emerald-500/8 border border-emerald-500/20 text-emerald-400 px-6 py-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={18} /> {message}
        </div>
      )}
      
      {error && (
        <div className="bg-rose-500/8 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-fade-in">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Identity Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="premium-card p-8 flex flex-col items-center text-center relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-28 bg-gradient-to-b from-amber-500/[0.04] to-transparent"></div>
            
            <div className="relative group mb-8 mt-4">
              <div className="relative w-36 h-36 rounded-2xl bg-primary-dark border-2 border-amber-500/20 overflow-hidden flex items-center justify-center shadow-midnight">
                {profile?.profile_pic_url ? (
                  <img src={profile.profile_pic_url} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                ) : (
                  <span className="text-5xl font-bold text-amber-500/20">{profile?.full_name?.charAt(0)}</span>
                )}
                
                <label className="absolute inset-0 flex flex-col items-center justify-center bg-primary-dark/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300">
                   <Camera size={22} className="text-amber-500 mb-2" />
                   <span className="text-amber-500 font-bold text-[10px] uppercase tracking-widest">Update Signature</span>
                   <input type="file" accept="image/*" onChange={handlePictureUpload} className="hidden" />
                </label>
              </div>
              
              {saving && (
                <div className="absolute inset-0 flex items-center justify-center bg-surface/50 rounded-2xl backdrop-blur-sm">
                  <RefreshCw size={22} className="text-amber-500 animate-spin" />
                </div>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-on-surface mb-1 tracking-tight">{profile?.full_name}</h2>
            <p className="text-on-surface-variant text-sm font-medium mb-8 flex items-center gap-2">
              <Mail size={14} className="text-amber-500/40" />
              {profile?.email}
            </p>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/8 text-amber-500 text-[10px] font-bold rounded-lg uppercase tracking-[0.2em] border border-amber-500/15">
              <ShieldCheck size={14} />
              {profile?.role} System Access
            </div>
            
            <div className="w-full mt-10 pt-8 border-t border-outline/20 space-y-4 text-left">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-on-surface-variant/40 font-bold uppercase tracking-widest">System Node</span>
                <span className="text-on-surface font-mono font-bold bg-primary-dark px-2.5 py-1 rounded-lg border border-outline/20 uppercase">{profile?.id.slice(0, 8)}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-on-surface-variant/40 font-bold uppercase tracking-widest">Security Status</span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="text-emerald-400 font-bold">AUTHORIZED</span>
                </div>
              </div>
            </div>
          </div>

          <div className="premium-card p-5 flex gap-4">
            <div className="p-3 bg-primary-dark rounded-lg border border-outline/20">
              <Fingerprint size={22} className="text-amber-500/40" />
            </div>
            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Protocol Guard</h4>
              <p className="text-[11px] text-on-surface-variant/50 leading-relaxed">
                Your session is encrypted using industry-standard protocols. Rotate your password every 90 days.
              </p>
            </div>
          </div>
        </div>

        {/* Configuration Forms */}
        <div className="lg:col-span-8 space-y-6">
          <div className="premium-card p-10">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-11 h-11 bg-amber-500/8 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/15">
                <UserCircle size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold tracking-tight">Identity Parameters</h3>
                <p className="text-xs text-on-surface-variant font-medium">Synchronize your personal profile with the ledger.</p>
              </div>
            </div>
            
            <form onSubmit={handleProfileUpdate} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Legal Full Name</label>
                  <div className="relative group">
                    <UserCircle size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-amber-500 transition-colors" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="input-field pl-12"
                      placeholder="e.g. Alexander Pierce"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-widest ml-1">System Identifier (Email)</label>
                  <div className="relative opacity-50">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                    <input type="email" value={profile?.email || ''} disabled className="input-field pl-12 bg-primary-dark cursor-not-allowed border-outline/10" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Contact Terminal</label>
                  <div className="relative group">
                    <Phone size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-amber-500 transition-colors" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9+\-()\s]/g, ''))}
                      className="input-field pl-12"
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-outline/20 flex justify-end">
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="btn-primary flex items-center gap-2 px-10"
                >
                  {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Synchronizing...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          <div className={`premium-card p-10 transition-all duration-500 ${showPasswordForm ? 'border-amber-500/15' : ''}`}>
            <div className="flex justify-between items-start mb-10">
              <div className="flex items-center gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all ${showPasswordForm ? 'bg-amber-500 text-primary-dark border-amber-500 shadow-amber-md' : 'bg-amber-500/8 text-amber-500 border-amber-500/15'}`}>
                  <Lock size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Security Credentials</h3>
                  <p className="text-xs text-on-surface-variant font-medium">Manage your system authentication layer.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPasswordForm(!showPasswordForm)} 
                className="btn-outline text-[10px] uppercase font-bold tracking-widest"
              >
                {showPasswordForm ? 'Cancel Update' : 'Modify Password'}
              </button>
            </div>
            
            {showPasswordForm ? (
              <form onSubmit={handlePasswordChange} className="space-y-8 animate-fade-in max-w-2xl">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Identity Verification (Current Password)</label>
                  <div className="relative group">
                    <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-amber-500 transition-colors" />
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="input-field pl-12"
                      placeholder="••••••••••••"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">New Security Token</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-field"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest ml-1">Confirm Security Token</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
                
                <div className="pt-6 flex justify-end">
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="btn-primary px-10 flex items-center gap-2"
                  >
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                    {saving ? 'Validating...' : 'Update Credentials'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center gap-6 p-6 bg-primary-dark rounded-xl border border-outline/20">
                <div className="w-14 h-14 bg-surface rounded-xl flex items-center justify-center border border-outline/20">
                  <HardDrive size={28} className="text-amber-500/30" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-on-surface font-bold">Credential Vault Protected</p>
                  <p className="text-xs text-on-surface-variant/60 leading-relaxed font-medium">Your credentials are stored using high-entropy hashing. All updates require current identity verification.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}