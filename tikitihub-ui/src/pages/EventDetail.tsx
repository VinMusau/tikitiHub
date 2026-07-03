import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEventStore } from '../stores/eventStore';
import { useCartStore } from '../stores/cartStore';
import Button from '../components/common/Button';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentEvent, fetchEvent, loading } = useEventStore();
  const { addItem } = useCartStore();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) fetchEvent(parseInt(id));
  }, [id]);

  const handleAddToCart = () => {
    if (currentEvent) {
      addItem(currentEvent, quantity);
      navigate('/checkout');
    }
  };

  if (loading || !currentEvent) {
    return <div className="text-center py-20">Loading event details...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button onClick={() => navigate(-1)} className="mb-4 text-blue-600 hover:underline">
        ← Back to events
      </button>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="h-64 bg-gray-200">
          {currentEvent.imageUrl && (
            <img src={currentEvent.imageUrl} alt={currentEvent.title} className="w-full h-full object-cover" />
          )}
        </div>

        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2">{currentEvent.title}</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
            <div>
              <p className="text-gray-600 mb-2"><strong>Venue:</strong> {currentEvent.venue}</p>
              <p className="text-gray-600 mb-2">
                <strong>Date:</strong> {new Date(currentEvent.eventDate).toLocaleDateString()}
              </p>
              <p className="text-gray-600 mb-2">
                <strong>Time:</strong> {new Date(currentEvent.eventDate).toLocaleTimeString()}
              </p>
              <p className="text-gray-600 mb-4">
                <strong>Available:</strong> {currentEvent.remainingQuantity} / {currentEvent.totalQuantity}
              </p>
              <div className="prose max-w-none">
                <p>{currentEvent.description}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <label htmlFor="quantity" className="font-semibold">Quantity:</label>
                <input
                  type="number"
                  id="quantity"
                  min="1"
                  max={currentEvent.remainingQuantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.min(parseInt(e.target.value) || 1, currentEvent.remainingQuantity))}
                  className="w-20 px-3 py-2 border rounded"
                />
              </div>
              
              <div className="text-2xl font-bold mb-4">
                Total: ${(currentEvent.price * quantity).toFixed(2)}
              </div>
              
              <Button 
                onClick={handleAddToCart} 
                variant="primary" 
                className="w-full"
                disabled={currentEvent.remainingQuantity === 0}
              >
                {currentEvent.remainingQuantity === 0 ? 'Sold Out' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}