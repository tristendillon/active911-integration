export interface Agency {
  name: string;
  id: number;
  timezone: string;
}

export interface AlertDetails {
  id: string;
  city?: string | null;
  coordinate_source?: string | null;
  cross_street?: string | null;
  custom_identifiers?: string | null;
  description?: string | null;
  details?: string | null;
  dispatch_coords?: string | null;
  lat: number;
  lon: number;
  map_address?: string | null;
  map_code?: string | null;
  place?: string | null;
  priority?: string | null;
  received?: string | null;
  source?: string | null;
  state?: string | null;
  unit?: string | null;
  units?: string | null;
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

export interface WeatherHour {

  conditions: string;
  datetime: string;
  humidity: number;
  icon: string;
  precipprob: number;
  temp: number;
  winddir: number;
  windspeed: number;
}

export interface WeatherDay {
  datetime: string;
  conditions: string;
  description: string;
  hours: WeatherHour[];
  humidity: number;
  icon: string;
  precipprob: number;
  temp: number;
  tempmax: number;
  tempmin: number;
  winddir: number;
  windspeed: number;
}

export interface Weather {
  address: string;
  resolvedAddress: string;
  currentConditions: WeatherHour
  latitude: number;
  longitude: number;
  timezone: string;
  tzoffset: number;
  days: WeatherDay[];
  alerts: WeatherAlert[];
}
