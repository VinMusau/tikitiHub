import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Home from './pages/Home';
import EventDetail from './pages/EventDetail';
import Checkout from './pages/Checkout';
import MyTickets from './pages/MyTickets';
import Layout from './components/layout/Layout';
import Login from './pages/Login'; 
import AgentDashboard from './pages/AgentDashboard';
import { Register } from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';

function App() {
  const { user } = useAuthStore();
  const isAgent = user?.role === 'ROLE_AGENT';

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={isAgent ? <Navigate to="/organizer/dashboard" replace /> : <Home />} />
          <Route path="/event/:id" element={isAgent ? <Navigate to="/organizer/dashboard" replace /> : <EventDetail />} />
          <Route path="/checkout" element={isAgent ? <Navigate to="/organizer/dashboard" replace /> : <Checkout />} />
          <Route path="/my-tickets" element={isAgent ? <Navigate to="/organizer/dashboard" replace /> : <MyTickets />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          <Route 
            path="/organizer/dashboard" 
            element={isAgent ? <AgentDashboard /> : <Navigate to="/login" replace />} 
          />
          
          <Route path="/login" element={user ? (isAgent ? <Navigate to="/organizer/dashboard" replace /> : <Navigate to="/" replace />) : <Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;