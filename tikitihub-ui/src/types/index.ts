export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'USER' | 'ORGANIZER' | 'AGENT' | 'ADMIN' | 'ROLE_USER' | 'ROLE_ORGANIZER' | 'ROLE_AGENT' | 'ROLE_ADMIN';
  createdAt?: string;
}

export interface Event {
  id: number;
  eventName: string;
  description: string;
  venue: string;
  eventDate: string;  // ISO date string
  totalQuantity: number;
  remainingQuantity: number;
  price: number;
  imageUrl?: string;
  status: 'UPCOMING' | 'ONGOING' | 'CANCELLED' | 'SOLD_OUT';
  createdAt?: string;
  updatedAt?: string;
}

export interface Order {
  id: number;
  userId: number;
  eventId: number;
  quantity: number;
  totalPrice: number;
  orderDate: string;
  status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
  tickets?: Ticket[];
  event?: Event;
  user?: User;
}

export interface Ticket {
  id: number;
  orderId: number;
  ticketCode: string;
  qrCodeUrl?: string;
  seatSection?: string;
  seatRow?: string;
  seatNumber?: string;
  isUsed: boolean;
  order?: Order;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface CreateEventRequest {
  title: string;
  description: string;
  venue: string;
  eventDate: string;
  totalTickets: number;
  price: number;
  imageUrl?: string;
}

export interface UpdateEventRequest extends Partial<CreateEventRequest> {
  id: number;
}

export interface CreateOrderRequest {
  eventId: number;
  quantity: number;
  paymentMethod?: string;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}