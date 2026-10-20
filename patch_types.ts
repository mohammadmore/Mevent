export type EntityStatus = 'PUBLISHED' | 'CANCELLED' | 'DRAFT';

export interface Place {
  id: number;
  name: string;
  description?: string;
  type: 'CAFE' | 'ESCAPE_ROOM' | 'MUSEUM' | 'CINEMA' | 'THEATER' | 'OTHER';
  workingHours?: string;
  holidays?: string;
  location: {
    address: string;
    lat: number;
    lng: number;
  };
  amenities?: string[];
  imageUrl?: string;
  galleryUrls?: string[];
  status: EntityStatus;
  createdAt: Date;
}

export interface Chain {
  id: number;
  name: string;
  description: string;
  coverImage?: string;
  organizerId: number;
  tags: string[];
  status: EntityStatus;
  createdAt: Date;
}

export interface Flow {
  id: number;
  title: string;
  description?: string;
  coverImage?: string;
  activeFrom?: Date;
  activeTo?: Date;
  tags: string[]; // These tags act as rules. Anything with these tags is part of the flow.
  status: EntityStatus;
  createdAt: Date;
}

export interface Movie {
  id: number;
  title: string;
  description: string;
  trailerUrl?: string;
  coverImage?: string;
  durationMinutes?: number;
  tags: string[];
  status: EntityStatus;
  createdAt: Date;
}

export interface Showtime {
  id: number;
  movieId: number;
  placeId: number;
  startTime: Date;
  endTime?: Date;
  price: number;
  capacity?: number;
  ticketsSold?: number;
}

export interface Vibe {
  id: number;
  title: string;
  description: string;
  location: {
    areaName: string;
    polygon?: { lat: number; lng: number }[]; // For rendering heatmap/polygon on map
    center?: { lat: number; lng: number };
  };
  bestTimeToExperience?: string;
  imageUrls: string[];
  tags: string[];
  status: EntityStatus;
  createdAt: Date;
}
