export interface Agent {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  created_at: string;
}

export interface Client {
  id: string;
  agent_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string;
  created_at: string;
}

export interface Search {
  id: string;
  client_id: string;
  name: string;
  created_at: string;
}

export interface Listing {
  id: string;
  search_id: string;
  photo_url: string | null;
  address: string | null;
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lot_size: string | null;
  listing_status: string;
  last_updated: string | null;
  customer_status: string;
  notes: string | null;
  created_at: string;
}

export type ListingStatus =
  | "Active"
  | "Pending"
  | "Sold"
  | "Off Market"
  | "Coming Soon";

export type CustomerStatus =
  | "New Lead"
  | "Touring"
  | "Interested"
  | "Not Interested"
  | "Under Contract";

export const LISTING_STATUSES: ListingStatus[] = [
  "Active",
  "Pending",
  "Sold",
  "Off Market",
  "Coming Soon",
];

export const CUSTOMER_STATUSES: CustomerStatus[] = [
  "New Lead",
  "Touring",
  "Interested",
  "Not Interested",
  "Under Contract",
];
