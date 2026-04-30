import { useState, useEffect, useRef } from 'react';
import {
  Camera,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  LocateFixed,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import { formatISTTime } from '../utils/datetime';

export default function QRScanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { latitude, longitude, error: geoError, isLoading: geoLoading } = useGeolocation();

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [locationResult, setLocationResult] = useState<any>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [mode, setMode] = useState<'photo' | 'confirm' | 'result'>('photo');
  const [isProcessing, setIsProcessing] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (mode === 'photo') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Failed to initialize biometric camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedPhoto(photoData);
        setMode('confirm');
        stopCamera();
      }
    }
  };

  const submitAttendance = async () => {
    setError('');

    if (!latitude || !longitude) {
      setError('Satellite link lost. GPS coordinates are required for verification.');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await api.attendance.scan({
        latitude,
        longitude,
        device_info: navigator.userAgent,
        face_photo: capturedPhoto || undefined
      });

      setLocationResult(result);
      setSuccess(true);
      setMode('result');
    } catch (err: any) {
      const message = err.response?.data?.error || err.response?.data?.message || 'Verification rejected by system.';
      setError(message);
      setMode('photo');
      setCapturedPhoto(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/8 text-amber-500 rounded-lg border border-amber-500/15">
          <UserCheck size={14} />
          <span className="text-[10px] font-bold uppercase tracking-wider">Attendance Check-In</span>
        </div>
        <h1 className="text-3xl font-bold text-on-surface tracking-tight">
          Biometric + Geofence Verification
        </h1>

        <div className="flex items-center justify-center gap-4 pt-4">
          <StepIndicator active={mode === 'photo'} complete={mode !== 'photo'} label="Biometric" icon={<UserCheck size={14} />} />
          <div className="w-8 h-px bg-outline/30"></div>
          <StepIndicator active={mode === 'confirm'} complete={mode === 'result'} label="Location" icon={<MapPin size={14} />} />
          <div className="w-8 h-px bg-outline/30"></div>
          <StepIndicator active={mode === 'result'} complete={mode === 'result' && success} label="Result" icon={<ShieldCheck size={14} />} />
        </div>
      </div>

      {(geoError || error) && (
        <div className="bg-rose-500/8 border border-rose-500/20 text-rose-400 px-6 py-4 rounded-xl flex items-start gap-3 animate-fade-in">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider">Verification Error</p>
            <p className="text-sm font-medium">{geoError || error}</p>
          </div>
        </div>
      )}

      {mode === 'photo' && (
        <div className="premium-card p-3 flex flex-col items-center relative overflow-hidden group">
          <div className="absolute top-4 left-4 z-10">
            <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500 tracking-widest bg-surface/90 backdrop-blur px-3 py-1.5 rounded-lg border border-amber-500/15">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              LIVENESS CHECK
            </div>
          </div>

          <div className="relative w-full aspect-[4/5] bg-primary-dark rounded-[1.5rem] overflow-hidden border border-outline/20">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-[40px] border-surface/50"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[75%] h-[65%] border-2 border-amber-500/20 rounded-[3rem] shadow-[0_0_0_100vw_rgba(15,15,24,0.5)]"></div>

              <div className="absolute top-[18%] left-[13%] w-8 h-8 border-t-4 border-l-4 border-amber-500/60 rounded-tl-2xl"></div>
              <div className="absolute top-[18%] right-[13%] w-8 h-8 border-t-4 border-r-4 border-amber-500/60 rounded-tr-2xl"></div>
              <div className="absolute bottom-[18%] left-[13%] w-8 h-8 border-b-4 border-l-4 border-amber-500/60 rounded-bl-2xl"></div>
              <div className="absolute bottom-[18%] right-[13%] w-8 h-8 border-b-4 border-r-4 border-amber-500/60 rounded-br-2xl"></div>
            </div>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-6 py-2.5 bg-primary-dark/80 backdrop-blur-md rounded-lg border border-amber-500/20">
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest whitespace-nowrap">ALIGN FACE WITHIN GUIDES</p>
            </div>
          </div>

          <div className="p-8 w-full flex flex-col items-center">
            <button
              onClick={capturePhoto}
              disabled={geoLoading || !!geoError}
              className="group relative w-20 h-20 flex items-center justify-center disabled:opacity-50 transition-all"
            >
              <div className="absolute inset-0 bg-amber-500/15 rounded-full scale-125 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="absolute inset-0 rounded-full group-active:scale-90 transition-transform flex items-center justify-center shadow-amber-md" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <Camera size={30} className="text-primary-dark" />
              </div>
            </button>
            <p className="mt-6 text-xs text-on-surface-variant/50 font-bold uppercase tracking-widest">Capture Biometric Signature</p>
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      {mode === 'confirm' && capturedPhoto && (
        <div className="premium-card p-8 text-center space-y-6">
          <div className="relative w-48 h-48 mx-auto rounded-2xl overflow-hidden border-2 border-amber-500/20 shadow-midnight">
            <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-on-surface">Confirm Check-In</h3>
            <p className="text-xs text-on-surface-variant font-medium">We will verify your location against the assigned geofence.</p>
          </div>
          <div className="space-y-3">
            <button
              onClick={submitAttendance}
              disabled={isProcessing}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 border-2 border-primary-dark/30 border-t-primary-dark rounded-full animate-spin"></div>
                  VERIFYING...
                </div>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  Verify Location & Check In
                </>
              )}
            </button>
            <button
              onClick={() => { setMode('photo'); setCapturedPhoto(null); setError(''); }}
              className="w-full flex items-center justify-center gap-2 text-on-surface-variant/50 text-[10px] font-bold uppercase tracking-widest hover:text-amber-500 transition-colors"
            >
              <RotateCcw size={14} />
              Retake Photo
            </button>
          </div>
        </div>
      )}

      {mode === 'result' && locationResult && (
        <div className="premium-card p-10 animate-fade-in text-center relative overflow-hidden">
          <div className={`absolute top-0 inset-x-0 h-1 ${success ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>

          <div className={`w-20 h-20 ${success ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'} rounded-2xl flex items-center justify-center mx-auto mb-8 border`}>
            {success ? <ShieldCheck size={40} /> : <ShieldAlert size={40} />}
          </div>

          <h2 className="text-2xl font-bold text-on-surface mb-2 tracking-tight">{success ? 'Check-In Authorized' : 'Verification Denied'}</h2>
          <p className="text-on-surface-variant font-medium mb-10 tracking-wide uppercase text-[10px]">Credential logged for {user?.full_name}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left mb-10">
            <ResultItem icon={<MapPin size={14} />} label="Location Node" value={locationResult.location_name} />
            <ResultItem icon={<ShieldCheck size={14} />} label="Auth Status" value={locationResult.status.replace(/_/g, ' ').toUpperCase()} highlight={success} />
            <ResultItem icon={<LocateFixed size={14} />} label="GPS Proximity" value={`${Math.round(locationResult.distance)}m to Target`} />
            <ResultItem icon={<Clock size={14} />} label="Timestamp" value={formatISTTime(new Date(), { hour: '2-digit', minute: '2-digit' })} />
          </div>

          <button
            onClick={() => { setSuccess(false); setMode('photo'); setCapturedPhoto(null); setLocationResult(null); setError(''); }}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Initialize New Session
          </button>
        </div>
      )}

      <div className="bg-surface border border-outline/20 p-5 rounded-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-32 h-32 bg-amber-500/3 blur-3xl -mr-16 -mt-16"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-primary-dark p-3 rounded-xl border border-outline/20 text-on-surface-variant">
            <LocateFixed size={22} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest">Telemetry Link</p>
              <span className={`w-1.5 h-1.5 rounded-full ${latitude ? 'bg-emerald-400' : 'bg-amber-500 animate-pulse'}`}></span>
            </div>
            <p className="text-xs text-on-surface-variant/50 font-medium leading-tight">Verified satellite positioning is active. Environmental data encrypted.</p>
          </div>
          <div className="text-right">
            <p className={`text-[10px] font-black tracking-widest ${latitude ? 'text-emerald-400' : 'text-amber-500'}`}>
              {latitude ? 'LOCKED' : 'WAITING...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ active, complete, label, icon }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
        active
          ? 'bg-amber-500 text-primary-dark shadow-amber-sm scale-110'
          : complete
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-surface text-on-surface-variant/40 border border-outline/20'
      }`}>
        {complete ? <CheckCircle2 size={14} /> : icon}
      </div>
      <span className={`text-[9px] font-bold uppercase tracking-wider ${active ? 'text-amber-500' : 'text-on-surface-variant/40'}`}>
        {label}
      </span>
    </div>
  );
}

function ResultItem({ icon, label, value, highlight }: any) {
  return (
    <div className="p-4 bg-primary-dark rounded-xl border border-outline/20 transition-all hover:border-amber-500/15">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="text-amber-500/50">{icon}</div>
        <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest">{label}</p>
      </div>
      <p className={`text-sm font-bold truncate ${highlight ? 'text-emerald-400' : 'text-on-surface'}`}>{value}</p>
    </div>
  );
}