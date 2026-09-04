import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventStore } from '../stores/eventStore';
import { useCartStore } from '../stores/cartStore';
import type { TicketTier } from '../types';
import { 
  ArrowLeft, Calendar, MapPin, Tag, 
  CheckCircle2, ShoppingBag, ShieldCheck, Ticket, Plus, Minus
} from 'lucide-react';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentEvent, fetchEvent, loading } = useEventStore();
  const { addItem } = useCartStore();

  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) fetchEvent(parseInt(id));
  }, [id, fetchEvent]);

  // When event loads, preselect first available tier or default tier
  useEffect(() => {
    if (currentEvent) {
      let tiers: TicketTier[] = [];
      if (Array.isArray(currentEvent.tiers)) {
        tiers = currentEvent.tiers;
      } else if (typeof currentEvent.tiers === 'string' && (currentEvent.tiers as string).trim()) {
        try {
          tiers = JSON.parse(currentEvent.tiers);
        } catch {
          // ignore
        }
      }

      if (tiers.length > 0) {
        // Pick first tier with remaining tickets, or fallback to first tier
        const availableTier = tiers.find(t => (t.remainingQuantity ?? t.totalQuantity) > 0);
        setSelectedTier(availableTier || tiers[0]);
      } else {
        setSelectedTier(null);
      }
      setQuantity(1);
    }
  }, [currentEvent]);

  if (loading || !currentEvent) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400">Loading event specifications...</p>
        </div>
      </div>
    );
  }

  let tiersList: TicketTier[] = [];
  if (currentEvent.tiers) {
    if (Array.isArray(currentEvent.tiers)) {
      tiersList = currentEvent.tiers;
    } else if (typeof currentEvent.tiers === 'string' && (currentEvent.tiers as string).trim()) {
      try {
        tiersList = JSON.parse(currentEvent.tiers);
      } catch {
        // ignore
      }
    }
  }

  const hasTiers = tiersList.length > 0;
  
  const activePrice = selectedTier 
    ? selectedTier.price 
    : currentEvent.price;

  const maxAvailable = selectedTier 
    ? (selectedTier.remainingQuantity ?? selectedTier.totalQuantity)
    : (currentEvent.remainingQuantity ?? currentEvent.totalQuantity);

  const isSoldOut = maxAvailable <= 0;
  const totalPrice = activePrice * quantity;

  const handleTierSelect = (tier: TicketTier) => {
    setSelectedTier(tier);
    const tierMax = tier.remainingQuantity ?? tier.totalQuantity;
    if (tierMax > 0 && quantity > tierMax) {
      setQuantity(tierMax);
    } else if (quantity < 1) {
      setQuantity(1);
    }
  };

  const handleAddToCart = () => {
    if (!isSoldOut && currentEvent) {
      addItem(currentEvent, quantity, selectedTier || undefined);
      navigate('/checkout');
    }
  };

  const eventDateObj = new Date(currentEvent.eventDate);
  const formattedDate = !isNaN(eventDateObj.getTime())
    ? eventDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })
    : currentEvent.eventDate;

  const formattedTime = !isNaN(eventDateObj.getTime())
    ? eventDateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl text-slate-800">
      <button 
        onClick={() => navigate(-1)} 
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-purple-600 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Marketplace
      </button>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Cover Photo */}
        <div className="h-64 sm:h-80 bg-slate-900 relative overflow-hidden">
          {currentEvent.imageUrl ? (
            <img 
              src={currentEvent.imageUrl} 
              alt={currentEvent.eventName} 
              className="w-full h-full object-cover opacity-90" 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Ticket className="w-12 h-12 opacity-30" />
              <span className="text-xs font-bold uppercase tracking-wider">TikitiHub Live Stage</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <span className="inline-block bg-purple-600 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md mb-2 shadow-xs">
              Verified Event Listing
            </span>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">{currentEvent.eventName || currentEvent.title}</h1>
          </div>
        </div>

        {/* Content Details & Booking Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: Event Context */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
                <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 border border-purple-100">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Date & Time</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{formattedDate}</p>
                  {formattedTime && <p className="text-[11px] text-slate-500 font-medium">{formattedTime}</p>}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-3">
                <div className="w-9 h-9 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 border border-purple-100">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Venue Location</span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{currentEvent.venue}</p>
                  <p className="text-[11px] text-slate-500 font-medium">Physical verification gate</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2 border-t border-slate-100 pt-6">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">About This Experience</h3>
              <div className="prose prose-sm text-slate-600 leading-relaxed text-xs sm:text-sm whitespace-pre-line">
                {currentEvent.description}
              </div>
            </div>
          </div>

          {/* Right Column: Ticket Category Selection & Reservation Tray */}
          <div className="bg-slate-50/70 border border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-2xs">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-600" /> Select Ticket Category
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                Choose your admission tier and reservation quantity.
              </p>
            </div>

            {/* Ticket Tier Cards */}
            {hasTiers ? (
              <div className="space-y-2.5">
                {tiersList.map((tier, idx) => {
                  const isSelected = selectedTier ? (selectedTier.id ? selectedTier.id === tier.id : selectedTier.name === tier.name) : false;
                  const tierRemaining = tier.remainingQuantity ?? tier.totalQuantity;
                  const isTierSoldOut = tierRemaining <= 0;

                  return (
                    <div
                      key={tier.id ?? idx}
                      onClick={() => !isTierSoldOut && handleTierSelect(tier)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                        isTierSoldOut
                          ? 'bg-slate-100/70 border-slate-200 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'bg-purple-50/70 border-purple-600 shadow-2xs ring-1 ring-purple-600'
                          : 'bg-white border-slate-200/80 hover:border-purple-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-xs text-slate-900">{tier.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {isTierSoldOut ? (
                            <span className="text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              Sold Out
                            </span>
                          ) : (
                            <span>{tierRemaining} tickets left</span>
                          )}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 font-mono block">
                          KES {tier.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">per pass</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-white border border-slate-200 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="font-bold text-xs text-slate-900 block">General Admission</span>
                  <span className="text-[11px] text-slate-500">
                    {currentEvent.remainingQuantity} available
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900 font-mono block">
                    KES {currentEvent.price.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Quantity Controller */}
            <div className="space-y-2 border-t border-slate-200/60 pt-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Quantity
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {isSoldOut ? 'Unavailable' : `Max ${Math.min(maxAvailable, 10)} per booking`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={quantity <= 1 || isSoldOut}
                  onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex-1 text-center bg-white border border-slate-200 py-2 rounded-xl text-sm font-black font-mono text-slate-900">
                  {quantity}
                </div>

                <button
                  type="button"
                  disabled={quantity >= Math.min(maxAvailable, 10) || isSoldOut}
                  onClick={() => setQuantity(prev => Math.min(Math.min(maxAvailable, 10), prev + 1))}
                  className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Pricing Summary */}
            <div className="space-y-2 border-t border-slate-200/60 pt-4 text-xs font-medium text-slate-600">
              <div className="flex justify-between">
                <span>Selected Tier:</span>
                <span className="font-bold text-slate-900">{selectedTier ? selectedTier.name : 'General Entry'}</span>
              </div>
              <div className="flex justify-between">
                <span>Unit Tariff:</span>
                <span className="font-mono font-bold text-slate-800">KES {activePrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200/40">
                <span>Total Amount:</span>
                <span className="font-mono text-base text-purple-700">KES {totalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Action CTA */}
            <button
              onClick={handleAddToCart}
              disabled={isSoldOut}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              {isSoldOut ? 'Category Sold Out' : `Reserve ${quantity} ${selectedTier ? selectedTier.name : ''} Pass${quantity > 1 ? 'es' : ''}`}
            </button>

            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official TikitiHub Verified Digital Ticket</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}