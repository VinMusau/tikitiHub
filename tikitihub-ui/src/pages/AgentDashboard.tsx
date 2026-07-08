import React, { useEffect, useState } from 'react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { useBookingStore } from '../stores/useBookingStore';
import { 
  Plus, Calendar, Clock, MapPin, DollarSign, Users, TrendingUp, Sparkles, 
  X, Briefcase, BarChart3, CheckCircle2, Image as ImageIcon
} from 'lucide-react';

export default function AgentDashboard() {
  const { events = [], loading, error, createEvent, fetchMyListings } = useEventStore();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'check-in'>('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    eventName: '', description: '', venue: '', eventDate: '', price: '', totalQuantity: '', imageUrl: ''
  });

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  const totalRevenue = (events || []).reduce((sum: number, e: any) => {
    const sold = e.totalQuantity - (e.remainingQuantity ?? e.totalQuantity);
    return sum + (sold * e.price);
  }, 0);

  const totalTicketsSold = (events || []).reduce((sum: number, e: any) => {
    return sum + (e.totalQuantity - (e.remainingQuantity ?? e.totalQuantity));
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Clean fallback if banner image link is left blank
      const finalImageUrl = formData.imageUrl.trim() || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80";

      await createEvent({
        ...formData,
        imageUrl: finalImageUrl,
        price: parseFloat(formData.price),
        totalQuantity: parseInt(formData.totalQuantity, 10),
        eventDate: new Date(formData.eventDate).toISOString().split('.')[0]
      });
      
      setShowCreateForm(false);
      setFormData({ eventName: '', description: '', venue: '', eventDate: '', price: '', totalQuantity: '', imageUrl: '' });
      fetchMyListings(); 
      setActiveTab('events');
    } catch (err) {
      console.error("Submission failed.");
    }
  };

  const redeemTicketGateScan = useBookingStore((state) => state.redeemTicketGateScan);
  const [scanToken, setScanToken] = useState('');
  const [scanStatus, setScanStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);

  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanToken.trim()) return;

    setScanLoading(true);
    setScanStatus(null);

    const result = await redeemTicketGateScan(scanToken.trim());
    setScanStatus(result);
    setScanLoading(false);
    
    setScanToken('');
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-slate-800 min-h-screen p-6 bg-slate-50/50">
      
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl font-bold text-slate-900">{user?.email?.split('@')[0] || 'Organizer'}</h1>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full uppercase">
                Verified Host
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Account Class: <span className="text-purple-600 font-semibold uppercase">Event Administrator</span></p>
            <p className="text-xs font-medium text-slate-400 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Listing
        </button>
      </div>

      {/* Tabs Navigation Layout */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-0.5">
        <button
          onClick={() => { setActiveTab('overview'); setShowCreateForm(false); }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'overview' && !showCreateForm ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" /> Performance Metrics
        </button>
        <button
          onClick={() => { setActiveTab('events'); setShowCreateForm(false); }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'events' && !showCreateForm ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 inline mr-1.5" /> Live Marketplace ({(events || []).length})
        </button>
        <button
          onClick={() => { setActiveTab('check-in'); setShowCreateForm(false); }}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'check-in' && !showCreateForm ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" /> Gate Check-In
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">{error}</div>}

      {/* CREATION DRAWER WIZARD */}
      {showCreateForm ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider font-bold px-2.5 py-1 rounded">
                Creation Pipeline
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">Publish a New Marketplace Event</h2>
            </div>
            <button onClick={() => setShowCreateForm(false)} className="p-1.5 hover:bg-slate-100 text-slate-400 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Event Title *</label>
                <input required type="text" placeholder="e.g. Nairobi Summer Beats" value={formData.eventName} onChange={e => setFormData({...formData, eventName: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Venue Address Location *</label>
                <input required type="text" placeholder="e.g. Alchemist Arena, Westlands" value={formData.venue} onChange={e => setFormData({...formData, venue: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Schedule Date & Time *</label>
                <input required type="datetime-local" value={formData.eventDate} onChange={e => setFormData({...formData, eventDate: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm text-slate-600 focus:border-purple-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Single Admission Tariff (KES ) *</label>
                <input required type="number" step="0.01" placeholder="25.00" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Event Banner Image URL</label>
                <input type="url" placeholder="https://images.unsplash.com/... (or leave blank for custom default)" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Capacity Supply Supply *</label>
                <input required type="number" placeholder="300" value={formData.totalQuantity} onChange={e => setFormData({...formData, totalQuantity: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Public Summary Info Description *</label>
                <textarea required rows={3} placeholder="Provide specific instructions regarding gates openings, age limits, and line ups details..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-semibold hover:bg-slate-50">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs">Publish Live Listing</button>
            </div>
          </form>
        </div>
      ) : activeTab === 'overview' ? (
        /* LIGHT ANALYTICS SUMMARY */
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider">Gross Revenue</span>
                <DollarSign className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">Kes {totalRevenue.toFixed(2)}</span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider">Tickets Sold</span>
                <Users className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalTicketsSold} tickets</span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider">Active Events</span>
                <Calendar className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{(events || []).length} events</span>
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider">Server State</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-emerald-600">ACTIVE</span>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-100 rounded-2xl p-5 text-purple-800 text-xs flex items-center gap-3">
            <span>Operational synchronizations successfully established. Head over to <strong>"Live Marketplace"</strong> tab above to view your updated event banner layout assets.</span>
          </div>
        </div>
      ) : activeTab === 'events' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading your synchronized listings...</div>
          ) : (events || []).length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-2xs">
              <p className="text-sm text-slate-400">No events have been published under your host profile yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(events || []).map((event: any) => {
                const sold = event.totalQuantity - (event.remainingQuantity ?? event.totalQuantity);
                return (
                  <div key={event.id} className="bg-white border border-slate-200/70 rounded-3xl overflow-hidden shadow-2xs flex flex-col justify-between group hover:border-slate-300 transition-all">
                    <div>
                      {/* Interactive Visual Banner Image Frame */}
                      <div className="h-44 bg-slate-100 w-full relative overflow-hidden">
                        {event.imageUrl ? (
                          <img 
                            src={event.imageUrl} 
                            alt={event.eventName} 
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-2">
                            <ImageIcon className="w-8 h-8 opacity-40" />
                            <span className="text-[10px] uppercase font-bold">No Image Hosted</span>
                          </div>
                        )}
                        <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border bg-white/90 backdrop-blur-xs text-slate-800 border-slate-200">
                          #{event.id}
                        </span>
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="text-base font-bold text-slate-900 line-clamp-1">{event.eventName}</h4>
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 shrink-0 border border-purple-100 px-2 py-0.5 rounded-lg">
                            {sold} / {event.totalQuantity} Sold
                          </span>
                        </div>

                        <p className="text-xs text-slate-500 mt-2 line-clamp-2 font-normal leading-relaxed">{event.description}</p>

                        <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3">
                          <span className="flex items-center gap-1.5 font-medium text-slate-600"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(event.eventDate).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5 font-medium text-slate-600 col-span-2 mt-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />  {event.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50/80 border-t border-slate-100 p-4 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">Kes {event.price} <span className="text-[10px] font-normal text-slate-400">/ pass</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
     ) : (
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Venue Entry Verification Gate</h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">
                Aim your physical USB hardware scanner gun at the ticket barcode. Ensure this text box stays highlighted for continuous validation.
              </p>
            </div>

            {/* Operational Scanner Output Messages */}
            {scanStatus && (
              <div className={`p-4 rounded-xl text-xs font-semibold border transition-all ${
                scanStatus.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {scanStatus.message}
              </div>
            )}

            {/* Input form supporting automated physical enter-key triggers */}
            <form onSubmit={handleScanSubmit} className="flex gap-2 max-w-md mx-auto pt-2">
              <input 
                type="text" 
                autoFocus 
                placeholder="Scan barcode token (e.g. tk_...)" 
                value={scanToken}
                disabled={scanLoading}
                onChange={e => setScanToken(e.target.value)} 
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50" 
              />
              <button 
                type="submit"
                disabled={scanLoading || !scanToken.trim()}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                {scanLoading ? 'Checking...' : 'Verify Code'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}