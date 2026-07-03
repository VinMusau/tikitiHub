import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEventStore } from '../stores/eventStore';
import { Search, Sparkles, ArrowRight, Calendar, MapPin, Tag, SlidersHorizontal, Image as ImageIcon } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { events = [], loading, fetchEvents } = useEventStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [maxPrice, setMaxPrice] = useState<number>(500);
  const [showFilters, setShowFilters] = useState(false);

  const categories = ['All', 'Concert', 'Sports', 'Theater', 'Comedy', 'Festival', 'Conference'];

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Determine the dynamic max price ceiling from current active listings
  const maxPossiblePrice = useMemo(() => {
    if (!events || events.length === 0) return 500;
    return Math.max(...events.map((e: any) => e.price || 0), 500);
  }, [events]);

  // Update slider ceiling automatically when events resolve
  useEffect(() => {
    if (maxPossiblePrice > 500) {
      setMaxPrice(maxPossiblePrice);
    }
  }, [maxPossiblePrice]);

  // Core filtration matching logic
  const filteredEvents = useMemo(() => {
    return (events || []).filter((event: any) => {
      const matchesSearch = 
        event.eventName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.venue?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Basic heuristic category parsing based on the description text if category object property isn't explicitly configured in your database yet
      const matchesCategory = 
        selectedCategory === 'All' || 
        event.eventName?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
        event.description?.toLowerCase().includes(selectedCategory.toLowerCase());

      const matchesPrice = (event.price || 0) <= maxPrice;

      return matchesSearch && matchesCategory && matchesPrice;
    });
  }, [events, searchQuery, selectedCategory, maxPrice]);

  // Pick up some top experiences to display as featured banners at the top
  const featuredEvents = useMemo(() => {
    return (events || []).slice(0, 3);
  }, [events]);

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800 bg-slate-50/30 min-h-screen">
      
      {/* IMMERSIVE HERO BANNER */}
      <div className="relative bg-gradient-to-br from-black via-indigo-900 to-slate-900 rounded-3xl overflow-hidden p-8 sm:p-12 md:p-16 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-black-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative max-w-2xl text-left space-y-5">
          
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Find upcoming live experiences in seconds
          </h1>
          
          <p className="text-sm sm:text-base text-slate-200 font-light leading-relaxed">
            Stop guessing and start reserving tickets. Reserve verified tickets seamlessly with secure digital receipts.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-indigo-200">
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">🛡️ Verified Event Hosts Only</span>
            <span className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">🎟️ Real-Time Ticket Availability</span>
          </div>
        </div>
      </div>

      {/*  LIVE DYNAMIC SEARCH & COEFFICIENTS FILTERS BLOCK */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by event title, summary keywords, or venue address..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
              showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust Limits
          </button>
        </div>

        {/* Expandable Price Range Slider Tray */}
        {showFilters && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 animate-fade-in space-y-2">
            <div className="flex justify-between text-xs font-bold text-slate-600">
              <span>Maximum Ticket Tariff</span>
              <span className="text-indigo-600">${maxPrice} USD</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max={maxPossiblePrice} 
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        )}

        {/* Horizontal Quick Pill Selector */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs font-medium text-slate-500">
          <span className="mr-1">Quick Categories:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* FEATURED EXPERIENCES CAROUSEL SECTION */}
      {featuredEvents.length > 0 && searchQuery === '' && selectedCategory === 'All' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Featured Experiences</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredEvents.map((evt: any) => (
              <div 
                key={evt.id}
                onClick={() => navigate(`/event/${evt.id}`)}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:border-slate-300 transition-all duration-300 cursor-pointer group flex flex-col h-full"
              >
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                  {evt.imageUrl ? (
                    <img 
                      src={evt.imageUrl} 
                      alt={evt.eventName} 
                      className="object-cover w-full h-full group-hover:scale-103 transition-transform duration-500" 
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                      <ImageIcon className="w-6 h-6 opacity-40" />
                      <span className="text-[10px] font-bold uppercase tracking-wider">TikitiHub Stage</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="bg-indigo-600 text-white text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-md shadow-xs">
                      FEATURED
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <p className="text-[10px] text-indigo-200 font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> {evt.venue}</p>
                    <h4 className="text-sm font-bold mt-0.5 line-clamp-1">{evt.eventName}</h4>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between mt-auto bg-slate-50 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-900">Admission from <strong className="text-indigo-600">${evt.price}</strong></span>
                  <span className="text-[10px] text-indigo-600 font-bold flex items-center gap-0.5">
                    Get Passes <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPREHENSIVE EVENTS GRID FEED */}
      <div className="space-y-6">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Explore Upcoming Events</h2>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 font-medium text-sm">Synchronizing marketplace index feed...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center max-w-md mx-auto shadow-2xs">
            <Search className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-sm font-bold text-slate-800 mb-1">No matching options discovered</h3>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto mb-5">
              We couldn't locate any items matching your parameters. Adjust filters, search query coefficients, or reset options.
            </p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setMaxPrice(maxPossiblePrice); }}
              className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl border border-indigo-100 transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event: any) => (
              <div 
                key={event.id}
                onClick={() => navigate(`/event/${event.id}`)}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-3xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Event Cover Frame */}
                  <div className="h-40 bg-slate-100 w-full relative overflow-hidden border-b border-slate-100">
                    {event.imageUrl ? (
                      <img 
                        src={event.imageUrl} 
                        alt={event.eventName} 
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5 bg-slate-50">
                        <Tag className="w-5 h-5 opacity-40 text-slate-400" />
                        <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider">TikitiHub Event</span>
                      </div>
                    )}
                    <div className="absolute top-3 right-3 text-[10px] font-bold bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded shadow-2xs text-slate-700">
                      ${event.price}
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                      {event.eventName}
                    </h3>
                    <p className="text-xs text-slate-500 font-normal leading-relaxed line-clamp-2">
                      {event.description}
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-4 pt-2 bg-white flex flex-col gap-1.5 border-t border-slate-50 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{new Date(event.eventDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="line-clamp-1">{event.venue}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}