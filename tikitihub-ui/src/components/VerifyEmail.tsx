import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import apiClient from '../lib/client';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your account…');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('This verification link is missing its token. Please use the link from your email.');
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    setStatus('loading');
    setMessage('Verifying your account…');

    apiClient
      .get(`/auth/verify`, {
        params: { token },
        signal: controller.signal,
      })
      .then(() => {
        if (cancelled) return;
        setStatus('success');
        setMessage('Your account is now active. You can log in and start buying tickets.');
      })
      .catch((err: any) => {
        if (cancelled) return;
        // Ignore aborts — the request was cancelled intentionally
        if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;

        setStatus('error');
        setMessage(
          err.response?.data?.error ||
            'This verification link is invalid or has expired. Please request a new one.'
        );
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-3xl shadow-xl text-center">
        {status === 'loading' && (
          <div className="text-xl animate-pulse text-indigo-600 font-bold">Checking Status…</div>
        )}
        {status === 'success' && (
          <div className="text-xl text-emerald-600 font-black">Account Active</div>
        )}
        {status === 'error' && (
          <div className="text-xl text-red-600 font-black">Verification Failed</div>
        )}

        <p className="text-sm text-slate-500 mt-4 font-medium mb-6">{message}</p>

        {status !== 'loading' && (
          <Link
            to="/login"
            className="inline-block px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-xs hover:bg-indigo-700 transition-colors"
          >
            Return to Login
          </Link>
        )}
      </div>
    </div>
  );
}