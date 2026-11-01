import { useWeatherStore } from "./stores/weatherStore";
import {
  formatWeatherSummary,
  getWeatherIcon,
} from "./utils/weatherFormatters";
import { WeatherChartPanel } from "./WeatherChartPanel";
import { useUserPrefs } from "./stores/userPrefsStore";
import { analyzeCombinedPreferences } from "./utils/preferenceHelper";
import { useChartSettings } from "./stores/chartSettingsStore";

interface WeatherCardProps {
  date: Date;
  width: number;
}

interface WeatherMetricCardProps {
  label: string;
  value: string | number;
}

function WeatherMetricCard({ label, value }: WeatherMetricCardProps) {
  const { settings } = useChartSettings();

  return (
    <div
      className={`flex items-baseline justify-between bg-gray-50 px-3 py-1.5 rounded min-w-0`}
      style={{ width: settings.metricCardWidth }}
    >
      <span className="text-gray-600 truncate mr-2">{label}</span>
      <span className="font-medium flex-shrink-0">{value}</span>
    </div>
  );
}

export function WeatherCard({ date, width }: WeatherCardProps) {
  const selectedLocation = useWeatherStore((s) => s.selectedLocation);
  const { getWeatherForTimeRange } = useWeatherStore();
  const { preferences, timePreference, minimumDuration } = useUserPrefs();
  const { settings } = useChartSettings();

  // Convert timePreference to TimeRange
  // need epch time - add day
  const start = new Date(date);
  start.setHours(timePreference.startHour, 0, 0, 0);
  const end = new Date(date);
  end.setHours(timePreference.endHour, 0, 0, 0);
  const timeRange = {
    start: Math.floor(start.getTime() / 1000),
    end: Math.floor(end.getTime() / 1000),
  };

  const weatherData = getWeatherForTimeRange(selectedLocation, timeRange);

  if (!weatherData || weatherData.length === 0) {
    return (
      <div className="bg-white rounded shadow p-4" style={{ width }}>
        <p>No weather data available for this date and location.</p>
      </div>
    );
  }

  // Analyze preferences
  const analysis = analyzeCombinedPreferences(
    weatherData,
    preferences,
    timePreference,
    minimumDuration
  );

  // Get weather summary using first data point
  const summary = formatWeatherSummary(weatherData[0]);
  const icon = getWeatherIcon(weatherData[0]);

  const metrics = [
    { label: "Conditions", value: summary.conditions },
    { label: "Temperature", value: summary.temperature },
    { label: "Wind", value: summary.wind },
    { label: "Precipitation", value: summary.precipitation },
    { label: "Humidity", value: summary.humidity },
    { label: "Cloud Cover", value: summary.cloudCover },
    { label: "UV Index", value: summary.uvIndex },
  ];

  // Filter metrics based on visible weather fields
  const visibleMetrics = metrics;

  return (
    <div className="bg-white rounded-lg shadow p-4 w-full overflow-hidden min-w-0 max-w-full">
      <div className="flex items-center justify-between mb-4 min-w-0 gap-2">
        <div className="min-w-0 flex-1 overflow-hidden">
          <h2 className="text-xl font-bold truncate">{selectedLocation}</h2>
          <p className="text-gray-600 truncate">
            {date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="text-4xl flex-shrink-0">{icon}</div>
      </div>

      {settings.showMetricValues && (
        <div className="mb-4">
          <div className="min-w-0 max-w-full">
            <div className="flex flex-wrap gap-2">
              {visibleMetrics.map((metric) => (
                <WeatherMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 min-w-0">
        <div className="space-y-2 flex gap-2">
          {analysis.validTimeRanges.length > 0 ? (
            <>
              <p className="font-medium flex flex-wrap min-w-0">
                <span className="flex-shrink-0">Good conditions:</span>
                <div className="flex flex-wrap gap-2 w-full">
                  {analysis.validTimeRanges.map((range, index) => (
                    <span
                      key={index}
                      className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded"
                    >
                      {range}
                    </span>
                  ))}
                </div>
              </p>
            </>
          ) : (
            <p className="text-sm text-red-600">
              No periods meet all preferences within the time range
            </p>
          )}

          {analysis.violations.length > 0 && (
            <>
              <p className="font-medium flex flex-wrap min-w-0">
                <span className="flex-shrink-0">Preference violations:</span>
                <div className="flex flex-wrap gap-2 w-full">
                  {Array.from(
                    new Set(
                      analysis.violations.map(
                        (v) =>
                          `${v.field}: ${
                            v.type === "min" ? "too low" : "too high"
                          }`
                      )
                    )
                  ).map((violation, index) => (
                    <span
                      key={index}
                      className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded"
                    >
                      {violation}
                    </span>
                  ))}
                </div>
              </p>
            </>
          )}
        </div>
      </div>

      <div>
        <WeatherChartPanel
          weatherData={weatherData}
          width={Math.min(
            width,
            window.innerWidth - settings.chartPanelSidePadding
          )}
        />
      </div>
    </div>
  );
}
