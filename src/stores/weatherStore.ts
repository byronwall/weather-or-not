import { create } from "zustand";
import {
  LocationWeatherData,
  WeatherMetric,
  WeatherStoreState,
  TimeRange,
} from "./weatherTypes";
import { WeatherApiResponse } from "./WeatherApiResponse";
import { convertToWeatherMetric } from "./convertToWeatherMetric";

interface PreferredTime {
  startHour: number; // 0-23
  endHour: number; // 0-23
}

export const sampleDataSets = [
  {
    location: "46220 Indy",
    data: "/46220_IN_home.json",
  },
  {
    location: "96740 Honolulu",
    data: "/96740_HI_hot.json",
  },
  {
    location: "99701 Anchorage",
    data: "/99701_AK_cold.json",
  },
  {
    location: "70601 New Orleans",
    data: "/70601_LA_humid.json",
  },
  {
    location: "Mt Washington",
    data: "/MtWash_NH_wind.json",
  },
];

interface WeatherStore extends WeatherStoreState {
  // State
  bufferHours: number;

  // Actions
  setWeatherData: (location: string, data: WeatherApiResponse) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedTimeRange: (range: TimeRange) => void;
  setBufferHours: (hours: number) => void;
  loadSampleData: (datasetKey?: string) => Promise<void>;
  loadWeatherData: (location: string) => Promise<void>;
  toggleDateSelection: (date: Date) => void;
  clearSelectedDates: () => void;
  setSelectedDates: (dates: Date[]) => void;

  // Queries
  getWeatherForTimeRange: (
    location: string | null,
    range: TimeRange
  ) => WeatherMetric[];
  getAvailableTimeRange: (location: string) => TimeRange | null;
  getAvailableDates: (
    location: string | null,
    preferredTime: PreferredTime
  ) => Date[];
  getSelectedDates: () => Date[];
}

export const useWeatherStore = create<WeatherStore>((set, get) => ({
  weatherByLocation: {},
  selectedLocation: null,
  selectedTimeRange: null,
  selectedDates: [],
  bufferHours: 2,

  setBufferHours: (hours) => set({ bufferHours: hours }),

  setWeatherData: (location, data) =>
    set((state) => {
      // Convert days and hours into a flat list of metrics with timestamps
      const metrics: WeatherMetric[] = [];

      data.days.forEach((day) => {
        // Convert hour-level data if available
        if (day.hours) {
          day.hours.forEach((hour) => {
            metrics.push(convertToWeatherMetric(hour, hour.datetimeEpoch));
          });
        }
      });

      // Sort metrics by timestamp
      metrics.sort((a, b) => a.timestamp - b.timestamp);

      const locationData: LocationWeatherData = {
        location,
        metrics,
        resolvedAddress: data.resolvedAddress,
        timezone: data.timezone,
      };

      return {
        weatherByLocation: {
          ...state.weatherByLocation,
          [location]: locationData,
        },
      };
    }),

  setSelectedLocation: (location) => set({ selectedLocation: location }),

  setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),

  loadSampleData: async (datasetKey?: string) => {
    try {
      console.log("Loading sample weather data...");
      const dataset = datasetKey
        ? sampleDataSets.find((d) => d.location === datasetKey)
        : sampleDataSets[0];

      if (!dataset) {
        throw new Error("Invalid dataset key");
      }

      const response = await fetch(dataset.data);
      const data = await response.json();

      const store = get();
      // Extract ZIP code from location if it exists, otherwise use full location
      const locationKey = dataset.location.split(" ")[0];
      store.setWeatherData(locationKey, data);
      store.setSelectedLocation(locationKey);
    } catch (error) {
      console.error("Failed to load sample weather data:", error);
      throw error;
    }
  },

  loadWeatherData: async (location) => {
    try {
      const response = await fetch(`/api/weather/${location}`);
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }
      const data = await response.json();
      const store = get();
      store.setWeatherData(location, data);
      store.setSelectedLocation(location);
    } catch (error) {
      console.error("Failed to load weather data:", error);
      throw error;
    }
  },

  toggleDateSelection: (date) =>
    set((state) => {
      const dateStr = date.toISOString().split("T")[0];
      const selectedDates = state.selectedDates.filter(
        (d) => d.toISOString().split("T")[0] !== dateStr
      );
      if (selectedDates.length === state.selectedDates.length) {
        selectedDates.push(date);
      }
      return { selectedDates };
    }),

  clearSelectedDates: () => set({ selectedDates: [] }),

  setSelectedDates: (dates) => set({ selectedDates: dates }),

  getWeatherForTimeRange: (location, range) => {
    const state = get();

    if (!location) {
      return [];
    }

    const locationData = state.weatherByLocation[location];
    if (!locationData) {
      return [];
    }

    const bufferSeconds = state.bufferHours * 3600; // Convert hours to seconds
    return locationData.metrics.filter(
      (metric) =>
        metric.timestamp >= range.start - bufferSeconds &&
        metric.timestamp <= range.end + bufferSeconds
    );
  },

  getAvailableTimeRange: (location) => {
    const state = get();
    const locationData = state.weatherByLocation[location];
    if (!locationData || locationData.metrics.length === 0) {
      return null;
    }

    const timestamps = locationData.metrics.map((m) => m.timestamp);
    return {
      start: Math.min(...timestamps),
      end: Math.max(...timestamps),
    };
  },

  getAvailableDates: (location, preferredTime) => {
    const state = get();

    if (!location) {
      return [];
    }

    const timeRange = state.getAvailableTimeRange(location);
    if (!timeRange) {
      return [];
    }

    const availableDates: Date[] = [];
    const startDate = new Date(timeRange.start * 1000);
    const endDate = new Date(timeRange.end * 1000);

    // Reset time components for start date
    startDate.setHours(0, 0, 0, 0);

    // Iterate through each day
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(preferredTime.startHour, 0, 0, 0);

      const dayEnd = new Date(currentDate);
      dayEnd.setHours(preferredTime.endHour, 59, 59, 999);

      const range = {
        start: Math.floor(dayStart.getTime() / 1000),
        end: Math.floor(dayEnd.getTime() / 1000),
      };

      const metrics = state.getWeatherForTimeRange(location, range);

      // Check if we have at least one reading per hour in the preferred time range
      const hours = new Set(
        metrics.map((m) => new Date(m.timestamp * 1000).getHours())
      );
      let hasAllHours = true;

      if (preferredTime.startHour <= preferredTime.endHour) {
        for (let h = preferredTime.startHour; h <= preferredTime.endHour; h++) {
          if (!hours.has(h)) {
            hasAllHours = false;
            break;
          }
        }
      } else {
        // Handle wrap around case (e.g., 22:00 to 04:00)
        for (let h = preferredTime.startHour; h < 24; h++) {
          if (!hours.has(h)) {
            hasAllHours = false;
            break;
          }
        }
        for (let h = 0; h <= preferredTime.endHour; h++) {
          if (!hours.has(h)) {
            hasAllHours = false;
            break;
          }
        }
      }

      if (hasAllHours) {
        availableDates.push(new Date(currentDate));
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availableDates;
  },

  getSelectedDates: () => {
    const state = get();
    return state.selectedDates;
  },
}));
