import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useBookingStore } from '../stores/useBookingStore';
import { Ticket, Calendar, Clock, MapPin, ArrowRight, ShieldCheck, HelpCircle, Check, AlertCircle } from 'lucide-react';
import { TicketDownloader } from '../components/TicketDownloader';

export default function MyTickets() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const { bookings, loading, fetchUserBookings } = useBookingStore();

  useEffect(() => {
    if (user) {
      fetchUserBookings();
    }
  }, [user, fetchUserBookings]);

  // Updated badge styles to handle EXPIRED status
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'REDEEMED': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'CONFIRMED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'EXPIRED': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (!user) {
    return (
      <div className="text-center py-16 text-slate-500 max-w-sm mx-auto space-y-4">
        <p className="text-sm font-medium">Please log in to view your secure ticket dashboard portfolio.</p>
        <button onClick={() => navigate('/login')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer">
          Go to Sign In
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center py-16 text-slate-400 font-medium text-xs">Loading secured passes...</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-8 text-slate-800 bg-slate-50/30 min-h-screen">
      
      {/* Profile summary card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-16 h-16 bg-indigo-600 text-white font-black rounded-full flex items-center justify-center text-xl uppercase shadow-xs">
            {user.email.substring(0, 2)}
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{user.email || 'TikitiHub Attendee'}</h1>
            <p className="text-xs text-slate-400 mt-1">Role Type: <span className="text-indigo-600 font-bold uppercase">{user.role}</span></p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">{user.email}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 text-center md:text-left max-w-xs">
          <span className="block text-[10px] text-indigo-600 uppercase font-extrabold tracking-wider">Account Verified</span>
          <span className="text-sm font-bold text-slate-800 mt-1 flex items-center justify-center md:justify-start gap-1">
            <ShieldCheck className="w-4 h-4 text-indigo-600" /> Standard User.
          </span>
        </div>
      </div>

      {/* Bookings panel */}
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">My Booked Passes</h2>
            <p className="text-xs text-slate-400">View active tickets, checked-in records, and entry logs.</p>
          </div>
          <span className="text-xs bg-white text-slate-700 font-bold px-3 py-1 rounded-xl border border-slate-200 shadow-2xs">
            {bookings.length} total orders
          </span>
        </div>

        {bookings.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-lg mx-auto shadow-2xs">
            <Ticket className="w-12 h-12 text-indigo-500/40 mx-auto mb-4" />
            <h3 className="text-base font-bold text-slate-800 mb-2">No booked tickets found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed mb-6">
              You do not have any upcoming reservations registered to your account at this moment.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              Discover Live Events <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          /* BOOKINGS LIST */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookings.map((booking: any) => {
              const targetTicket = booking.eventTicket || {};
              
              // 🕒 1. Check if event date has passed
              const rawEventDate = targetTicket.eventDate || targetTicket.date;
              const isEventPassed = rawEventDate ? new Date(rawEventDate) < new Date() : false;
              
              // 🏷️ 2. Determine effective status
              const isRedeemed = booking.status === 'REDEEMED';
              const isExpired = isEventPassed || targetTicket.status === 'EXPIRED' || booking.status === 'EXPIRED';
              
              const displayStatus = isRedeemed ? 'REDEEMED' : (isExpired ? 'EXPIRED' : (booking.status || 'CONFIRMED'));
              
              // Map payload dynamically
              const downloadPayload = {
                id: booking.id,
                quantity: booking.quantity,
                qrRedemptionToken: booking.qrRedemptionToken,
                status: displayStatus,
                createdAt: booking.createdAt,
                buyer: {
                  fullName: user.email?.split('@')[0] || 'Attendee',
                  email: user.email
                },
                eventTicket: {
                  id: targetTicket.id,
                  title: targetTicket.eventName || 'TikitiHub Pass',
                  price: targetTicket.price || 0
                }
              };

              return (
                <div 
                  key={booking.id}
                  className={`bg-white rounded-3xl border overflow-hidden shadow-xs flex flex-col justify-between transition-all relative ${
                    isExpired ? 'border-slate-200 opacity-75 grayscale-[20%]' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="absolute top-1/2 left-0 w-3 h-6 bg-slate-50 border-r border-t border-b border-slate-200 rounded-r-full -translate-y-1/2" />
                  <div className="absolute top-1/2 right-0 w-3 h-6 bg-slate-50 border-l border-t border-b border-slate-200 rounded-l-full -translate-y-1/2" />

                  {/* Header details */}
                  <div className="p-5 border-b border-dashed border-slate-200">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${getStatusStyle(displayStatus)}`}>
                          {displayStatus}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-2 truncate max-w-[200px]">
                          {targetTicket.eventName || 'TikitiHub Event'}
                        </h3>
                      </div>
                      <span className={`text-xs font-bold font-mono shrink-0 px-2 py-1 rounded border ${
                        isExpired ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                      }`}>
                        {booking.qrRedemptionToken ? booking.qrRedemptionToken.substring(0, 10) + '...' : 'VALID'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" /> 
                        {rawEventDate ? new Date(rawEventDate).toLocaleDateString() : 'Upcoming'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" /> 
                        {rawEventDate ? new Date(rawEventDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '18:00'}
                      </span>
                      <span className="flex items-center gap-1 col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> 
                        {targetTicket.venue || 'Main Stage Lounge'}
                      </span>
                    </div>
                  </div>

                  {/* Footer Action Core Grid */}
                  <div className="p-5 bg-slate-50/70 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Quantity Booked</span>
                        <span className="text-xs font-bold text-slate-700 mt-1 block">
                          {booking.quantity} Ticket(s)
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Price Tier</span>
                        <span className="text-sm font-black text-slate-900">Kes {targetTicket.price || '0'} /=</span>
                      </div>
                    </div>

                    {/* Verification Status & Action Row */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-4">
                      <div>
                        {isRedeemed ? (
                          <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Redeemed at Gate
                          </span>
                        ) : isExpired ? (
                          <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Event Concluded
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                            ● Pass Active
                          </span>
                        )}
                      </div>
                      
                      <div className="flex-1 max-w-[240px]">
                        {isExpired ? (
                          <button
                            disabled
                            className="w-full py-2 px-3 bg-slate-200 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed text-center block"
                          >
                            Pass Expired
                          </button>
                        ) : (
                          <TicketDownloader booking={downloadPayload} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info notice */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 flex items-start gap-3 max-w-3xl mx-auto shadow-2xs">
        <HelpCircle className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-bold text-slate-800">Seating & Expiry Rules</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
            Tickets are valid strictly up to the scheduled event start time. Expired passes cannot be downloaded or used for gate entry.
          </p>
        </div>
      </div>
    </div>
  );
}