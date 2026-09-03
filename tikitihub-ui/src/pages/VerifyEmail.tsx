import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/client';
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const hasCalled = useRef(false)

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your TikitiHub account...');

  useEffect(() => {
    if (hasCalled.current) return;
    hasCalled.current = true;

    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token link.');
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await apiClient.get(`/auth/verify?token=${token}`);
        setStatus('success');
        setMessage(response.data?.message || 'Account activated successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(
          err.response?.data?.error || 
          err.response?.data?.message || 
          'Verification failed or token has expired.'
        );
      }
    };

    verifyToken();
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6 text-slate-800">
      <div className="bg-white border border-slate-200/80 rounded-3xl p-8 max-w-md w-full text-center shadow-xs space-y-6">
        
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center border shadow-2xs transition-all">
          {status === 'loading' && (
            <div className="bg-indigo-50 border-indigo-100 text-indigo-600 w-full h-full rounded-2xl flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          )}
          {status === 'success' && (
            <div className="bg-emerald-50 border-emerald-100 text-emerald-600 w-full h-full rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          )}
          {status === 'error' && (
            <div className="bg-rose-50 border-rose-100 text-rose-600 w-full h-full rounded-2xl flex items-center justify-center">
              <XCircle className="w-8 h-8" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">
            {status === 'loading' && 'Activating Account'}
            {status === 'success' && 'Account Verified!'}
            {status === 'error' && 'Verification Failed'}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
            {message}
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100">
          {status === 'success' && (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Proceed to Sign In <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {status === 'error' && (
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              Back to Login
            </button>
          )}

          {status === 'loading' && (
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400">
              <ShieldCheck className="w-4 h-4 text-indigo-500" /> Securing identity credentials...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}