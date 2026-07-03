import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useCartStore } from '../../stores/cartStore';
import { Ticket, User, Briefcase, LogOut } from 'lucide-react';
import Button from '../common/Button';

export default function Header() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const { items } = useCartStore();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const isAgent = user?.role === 'ROLE_AGENT';

  const getRoleBadgeStyle = (role?: string) => {
    if (role === 'ROLE_AGENT') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const getRoleIcon = (role?: string) => {
    if (role === 'ROLE_AGENT') return <Briefcase className="w-3.5 h-3.5 text-amber-600 mr-1" />;
    return <User className="w-3.5 h-3.5 text-indigo-600 mr-1" />;
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
      <div className="container mx-auto px-4 h-16 flex justify-between items-center">
        
        {/* Logo Link - Redirects depending on context role */}
        <Link 
          to={isAgent ? "/organizer/dashboard" : "/"} 
          className="flex items-center gap-2 group"
        >
          <div className="p-2 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-xl shadow-xs transition-transform duration-200 group-hover:scale-105">
            <Ticket className="w-5 h-5" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-slate-900">TikitiHub</span>
            <span className="block text-[9px] text-slate-400 font-bold tracking-widest uppercase leading-none">
              {isAgent ? 'Organizer Portal' : 'Event Pass Platform'}
            </span>
          </div>
        </Link>

        {/* Dynamic Nav - Display sections conditionally */}
        <nav className="flex items-center gap-6">
          {!isAgent ? (
            <>
              {/* Customer Facing Links */}
              <Link to="/" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                Explore Events
              </Link>
              
              <Link to="/my-tickets" className="text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors">
                My Tickets
              </Link>

              <Link to="/checkout" className="relative text-sm font-bold text-slate-600 hover:text-indigo-600 transition-colors pr-2">
                Cart
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-indigo-600 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow-xs">
                    {cartCount}
                  </span>
                )}
              </Link>
            </>
          ) : (
            /* Agent Facing Links */
            <Link to="/organizer/dashboard" className="text-sm font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1 rounded-lg">
              Dashboard Active
            </Link>
          )}

          {/* User Section & Authentication Blocks */}
          <div className="flex items-center gap-4 border-l pl-4 border-slate-200">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                {/* Role Badge identifier pill */}
                <div className={`hidden sm:flex items-center border rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${getRoleBadgeStyle(user.role)}`}>
                  {getRoleIcon(user.role)}
                  {user.role?.replace('ROLE_', '')}
                </div>

                

                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => { logout(); navigate('/login'); }}
                  className="flex items-center gap-1 text-slate-500 border-slate-200 hover:bg-slate-50"
                >
                  <LogOut className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login">
                  <Button variant="outline" size="sm" className="border-slate-200 text-slate-700">Login</Button>
                </Link>
                <Link to="/register">
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">Register</Button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}