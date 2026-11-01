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

const baseUrl = "/weather-or-not";

export const sampleDataSets = [
  // these are hard coded and stored in the public folder
  // keeping these here in case the API breaks
  {
    location: "46220 Indy",
    data: `${baseUrl}/46220_IN_home.json`,
  },
  {
    location: "96740 Honolulu",
    data: `${baseUrl}/96740_HI_hot.json`,
  },
  {
    location: "99701 Anchorage",
    data: `${baseUrl}/99701_AK_cold.json`,
  },
  {
    location: "70601 New Orleans",
    data: `${baseUrl}/70601_LA_humid.json`,
  },
  {
    location: "Mt Washington",
    data: `${baseUrl}/MtWash_NH_wind.json`,
  },
];

interface WeatherStore extends WeatherStoreState {
  // State
  bufferHours: number;

  // Actions
  setWeatherData: (location: string, data: WeatherApiResponse, isSample: boolean) => void;
  setSelectedLocation: (location: string) => void;
  setSelectedTimeRange: (range: TimeRange) => void;
  setBufferHours: (hours: number) => void;
  loadSampleData: (
    datasetKey?: string,
    timePreference?: PreferredTime,
    preferredDayOfWeek?: number | null
  ) => Promise<void>;
  loadWeatherData: (
    location: string,
    timePreference: PreferredTime,
    preferredDayOfWeek: number | null
  ) => Promise<void>;
  toggleDateSelection: (date: Date) => void;
  clearSelectedDates: () => void;
  setSelectedDates: (dates: Date[]) => void;
  selectDatesForPreferredDay: (
    preferredDayOfWeek: number | null,
    timePreference: PreferredTime
  ) => void;

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

  setWeatherData: (location, data, isSample) =>
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
        isSample,
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

  loadSampleData: async (
    datasetKey?: string,
    timePreference?: PreferredTime,
    preferredDayOfWeek?: number | null
  ) => {
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
      const locationKey = dataset.location;
      store.setWeatherData(locationKey, data, true);
      store.setSelectedLocation(locationKey);

      // If time preference and day preference are provided, select matching dates
      if (timePreference && preferredDayOfWeek !== undefined) {
        store.selectDatesForPreferredDay(preferredDayOfWeek, timePreference);
      }
    } catch (error) {
      console.error("Failed to load sample weather data:", error);
      throw error;
    }
  },

  loadWeatherData: async (
    location: string,
    timePreference: PreferredTime,
    preferredDayOfWeek: number | null
  ) => {
    try {
      const key = "SY8JLD9XBA3653FFPY73QDPU6"; // This will be updated later
      const response = await fetch(
        `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?unitGroup=us&key=${key}&contentType=json`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }
      const data = await response.json();
      const store = get();
      store.setWeatherData(location, data, false);
      store.setSelectedLocation(location);

      // Select matching dates based on preferences
      store.selectDatesForPreferredDay(preferredDayOfWeek, timePreference);
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

  selectDatesForPreferredDay: (
    preferredDayOfWeek: number | null,
    timePreference: PreferredTime
  ) => {
    const state = get();
    if (preferredDayOfWeek === null || !state.selectedLocation) {
      return;
    }

    const availableDates = state.getAvailableDates(
      state.selectedLocation,
      timePreference
    );
    const matchingDates = availableDates.filter(
      (date) => date.getDay() === preferredDayOfWeek
    );

    state.setSelectedDates(matchingDates);
  },

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
