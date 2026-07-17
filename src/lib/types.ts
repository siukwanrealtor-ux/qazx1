export interface Agent {
  id: string;
  user_id: string;
  name: string | null;
  email: string;
  agent_photo_url: string | null;
  agent_phone_number: string | null;
  agent_license_number: string | null;
  broker_name: string | null;
  broker_license_number: string | null;
  office_address: string | null;
  about_me: string | null;
  personal_website: string | null;
  company_logo_url: string | null;
  email_signature_image_url: string | null;
  updated_at: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  agent_id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string;
  client_type: "buyer" | "renter" | null;
  client_status: string | null;
  purchase_price: number | null;
  rent_budget: number | null;
  desired_move_in_date: string | null;
  preferred_locations: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  min_sqft: number | null;
  school_district: string | null;
  pre_approved: boolean | null;
  pet_friendly: boolean | null;
  household_income: number | null;
  credit_score: number | null;
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
