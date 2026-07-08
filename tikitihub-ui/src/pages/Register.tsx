import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const register = useAuthStore((state) => state.register);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'ROLE_CUSTOMER', 
  });

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requirements = [
    { label: 'Minimum 8 characters long', value: formData.password.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', value: /[A-Z]/.test(formData.password) },
    { label: 'At least one lowercase letter (a-z)', value: /[a-z]/.test(formData.password) },
    { label: 'At least one digit (0-9)', value: /[0-9]/.test(formData.password) },
    { label: 'At least one special character (@$!%*?&)', value: /[@$!%*?&]/.test(formData.password) },
  ];

  const isPasswordSecure = requirements.every((req) => req.value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordSecure) return; // Safeguard submission block

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await register({
        fullName: formData.fullName, 
        email: formData.email, 
        password: formData.password, 
        role: formData.role
      });

      setSuccess('Profile initialized successfully! Redirecting...');

      setTimeout(() => {
          navigate('/login');
      }, 1500);
      
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl transition-all duration-300 transform hover:scale-[1.005]">
        <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-3xl blur-xl opacity-20"></div>
        
        <div className="relative bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="p-8 sm:p-10">
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                <h1 className="text-3xl font-extrabold tracking-tight">Create Profile</h1>
              </div>
              <p className="text-xs text-gray-500 mt-1.5 uppercase tracking-widest font-semibold">
                TikitiHub Account Initialization
              </p>
            </div>
            
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center justify-center gap-2 font-medium">
                <span></span> {error}
              </div>
            )}

            {success && (
              <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-xs flex items-center justify-center gap-2 font-medium">
                <span></span> {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="fullName" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">👤</span>
                    <Input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="John Smith"
                      className="pl-10 w-full focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">✉</span>
                    <Input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="johnsmith@email.com"
                      className="pl-10 w-full focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Layout Adjustments to hold full-width password block next to checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Password 
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">🔒</span>
                    <Input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="pl-10 w-full focus:ring-2 focus:ring-blue-500/20"
                      required
                    />
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-1.5 self-end">
                  <span className="block text-[9px] font-extrabold tracking-wider text-slate-400 uppercase mb-1">
                    Security Metric Baseline
                  </span>
                  {requirements.map((req, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] font-medium">
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[9px] font-bold shrink-0 ${
                        req.value 
                          ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
                          : 'bg-white text-slate-300 border-slate-200'
                      }`}>
                        {req.value ? '✓' : '•'}
                      </span>
                      <span className={req.value ? 'text-slate-400 line-through decoration-slate-200' : 'text-slate-600'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-600/20 transition-all duration-150 transform active:scale-[0.99] mt-2 disabled:opacity-40 disabled:pointer-events-none"
                disabled={loading || !isPasswordSecure}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block">✦</span>
                    Getting your profile ready...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    Register Profile <span className="text-sm">→</span>
                  </span>
                )}
              </Button>
            </form>

            <div className="text-center mt-8 pt-6 border-t border-gray-100">
              <p className="text-gray-500 text-xs">
                Already have a TikitiHub profile?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
                  Secure Sign-In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};