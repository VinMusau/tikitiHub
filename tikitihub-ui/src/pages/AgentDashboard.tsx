import React, { useEffect, useState, useRef } from 'react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { useBookingStore } from '../stores/useBookingStore';
import { 
  Plus, Calendar, Clock, MapPin, DollarSign, Users, TrendingUp, 
  X, Briefcase, BarChart3, CheckCircle2, Image as ImageIcon, 
  Percent, AlertCircle, RefreshCw, Layers, Camera, StopCircle
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

export default function AgentDashboard() {
  const { events = [], loading, error, createEvent, fetchMyListings } = useEventStore();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'check-in'>('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Active Gate Event ID state for cross-event scan prevention
  const [selectedEventId, setSelectedEventId] = useState<string | number>('');

  const [formData, setFormData] = useState({
    eventName: '', description: '', venue: '', eventDate: '', price: '', totalQuantity: '', imageUrl: ''
  });

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  // Set default selected event ID whenever events are loaded
  useEffect(() => {
    if (events && events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const totalRevenue = (events || []).reduce((sum: number, e: any) => {
    const sold = e.totalQuantity - (e.remainingQuantity ?? e.totalQuantity);
    return sum + (sold * e.price);
  }, 0);

  const totalPotentialRevenue = (events || []).reduce((sum: number, e: any) => {
    return sum + (e.totalQuantity * e.price);
  }, 0);

  const totalTicketsSold = (events || []).reduce((sum: number, e: any) => {
    return sum + (e.totalQuantity - (e.remainingQuantity ?? e.totalQuantity));
  }, 0);

  const totalCapacityAllocated = (events || []).reduce((sum: number, e: any) => sum + e.totalQuantity, 0);
  
  const averageSalesPacePercentage = totalCapacityAllocated > 0 
    ? (totalTicketsSold / totalCapacityAllocated) * 100 
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
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
  const [recentScans, setRecentScans] = useState<Array<{token: string, time: string, success: boolean}>>([]);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const SCANNER_ID = "camera-qr-reader";

  const stopCameraEngine = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Failed to stop QR scanner camera:", err);
      }
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().catch(console.error);
      }
    };
  }, [activeTab]);

  const handleScanSubmit = async (tokenToSubmit?: string) => {
    const targetToken = (tokenToSubmit || scanToken).trim();
    if (!targetToken) return;

    if (!selectedEventId) {
      setScanStatus({ success: false, message: "Please select an active event gate before scanning." });
      return;
    }

    setScanLoading(true);
    setScanStatus(null);

    // Pass both token and eventId to the backend
    const result = await redeemTicketGateScan({
      qrRedemptionToken: targetToken,
      eventId: selectedEventId
    });
    
    setScanStatus(result);
    setScanLoading(false);
    
    setRecentScans(prev => [
      { token: targetToken, time: new Date().toLocaleTimeString(), success: result.success },
      ...prev.slice(0, 4)
    ]);
    
    setScanToken('');
  };

  const startCameraEngine = async () => {
    setIsCameraActive(true);
    setScanStatus(null);
    
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode(SCANNER_ID);
        html5QrCodeRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" }, 
          {
            fps: 10,
            qrbox: (width, height) => {
              const size = Math.min(width, height) * 0.7;
              return { width: size, height: size };
            }
          },
          async (decodedText) => {
            await html5QrCode.stop(); 
            setIsCameraActive(false);
            
            handleScanSubmit(decodedText);
          },
          () => {
          }
        );
      } catch (err) {
        console.error("Camera permissions denied or device missing:", err);
        setIsCameraActive(false);
        setScanStatus({ success: false, message: "Could not open back camera. Please check permissions." });
      }
    }, 100);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto text-slate-800 min-h-screen p-6 bg-slate-50/50">
      
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 shadow-2xs">
            <Briefcase className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">{user?.email?.split('@')[0] || 'Organizer'}</h1>
              <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 font-extrabold px-2.5 py-0.5 rounded-md uppercase">
                Verified Host
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Account Class: <span className="text-purple-600 font-bold uppercase">Event Administrator</span></p>
            <p className="text-xs font-mono text-slate-400 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateForm(true)}
          className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Listing
        </button>
      </div>

      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-0.5">
        <button
          onClick={() => { setActiveTab('overview'); setShowCreateForm(false); }}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'overview' && !showCreateForm ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 inline mr-1.5" /> Performance Metrics
        </button>
        <button
          onClick={() => { setActiveTab('events'); setShowCreateForm(false); }}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'events' && !showCreateForm ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 inline mr-1.5" /> Live Marketplace ({(events || []).length})
        </button>
        <button
          onClick={() => { setActiveTab('check-in'); setShowCreateForm(false); }}
          className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all shrink-0 cursor-pointer ${
            activeTab === 'check-in' && !showCreateForm ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 inline mr-1.5" /> Gate Check-In
        </button>
      </div>

      {error && <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">{error}</div>}

      {showCreateForm ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 uppercase tracking-wider font-bold px-2.5 py-1 rounded">
                Creation Pipeline
              </span>
              <h2 className="text-lg font-black text-slate-900 mt-2">Publish a New Marketplace Event</h2>
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
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Single Admission Tariff (KES) *</label>
                <input required type="number" step="0.01" placeholder="25.00" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Event Banner Image URL</label>
                <input type="url" placeholder="https://images.unsplash.com/... (or leave blank for custom default)" value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Total Capacity Supply *</label>
                <input required type="number" placeholder="300" value={formData.totalQuantity} onChange={e => setFormData({...formData, totalQuantity: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Public Summary Info Description *</label>
                <textarea required rows={3} placeholder="Provide specific instructions regarding gates openings, age limits, and line ups details..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-5 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50">Cancel</button>
              <button type="submit" className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs">Publish Live Listing</button>
            </div>
          </form>
        </div>
      ) : activeTab === 'overview' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Gross Realized Revenue</span>
                <DollarSign className="w-4 h-4 text-purple-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">Kes {totalRevenue.toFixed(2)}</span>
              <p className="text-[10px] text-slate-400 mt-1">Out of Kes {totalPotentialRevenue.toFixed(2)} capacity</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Ticket Volume Sold</span>
                <Users className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalTicketsSold} units</span>
              <p className="text-[10px] text-slate-400 mt-1">Across all managed events</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Market Fill Pace</span>
                <Percent className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{averageSalesPacePercentage.toFixed(1)}%</span>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${averageSalesPacePercentage}%` }} />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Hosted Inventory</span>
                <Layers className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{(events || []).length} active</span>
              <p className="text-[10px] text-slate-400 mt-1">Live booking channels open</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Event Breakdown Ledger</h3>
              <span className="text-[10px] text-slate-400 font-medium">Real-time compilation</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Event Identity</th>
                    <th className="p-4">Admission Rate</th>
                    <th className="p-4">Sales Conversion</th>
                    <th className="p-4">Gross Collected</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(events || []).map((e: any) => {
                    const sold = e.totalQuantity - (e.remainingQuantity ?? e.totalQuantity);
                    const percent = e.totalQuantity > 0 ? (sold / e.totalQuantity) * 100 : 0;
                    return (
                      <tr key={e.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-900">{e.eventName}</td>
                        <td className="p-4">Kes {e.price}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold w-12">{percent.toFixed(0)}%</span>
                            <span className="text-slate-400">({sold}/{e.totalQuantity})</span>
                          </div>
                        </td>
                        <td className="p-4 font-black text-slate-900">Kes {(sold * e.price).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'events' ? (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold">Loading customized merchant dashboard vectors...</div>
          ) : (events || []).length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-2xs">
              <p className="text-xs text-slate-400 font-bold">No events have been published under your host profile yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(events || []).map((event: any) => {
                const sold = event.totalQuantity - (event.remainingQuantity ?? event.totalQuantity);
                const fillRatio = event.totalQuantity > 0 ? (sold / event.totalQuantity) * 100 : 0;
                
                return (
                  <div key={event.id} className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs flex flex-col justify-between group hover:border-slate-300/100 transition-all">
                    <div>
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
                          ID Reference #{event.id}
                        </span>
                      </div>

                      <div className="p-5 space-y-3">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="text-base font-bold text-slate-900 line-clamp-1 tracking-tight">{event.eventName}</h4>
                          <span className="text-[11px] font-bold text-purple-700 bg-purple-50 shrink-0 border border-purple-100 px-2 py-0.5 rounded-lg">
                            {sold} / {event.totalQuantity} Sold
                          </span>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 font-normal leading-relaxed">{event.description}</p>

                        {/* Ticket Progress Burn Indicator */}
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                            <span>Capacity Consumption</span>
                            <span className="text-slate-700">{fillRatio.toFixed(0)}% Filled</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${fillRatio > 85 ? 'bg-rose-500' : 'bg-purple-600'}`} 
                              style={{ width: `${fillRatio}%` }} 
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs text-slate-500 border-t border-slate-100 pt-3 font-medium">
                          <span className="flex items-center gap-1.5 text-slate-600"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(event.eventDate).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5 text-slate-600 col-span-2 mt-1"><MapPin className="w-3.5 h-3.5 text-slate-400" />  {event.venue}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50/80 border-t border-slate-100 p-4 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">Kes {event.price} <span className="text-[10px] font-normal text-slate-400">/ ticket unit</span></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center space-y-4 shadow-xs lg:col-span-2">
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 mx-auto shadow-2xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Venue Entry Verification Gate</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto mt-1">
                Select your active gate event and verify customer barcodes using a scanner or device camera.
              </p>
            </div>

            {/* Active Event Selection Dropdown */}
            <div className="max-w-md mx-auto text-left pt-2">
              <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1.5">
                Target Check-In Event *
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
              >
                <option value="" disabled>-- Choose Event Gate --</option>
                {(events || []).map((evt: any) => (
                  <option key={evt.id} value={evt.id}>
                    {evt.eventName} (ID: #{evt.id})
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2">
              {isCameraActive ? (
                <div className="space-y-4">
                  <div className="relative mx-auto max-w-xs aspect-square bg-black rounded-2xl overflow-hidden border-2 border-purple-500 shadow-md">
                    <div id={SCANNER_ID} className="w-full h-full" />
                    <div className="absolute inset-0 border-[32px] border-black/40 pointer-events-none flex items-center justify-center">
                      <div className="w-full h-full border-2 border-dashed border-purple-400 animate-pulse rounded" />
                    </div>
                  </div>

                  <button
                    onClick={stopCameraEngine}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold text-xs rounded-xl flex items-center gap-2 mx-auto cursor-pointer"
                  >
                    <StopCircle className="w-4 h-4" /> Terminate Camera Stream
                  </button>
                </div>
              ) : (
                <button
                  onClick={startCameraEngine}
                  disabled={!selectedEventId}
                  className="px-5 py-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 font-bold text-xs rounded-2xl flex items-center gap-2.5 mx-auto transition-all cursor-pointer hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Camera className="w-4 h-4 text-purple-600" /> Enable Camera QR Scanner
                </button>
              )}
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-slate-100"></div>
              <span className="flex-shrink mx-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">or manual lookup</span>
              <div className="flex-grow border-t border-slate-100"></div>
            </div>

            {scanStatus && (
              <div className={`p-4 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 justify-center ${
                scanStatus.success 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {scanStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
                {scanStatus.message}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleScanSubmit(); }} className="flex gap-2 max-w-md mx-auto">
              <input 
                type="text" 
                autoFocus 
                placeholder="Scan passcode string (e.g. tk_...)" 
                value={scanToken}
                disabled={scanLoading}
                onChange={e => setScanToken(e.target.value)} 
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:border-purple-500 disabled:opacity-50" 
              />
              <button 
                type="submit"
                disabled={scanLoading || !scanToken.trim() || !selectedEventId}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
              >
                {scanLoading ? 'Processing...' : 'Verify Code'}
              </button>
            </form>
          </div>

          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-xs">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 text-purple-600 animate-spin-slow" /> Gate Stream Log
              </h4>
              <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Live Feed</span>
            </div>

            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-medium text-[11px] italic">
                Waiting for incoming ticket gate validations...
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentScans.map((scan, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-mono text-slate-700 block font-bold">{scan.token.substring(0, 15)}...</span>
                      <span className="text-[9px] text-slate-400 block">{scan.time}</span>
                    </div>
                    <span className={`px-2 py-0.5 font-bold rounded text-[9px] uppercase tracking-wider border ${
                      scan.success ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {scan.success ? 'Approved' : 'Denied'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}