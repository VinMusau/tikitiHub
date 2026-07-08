import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      
      const freshUser = useAuthStore.getState().user;

      if (!freshUser) {
        return;
      }

      if (freshUser?.role === 'ROLE_AGENT' || freshUser?.role === 'AGENT') {
        navigate('/organizer/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      console.error("Login component routing sequence failed:", err);
      setError(err?.message || 'Invalid email credentials or password entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="relative w-full max-w-md transition-all duration-300 transform hover:scale-[1.01]">
        <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 to-pink-500 rounded-3xl blur-xl opacity-30"></div>
        
        {/* Main Card */}
        <div className="relative bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden border border-white/20">

          {/* Symmetrical Content Wrapper */}
          <div className="p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                <h1 className="text-3xl font-extrabold tracking-tight">Welcome Back</h1>
              </div>
              <p className="text-xs text-gray-500 mt-1.5 uppercase tracking-widest font-semibold">
                TikitiHub Access Control
              </p>
            </div>
            
            {/* Error Message */}
            {error && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs flex items-center justify-center gap-2 font-medium">
                <span></span> {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                    ✉
                  </span>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="johndoe@email.com"
                    className="pl-10 w-full focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
                    🔒
                  </span>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10 w-full focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-gray-305 text-blue-650 focus:ring-blue-500 transition-all cursor-pointer" 
                  />
                  <span>Remember me</span>
                </label>
                <a href="#forgot" className="text-blue-600 hover:text-blue-700 font-bold hover:underline transition-all">
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                fullWidth
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-600/20 transition-all duration-150 transform active:scale-[0.99]"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin inline-block">✦</span>
                    Validating ...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    Enter Event Portal <span className="text-sm">→</span>
                  </span>
                )}
              </Button>
            </form>

            {/* Register Link */}
            <div className="text-center mt-8 pt-6 border-t border-gray-100">
              <p className="text-gray-500 text-xs">
                Don't have a TikitiHub account yet?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-bold hover:underline">
                  Get one now
                </Link>
              </p>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}