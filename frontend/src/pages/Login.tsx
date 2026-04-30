import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle,
  Fingerprint,
  Cpu,
  Globe,
  Flame
} from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@system.com');
  const [password, setPassword] = useState('12345678');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-primary-dark overflow-hidden font-['Inter']">
      {/* Visual Side (Landing) */}
      <div className="hidden lg:flex lg:w-3/5 relative bg-background items-center justify-center p-12 overflow-hidden">
        {/* Ambient glow effects */}
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-amber-500/8 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-amber-600/5 rounded-full blur-[140px]"></div>
        <div className="absolute top-[40%] right-[20%] w-[20%] h-[20%] bg-amber-400/3 rounded-full blur-[100px]"></div>
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }}></div>
        
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl shadow-amber-lg mb-10 animate-scale-up">
            <Flame size={40} className="text-primary-dark" />
          </div>
          <h1 className="text-7xl font-black text-on-surface tracking-tighter leading-[0.95] mb-8 animate-fade-in">
            Precision <br />
            <span className="text-amber-gradient">Attendance</span> <br />
            Protocol.
          </h1>
          <p className="text-lg text-on-surface-variant font-medium leading-relaxed max-w-lg mb-12 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            The enterprise-grade geofencing solution for real-time presence verification and automated workforce logistics.
          </p>
          
          <div className="flex gap-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-amber-gradient">100%</div>
              <div className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.25em]">Geofence Accuracy</div>
            </div>
            <div className="w-px h-14 bg-outline/30"></div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-amber-gradient">Real-time</div>
              <div className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-[0.25em]">Biometric Sync</div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Side */}
      <div className="flex-1 flex items-center justify-center p-6 relative bg-surface">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.02] to-transparent"></div>
        
        <div className="w-full max-w-[420px] relative z-10">
          <div className="lg:hidden text-center mb-12">
             <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-amber-700 rounded-2xl mb-6 shadow-amber-md">
              <Flame size={32} className="text-primary-dark" />
            </div>
            <h1 className="text-3xl font-bold text-on-surface tracking-tight">Chronos <span className="text-amber-gradient">Auth</span></h1>
          </div>

          <div className="premium-card p-10 backdrop-blur-xl animate-slide-in">
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-on-surface mb-2">Access Terminal</h2>
              <p className="text-xs text-on-surface-variant font-medium">Please authorize with your security credentials.</p>
            </div>
            
            {error && (
              <div className="bg-rose-500/8 border border-rose-500/20 text-rose-400 px-5 py-4 rounded-xl mb-8 text-xs font-bold flex items-center gap-3 animate-shake">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-[0.2em] ml-1">Identity</label>
                <div className="relative group">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field pl-12"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-[0.2em]">Security Key</label>
                </div>
                <div className="relative group">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-amber-500 transition-colors" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pl-12 tracking-widest"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-5 flex items-center justify-center gap-3 text-xs tracking-[0.2em] mt-4"
              >
                {loading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-primary-dark/30 border-t-primary-dark rounded-full animate-spin"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <>
                    <span>Initialize Access</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>
          
          <div className="mt-10 flex justify-center gap-8 text-[9px] font-bold text-on-surface-variant/30 uppercase tracking-[0.3em]">
            <div className="flex items-center gap-2"><Fingerprint size={12} /> SECURE</div>
            <div className="flex items-center gap-2"><Cpu size={12} /> ENCRYPTED</div>
            <div className="flex items-center gap-2"><Globe size={12} /> GLOBAL</div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}</style>
    </div>
  );
}