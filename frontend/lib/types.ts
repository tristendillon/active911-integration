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

export interface WeatherAlert {
  event: string;
  headline: string;
  ends: string;
  endsEpoch: number;
  onset: string;
  onsetEpoch: number;
  id: string;
  language: string;
  link: string;
  description: string;
}

export interface WeatherDay {
  datetime: string; // Changed from date to datetime
  tempmax: number;
  tempmin: number;
  temp: number;
  feelslikemax: number; // Added feelslikemax
  feelslikemin: number; // Added feelslikemin
  feelslike: number; // Added feelslike
  precip: number; // Added precip
  precipprob: number; // Added precipprob
  precipcover: number; // Added precipcover
  preciptype: string | string[] | null; // Added preciptype
  windspeed: number; // Added windspeed
  cloudcover: number; // Added cloudcover
  visibility: number; // Added visibility
  conditions: string; // Added conditions
  icon: string; // Added icon
}

export interface Weather {
  address: string;
  resolvedAddress: string;
  latitude: number;
  longitude: number;
  timezone: string;
  tzoffset: number;
  days: WeatherDay[];
  alerts: WeatherAlert[];
}
