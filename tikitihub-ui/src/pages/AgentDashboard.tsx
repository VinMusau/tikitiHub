import React, { useEffect, useState, useRef } from 'react';
import { useEventStore } from '../stores/eventStore';
import { useAuthStore } from '../stores/authStore';
import { useBookingStore } from '../stores/useBookingStore';
import { 
  Plus, Calendar, MapPin, DollarSign, Users, 
  X, Briefcase, BarChart3, CheckCircle2, Image as ImageIcon, 
  Percent, AlertCircle, RefreshCw, Layers, Camera, StopCircle, Tag, Trash2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface TierFormData {
  name: string;
  price: string;
  totalQuantity: string;
}

export default function AgentDashboard() {
  const { events = [], loading, error, createEvent, fetchMyListings } = useEventStore();
  const user = useAuthStore((state) => state.user);

  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'check-in'>('overview');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Selected event & tier state for gate operations
  const [selectedEventId, setSelectedEventId] = useState<string | number>('');
  const [selectedTierId, setSelectedTierId] = useState<string | number>('');

  const [formData, setFormData] = useState({
    eventName: '', description: '', venue: '', eventDate: '', price: '', totalQuantity: '', imageUrl: ''
  });

  const [tiers, setTiers] = useState<TierFormData[]>([
    { name: 'Regular', price: '', totalQuantity: '' }
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const handleAddTier = (presetName?: string) => {
    setTiers(prev => [
      ...prev,
      { name: presetName || '', price: '', totalQuantity: '' }
    ]);
  };

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) return;
    setTiers(prev => prev.filter((_, i) => i !== index));
  };

  const handleTierChange = (index: number, field: keyof TierFormData, value: string) => {
    setTiers(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const computedTotalCapacity = tiers.reduce((sum, t) => sum + (parseInt(t.totalQuantity, 10) || 0), 0);
  
  const validTierPrices = tiers
    .map(t => parseFloat(t.price))
    .filter(p => !isNaN(p) && p >= 0);
  
  const computedStartingPrice = validTierPrices.length > 0 ? Math.min(...validTierPrices) : 0;
  
  const projectedGross = tiers.reduce((sum, t) => {
    const qty = parseInt(t.totalQuantity, 10) || 0;
    const prc = parseFloat(t.price) || 0;
    return sum + (qty * prc);
  }, 0);

  useEffect(() => {
    fetchMyListings();
  }, [fetchMyListings]);

  // Set default event and tier selection on load
  useEffect(() => {
    if (events && events.length > 0) {
      if (!selectedEventId) {
        const firstEvent = events[0];
        setSelectedEventId(firstEvent.id);
        if (firstEvent.tiers && firstEvent.tiers.length > 0) {
          setSelectedTierId(firstEvent.tiers[0].id ?? '');
        }
      }
    }
  }, [events, selectedEventId]);

  // Update selected tier whenever selected event changes
  const handleEventChange = (eventId: string | number) => {
    setSelectedEventId(eventId);
    const selectedEvt = events.find((e: any) => String(e.id) === String(eventId));
    if (selectedEvt && selectedEvt.tiers && selectedEvt.tiers.length > 0) {
      setSelectedTierId(selectedEvt.tiers[0].id ?? '');
    } else {
      setSelectedTierId('');
    }
  };

  const currentSelectedEvent = events.find((e: any) => String(e.id) === String(selectedEventId));

  const totalRevenue = (events || []).reduce((sum: number, e: any) => {
    if (e.tiers && e.tiers.length > 0) {
      return sum + e.tiers.reduce((tSum: number, t: any) => tSum + ((t.totalQuantity - (t.remainingQuantity ?? t.totalQuantity)) * t.price), 0);
    }
    const sold = e.totalQuantity - (e.remainingQuantity ?? e.totalQuantity);
    return sum + (sold * e.price);
  }, 0);

  const totalTicketsSold = (events || []).reduce((sum: number, e: any) => {
    if (e.tiers && e.tiers.length > 0) {
      return sum + e.tiers.reduce((tSum: number, t: any) => tSum + (t.totalQuantity - (t.remainingQuantity ?? t.totalQuantity)), 0);
    }
    return sum + (e.totalQuantity - (e.remainingQuantity ?? e.totalQuantity));
  }, 0);

  const totalCapacityAllocated = (events || []).reduce((sum: number, e: any) => {
    if (e.tiers && e.tiers.length > 0) {
      return sum + e.tiers.reduce((tSum: number, t: any) => tSum + t.totalQuantity, 0);
    }
    return sum + e.totalQuantity;
  }, 0);
  
  const averageSalesPacePercentage = totalCapacityAllocated > 0 
    ? (totalTicketsSold / totalCapacityAllocated) * 100 
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (tiers.length === 0) {
      setFormError("At least one ticket tier is required.");
      return;
    }

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i];
      if (!t.name.trim()) {
        setFormError(`Please enter a name for tier #${i + 1}.`);
        return;
      }
      const p = parseFloat(t.price);
      if (isNaN(p) || p < 0) {
        setFormError(`Tier "${t.name}" requires a valid price (0 or higher).`);
        return;
      }
      const q = parseInt(t.totalQuantity, 10);
      if (isNaN(q) || q <= 0) {
        setFormError(`Tier "${t.name}" requires a capacity quota of at least 1.`);
        return;
      }
    }

    try {
      const finalImageUrl = formData.imageUrl.trim() || "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80";

      const formattedTiers = tiers.map(t => ({
        name: t.name.trim(),
        price: parseFloat(t.price),
        totalQuantity: parseInt(t.totalQuantity, 10),
        remainingQuantity: parseInt(t.totalQuantity, 10)
      }));

      const finalTotalCapacity = computedTotalCapacity > 0 
        ? computedTotalCapacity 
        : (parseInt(formData.totalQuantity, 10) || 0);

      const finalPrice = computedStartingPrice > 0 
        ? computedStartingPrice 
        : (parseFloat(formData.price) || 0);

      await createEvent({
        ...formData,
        imageUrl: finalImageUrl,
        price: finalPrice,
        totalQuantity: finalTotalCapacity,
        remainingQuantity: finalTotalCapacity,
        eventDate: new Date(formData.eventDate).toISOString().split('.')[0],
        tiers: formattedTiers
      });
      
      setShowCreateForm(false);
      setFormData({ eventName: '', description: '', venue: '', eventDate: '', price: '', totalQuantity: '', imageUrl: '' });
      setTiers([{ name: 'Regular', price: '', totalQuantity: '' }]);
      setFormError(null);
      fetchMyListings(); 
      setActiveTab('events');
    } catch (err: any) {
      console.error("Submission failed.", err);
      setFormError(err.response?.data?.error || err.response?.data?.message || "Failed to publish event listing. Please try again.");
    }
  };

  const redeemTicketGateScan = useBookingStore((state) => state.redeemTicketGateScan);
  const [scanToken, setScanToken] = useState('');
  const [scanStatus, setScanStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [recentScans, setRecentScans] = useState<Array<{token: string, time: string, success: boolean, tier?: string}>>([]);

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

    // DTO Payload passing both eventId and tierId (if applicable)
    const payload: { qrRedemptionToken: string; eventId: number; ticketTierId?: number } = {
      qrRedemptionToken: targetToken,
      eventId: Number(selectedEventId)
    };

    if (selectedTierId) {
      payload.ticketTierId = Number(selectedTierId);
    }

    const result = await redeemTicketGateScan(payload);
    
    setScanStatus(result);
    setScanLoading(false);
    
    const activeTierName = currentSelectedEvent?.tiers?.find((t: any) => String(t.id) === String(selectedTierId))?.name;

    setRecentScans(prev => [
      { token: targetToken, time: new Date().toLocaleTimeString(), success: result.success, tier: activeTierName },
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
          () => {}
        );
      } catch (err) {
        console.error("Camera permissions denied or device missing:", err);
        setIsCameraActive(false);
        setScanStatus({ success: false, message: "Could not open camera. Check permissions." });
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
            {formError && (
              <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

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
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Event Banner Image URL</label>
                <input type="url" placeholder="https://images.unsplash.com/..." value={formData.imageUrl} onChange={e => setFormData({...formData, imageUrl: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
              </div>

              {/* Ticket Tiers & Allocation Builder */}
              <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-purple-600" /> Ticket Tiers & Quota Allocation *
                      </h3>
                      <span className="text-[10px] bg-purple-50 text-purple-700 font-extrabold px-2 py-0.5 rounded border border-purple-200">
                        {tiers.length} {tiers.length === 1 ? 'Tier' : 'Tiers'} Configured
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Define ticket classes (e.g. Regular, VIP) with specific prices and quotas matching backend inventory.
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => handleAddTier()}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs rounded-xl border border-purple-200 transition-colors flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Tier
                  </button>
                </div>

                {/* Quick Preset Chips */}
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
                  <span className="font-semibold text-slate-400 mr-1 text-[10px] uppercase tracking-wider">Quick Presets:</span>
                  {['Regular', 'VIP', 'VVIP', 'Early Bird', 'Student'].map((preset) => {
                    const alreadyExists = tiers.some(t => t.name.toLowerCase() === preset.toLowerCase());
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={alreadyExists}
                        onClick={() => handleAddTier(preset)}
                        className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                          alreadyExists 
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-700 border-slate-200 hover:border-purple-300 shadow-2xs'
                        }`}
                      >
                        + {preset}
                      </button>
                    );
                  })}
                </div>

                {/* Tier Input Rows */}
                <div className="space-y-2.5">
                  {tiers.map((tier, index) => (
                    <div 
                      key={index} 
                      className="p-4 bg-slate-50/70 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 transition-all hover:border-slate-300"
                    >
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Tier Name *
                        </label>
                        <input
                          required
                          type="text"
                          placeholder="e.g. VIP, Regular, Early Bird"
                          value={tier.name}
                          onChange={(e) => handleTierChange(index, 'name', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="w-full sm:w-40">
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Price (KES) *
                        </label>
                        <input
                          required
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="e.g. 1500"
                          value={tier.price}
                          onChange={(e) => handleTierChange(index, 'price', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="w-full sm:w-36">
                        <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                          Capacity Quota *
                        </label>
                        <input
                          required
                          type="number"
                          min="1"
                          placeholder="e.g. 100"
                          value={tier.totalQuantity}
                          onChange={(e) => handleTierChange(index, 'totalQuantity', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="sm:pt-5 self-end sm:self-auto">
                        <button
                          type="button"
                          disabled={tiers.length === 1}
                          onClick={() => handleRemoveTier(index)}
                          className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                          title={tiers.length === 1 ? "At least one tier required" : "Remove this tier"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Live Computed Metrics Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-purple-50/50 border border-purple-100 rounded-2xl text-xs">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-purple-700 block tracking-wider">Total Event Capacity</span>
                    <span className="text-sm font-black text-slate-900 font-mono">{computedTotalCapacity} tickets</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Sum of all tier allocations</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-purple-700 block tracking-wider">Starting Admission Tariff</span>
                    <span className="text-sm font-black text-slate-900 font-mono">
                      {computedStartingPrice > 0 ? `KES ${computedStartingPrice.toFixed(2)}` : 'KES 0.00'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Lowest configured tier price</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-purple-700 block tracking-wider">Max Gross Revenue</span>
                    <span className="text-sm font-black text-slate-900 font-mono">KES {projectedGross.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Potential sell-out gross yield</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Public Summary Info Description *</label>
                <textarea required rows={3} placeholder="Provide specific instructions regarding gates openings, age limits..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:border-purple-500 focus:outline-none" />
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
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Ticket Volume Sold</span>
                <Users className="w-4 h-4 text-amber-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{totalTicketsSold} units</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Market Fill Pace</span>
                <Percent className="w-4 h-4 text-emerald-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{averageSalesPacePercentage.toFixed(1)}%</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
              <div className="flex justify-between items-center text-slate-400 mb-2">
                <span className="text-[10px] uppercase font-extrabold tracking-wider">Hosted Inventory</span>
                <Layers className="w-4 h-4 text-blue-500" />
              </div>
              <span className="text-xl sm:text-2xl font-black text-slate-900">{(events || []).length} active</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">Event Breakdown Ledger</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Event Identity</th>
                    <th className="p-4">Active Tiers</th>
                    <th className="p-4">Sales Conversion</th>
                    <th className="p-4">Gross Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(events || []).map((e: any) => {
                    const hasTiers = e.tiers && e.tiers.length > 0;
                    const sold = hasTiers 
                      ? e.tiers.reduce((s: number, t: any) => s + (t.totalQuantity - (t.remainingQuantity ?? t.totalQuantity)), 0)
                      : e.totalQuantity - (e.remainingQuantity ?? e.totalQuantity);
                    
                    const capacity = hasTiers 
                      ? e.tiers.reduce((s: number, t: any) => s + t.totalQuantity, 0)
                      : e.totalQuantity;

                    const gross = hasTiers
                      ? e.tiers.reduce((s: number, t: any) => s + ((t.totalQuantity - (t.remainingQuantity ?? t.totalQuantity)) * t.price), 0)
                      : sold * e.price;

                    return (
                      <tr key={e.id} className="hover:bg-slate-50/50">
                        <td className="p-4 font-bold text-slate-900">{e.eventName}</td>
                        <td className="p-4">
                          {hasTiers ? (
                            <div className="flex flex-wrap gap-1">
                              {e.tiers.map((tier: any) => (
                                <span key={tier.id} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">
                                  {tier.name}: Kes {tier.price}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400">Single Tariff (Kes {e.price})</span>
                          )}
                        </td>
                        <td className="p-4 font-mono">
                          {sold} / {capacity} units
                        </td>
                        <td className="p-4 font-black text-slate-900">Kes {gross.toFixed(2)}</td>
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
            <div className="text-center py-12 text-slate-400 text-xs font-bold">Loading dashboard...</div>
          ) : (events || []).length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-2xs">
              <p className="text-xs text-slate-400 font-bold">No events published yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(events || []).map((event: any) => {
                const hasTiers = event.tiers && event.tiers.length > 0;
                
                return (
                  <div key={event.id} className="bg-white border border-slate-200/80 rounded-3xl overflow-hidden shadow-2xs flex flex-col justify-between group hover:border-slate-300 transition-all">
                    <div>
                      <div className="h-44 bg-slate-100 w-full relative overflow-hidden">
                        {event.imageUrl ? (
                          <img src={event.imageUrl} alt={event.eventName} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-2">
                            <ImageIcon className="w-8 h-8 opacity-40" />
                          </div>
                        )}
                        <span className="absolute top-3 left-3 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border bg-white/90 backdrop-blur-xs text-slate-800 border-slate-200">
                          ID #{event.id}
                        </span>
                      </div>

                      <div className="p-5 space-y-3">
                        <h4 className="text-base font-bold text-slate-900 line-clamp-1">{event.eventName}</h4>
                        <p className="text-xs text-slate-400 line-clamp-2">{event.description}</p>

                        {/* Tier Breakdown Display */}
                        {hasTiers && (
                          <div className="space-y-2 border-t border-slate-100 pt-3">
                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <Tag className="w-3 h-3" /> Configured Tier Allocation
                            </span>
                            <div className="space-y-1.5">
                              {event.tiers.map((tier: any) => {
                                const tierSold = tier.totalQuantity - (tier.remainingQuantity ?? tier.totalQuantity);
                                const tierPct = tier.totalQuantity > 0 ? (tierSold / tier.totalQuantity) * 100 : 0;
                                return (
                                  <div key={tier.id} className="bg-slate-50 p-2 rounded-xl text-xs flex justify-between items-center border border-slate-100">
                                    <div>
                                      <span className="font-bold text-slate-800">{tier.name}</span>
                                      <span className="text-[10px] text-slate-400 block">Kes {tier.price}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="font-mono font-bold text-slate-700">{tierSold}/{tier.totalQuantity}</span>
                                      <div className="w-16 bg-slate-200 h-1 rounded-full mt-1 overflow-hidden">
                                        <div className="bg-purple-600 h-full" style={{ width: `${tierPct}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-500 border-t border-slate-100 pt-3">
                          <span className="flex items-center gap-1.5 text-slate-600"><Calendar className="w-3.5 h-3.5 text-slate-400" /> {new Date(event.eventDate).toLocaleDateString()}</span>
                          <span className="flex items-center gap-1.5 text-slate-600 col-span-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {event.venue}</span>
                        </div>
                      </div>
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
              <h3 className="text-lg font-bold text-slate-900 tracking-tight">Venue Entry Gate Check-In</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                Select active event gate and ticket tier to validate QR passes.
              </p>
            </div>

            {/* Event and Tier Selection Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto text-left pt-2">
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Event Gate *
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => handleEventChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500"
                >
                  <option value="" disabled>-- Select Event --</option>
                  {(events || []).map((evt: any) => (
                    <option key={evt.id} value={evt.id}>
                      {evt.eventName} (#{evt.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                  Ticket Tier Verification
                </label>
                <select
                  value={selectedTierId}
                  disabled={!currentSelectedEvent?.tiers || currentSelectedEvent.tiers.length === 0}
                  onChange={(e) => setSelectedTierId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                >
                  {currentSelectedEvent?.tiers && currentSelectedEvent.tiers.length > 0 ? (
                    currentSelectedEvent.tiers.map((tier: any) => (
                      <option key={tier.id} value={tier.id}>
                        {tier.name} (Kes {tier.price})
                      </option>
                    ))
                  ) : (
                    <option value="">General Entry (No Tiers)</option>
                  )}
                </select>
              </div>
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
                    <StopCircle className="w-4 h-4" /> Stop Camera
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
                placeholder="Scan pass token (e.g. tk_...)" 
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
                {scanLoading ? 'Verifying...' : 'Validate Code'}
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
                Waiting for incoming gate validations...
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentScans.map((scan, i) => (
                  <div key={i} className="flex justify-between items-center text-[11px] p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-0.5">
                      <span className="font-mono text-slate-700 block font-bold">{scan.token.substring(0, 15)}...</span>
                      <div className="flex items-center gap-1 text-[9px] text-slate-400">
                        <span>{scan.time}</span>
                        {scan.tier && <span className="font-semibold text-purple-600">({scan.tier})</span>}
                      </div>
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