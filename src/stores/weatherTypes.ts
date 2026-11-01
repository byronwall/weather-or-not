export interface WeatherMetric {
  timestamp: number; // Unix timestamp in seconds
  temp: number;
  feelslike: number;
  humidity: number;
  precip: number;
  precipprob: number;
  snow: number;
  snowdepth: number;
  windspeed: number;
  windgust: number;
  winddir: number;
  pressure: number;
  visibility: number;
  cloudcover: number;
  uvindex: number;
  conditions: string;
  icon: string;
}

export interface LocationWeatherData {
  location: string;
  isSample: boolean;
  metrics: WeatherMetric[];
  resolvedAddress: string;
  timezone: string;
}

export interface WeatherStoreState {
  weatherByLocation: Record<string, LocationWeatherData>;
  selectedLocation: string | null;
  selectedTimeRange: TimeRange | null;
  selectedDates: Date[];
}

export type TimeRange = {
  start: number;
  end: number;
};
