import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../lib/client';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying account activation code metrics...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing account activation registration link token framework.');
      return;
    }

    apiClient.get(`/auth/verify?token=${token}`)
      .then(() => {
        setStatus('success');
        setMessage('Your account is now fully active! You can now access full checkout features.');
      })
      .catch((err: any) => {
        setStatus('error');
        setMessage(err.response?.data?.error || 'Verification pipeline tracing token expired.');
      });
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-xl text-center">
        {status === 'loading' && <div className="text-xl animate-pulse text-indigo-600 font-bold">Checking Status...</div>}
        {status === 'success' && <div className="text-xl text-emerald-600 font-black">Account Active</div>}
        {status === 'error' && <div className="text-xl text-red-600 font-black">Verification Failed</div>}
        
        <p className="text-sm text-slate-500 mt-4 font-medium mb-6">{message}</p>
        
        {status !== 'loading' && (
          <Link to="/login" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-indigo-700 transition-colors">
            Return to Login Portal
          </Link>
        )}
      </div>
    </div>
  );
}