import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { useAuthStore } from '../stores/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Card from '../components/common/Card';
import { ShieldCheck, CreditCard, ShoppingBag, ArrowLeft, AlertCircle } from 'lucide-react';

export default function Checkout() {
  const navigate = useNavigate();
  const { items, totalPrice } = useCartStore();
  const checkoutAction = useCartStore((state) => state.checkout);
  const { isAuthenticated } = useAuthStore();
  
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processingFee = totalPrice * 0.05;
  const finalTotal = totalPrice + processingFee;

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Authentication Required</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          You need to be logged in to securely purchase tickets and link them to your user profile.
        </p>
        <Button onClick={() => navigate('/login')} className="w-full bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs">
          Sign In to Account
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-5 h-5 text-slate-400" />
        </div>
        <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">Your Cart is Empty</h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          There are no reserved event passes pending checkout in your session at this moment.
        </p>
        <Button onClick={() => navigate('/')} className="w-full bg-indigo-600 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs">
          Browse Upcoming Events
        </Button>
      </div>
    );
  }

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await checkoutAction();
      
      navigate('/my-tickets');
    } catch (error: any) {
      console.error("Booking transaction failure:", error);
      setErrorMessage(error.message || "Payment processing failed. Please check ticket inventory availability.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl text-slate-800">
      <button 
        onClick={() => navigate('/')} 
        className="flex items-center gap-1.5 text-xs text-slate-400 font-bold hover:text-slate-600 transition-colors mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to listings
      </button>

      <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-8">Secure Checkout</h1>

      {errorMessage && (
        <div className="mb-6 bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div className="text-xs font-semibold text-rose-700 leading-relaxed">
            {errorMessage}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-2 space-y-6">
          
          {/* Order Summary Summary Panel */}
          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Pass Summary</h3>
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.event.id} className="flex justify-between py-3 first:pt-0 last:pb-0 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{item.event.title || item.event.eventName}</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Quantity: {item.quantity}</p>
                  </div>
                  <p className="font-bold text-slate-900 font-mono">${(item.event.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Payment Form Block */}
          <Card className="p-6 bg-white border border-slate-200 rounded-2xl shadow-2xs">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-600" /> Payment Parameters
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Gateway Protocol
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="credit">Credit Card (Simulation Gateway)</option>
                  <option value="debit">Debit Card</option>
                  <option value="paypal">PayPal Payment Proxy</option>
                </select>
              </div>

              <Input label="Card Number" placeholder="1234 5678 9012 3456" className="text-xs" />
              
              <div className="grid grid-cols-2 gap-4">
                <Input label="Expiry Date" placeholder="MM/YY" className="text-xs" />
                <Input label="CVV" placeholder="123" type="password" maxLength={4} className="text-xs" />
              </div>

              <Input label="Name on Card" placeholder="John Doe" className="text-xs" />
            </div>
          </Card>
        </div>

        {/* Pricing Column Summary Panel */}
        <div className="sticky top-24">
          <Card className="p-5 bg-slate-50/60 border border-slate-200 rounded-2xl shadow-2xs">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4">Total Breakdown</h3>
            
            <div className="space-y-2.5 text-xs font-medium text-slate-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-bold text-slate-700 font-mono">${totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Platform Transaction Fees (5%)</span>
                <span className="font-bold text-slate-700 font-mono">${processingFee.toFixed(2)}</span>
              </div>
              
              <div className="border-t border-slate-200 border-dashed pt-3 mt-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-900 font-bold">Total Due</span>
                  <span className="text-lg font-black text-slate-900 font-mono">${finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleCheckout}
              variant="primary"
              fullWidth
              className="mt-5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
              disabled={loading}
            >
              {loading ? 'Processing Order...' : 'Authorize & Book Tickets'}
            </Button>
            
            <span className="block text-[10px] text-slate-400 text-center mt-3 leading-relaxed">
              Secured connection to TikitiHub database records.
            </span>
          </Card>
        </div>
      </div>
    </div>
  );
}