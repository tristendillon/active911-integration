export interface Agency {
  name: string;
  id: number;
  timezone: string;
}

export interface AlertDetails {
  id: string;
  city: string;
  coordinate_source: string;
  cross_street: string;
  custom_identifiers?: string;
  description: string;
  details: string;
  dispatch_coords: string;
  lat: number;
  lon: number;
  map_address: string;
  map_code?: string;
  place: string;
  priority: string;
  received: string;
  source?: string;
  state: string;
  unit?: string;
  units: string;
  pagegroups: string[];
  stamp: number;
  status: string; // Added for internal tracking
}

export interface Alert {
  agency: Agency;
  alert: AlertDetails;
}
