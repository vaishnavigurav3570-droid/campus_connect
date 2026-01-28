export type UserRole = 'student' | 'admin';

export interface Location {
  id: string;
  name: string;
  building: string;
  floor: string;
  roomNumber?: string;
  lat: number;
  lng: number;
  category: 'department' | 'lab' | 'staff' | 'amenity' | 'admin' | 'hostel';
}

export interface Staff {
  id: string;
  name: string;
  designation: string;
  department: string;
  photo: string;
  locationId: string;
}

export interface Event {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  locationId: string;
  type: 'academic' | 'cultural' | 'sports';
  bannerImage: string;
  venue: string;
  venueDetails?: string;
}

// --- NEW NOTIFICATION INTERFACE ---
export interface Notification {
  id: string;
  title: string;
  message: string;
  date: string;
  type: 'info' | 'alert' | 'success' | 'poll';
  attachment_url?: string; // Added for Admin Attachments
  pollOptions?: { id: string; text: string; count: number }[];
  votedOptionId?: string | null;
  isDeleted?: boolean;
  isEdited?: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  count: number;
}

// --- NEW MEETUP INTERFACE ---
export interface Meetup {
  id: string;
  post_id: string;
  host_id: string;
  guest_id: string;
  host_lat?: number;
  host_lng?: number;
  guest_lat?: number;
  guest_lng?: number;
  is_active: boolean;
}

// --- UPDATED POST INTERFACE ---
export interface Post {
  id: string;
  user_id: string; 
  content: string;
  image_url?: string;
  tags?: string[];
  created_at: string;
  likes?: any[];
  comments?: any[];
  profiles?: { full_name: string; email: string };

  // Polymorphic Fields
  category: 'general' | 'travel' | 'food' | 'errand';
  
  // Travel
  trip_origin?: string;
  trip_destination?: string;
  trip_datetime?: string;
  trip_mode?: 'car' | 'bike' | 'bus';
  seats_available?: number;

  // Food
  restaurant_name?: string;
  order_deadline?: string;

  // Errand
  status?: 'open' | 'in_progress' | 'completed';
  accepted_by?: string;
}