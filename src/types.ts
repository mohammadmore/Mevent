export type Role = 'USER' | 'ORGANIZER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  city?: string;
  email?: string;
  phone?: string;
  role: Role;
  preferences: string[]; // e.g., ["#family", "#music"]
  points: number; // For gamification
  website?: string;
  instagram?: string;
  telegram?: string;
  twitter?: string;
  location?: {
    lat: number;
    lng: number;
  };
  coverImage?: string;
  bio?: string;
  organizerType?: 'INDIVIDUAL' | 'CORPORATE';
  createdAt: Date;
}

export interface Hub {
  id: string;
  name: string;
  city?: string;
  description?: string;
  ownerId: string;
  type: 'ARTIST' | 'GALLERY' | 'VENUE';
  followersCount: number;
  createdAt: Date;
}

export interface Event {
  placeId?: number;
  chainId?: number;
  capacity?: number;
  id: number;
  title: string;
  city?: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  fuzzyTime?: string;
  location?: {
    address: string;
    lat: number;
    lng: number;
  };
  website?: string;
  instagram?: string;
  telegram?: string;
  twitter?: string;
  currency?: string;
  cost: number; // 0 for free
  tags: string[];
  /** Mood/company tags the organizer chose (keys from lib/moods). */
  moods?: string[];
  /** The chosen tags plus inferred ones, as shown on cards. */
  vibes?: string[];
  /** Why the "for you" feed picked this event. */
  reason?: string;
  hubIds?: number[];
  galleryUrls?: string[];
  imageUrl?: string;
  ticketUrl?: string;
  bgIcon?: string;
  hubId?: number; // If organized by a Hub
  organizerId: number;
  coOrganizerIds?: number[];
  source: 'UGC' | 'CRAWLER'; // User Generated vs Crawler
  status: 'PUBLISHED' | 'CANCELLED' | 'DRAFT' | 'HIDDEN' | 'PENDING';
  /** Public profile of the organizer (attached by the API). */
  organizer?: { id: number; name: string; role?: string; bio?: string | null } | null;
  /** Kilometres from the user's location, when the list was requested with a location. */
  distance?: number | null;
  seatsLeft?: number;
  seatsTaken?: number;
  advancedDetails?: {
    dressCode?: string;
    parking?: string;
    accessibility?: string;
    ageRestriction?: string;
    foodAndDrink?: string;
    weatherPolicy?: string;
    cancellationPolicy?: string;
    itemsToBring?: string;
    prohibitedItems?: string;
    scheduleDetails?: string;
    speakersOrPerformers?: string;
    networkingOpportunities?: string;
    photographyPolicy?: string;
    merchandise?: string;
    wifiAvailability?: string;
    restrooms?: string;
    securityInfo?: string;
    firstAid?: string;
    publicTransport?: string;
    accommodationOptions?: string;
  };
  createdAt: Date;
}

export type InteractionType = 'RSVP' | 'VIEW' | 'COMMENT' | 'RATING' | 'SHARE';

export interface Interaction {
  id: string;
  userId: string;
  eventId: string;
  type: InteractionType;
  metadata?: any; // e.g., rating value, comment text
  createdAt: Date;
}
export type EntityStatus = 'PUBLISHED' | 'CANCELLED' | 'DRAFT';

export interface Place {
  id: number;
  name: string;
  city?: string;
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
  city?: string;
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
  city?: string;
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
  city?: string;
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
  city?: string;
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
