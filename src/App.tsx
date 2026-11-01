import { useEffect, useRef, useState } from "react";
import { Header } from "./Header";
import { WeatherCard } from "./WeatherCard";
import { LocationInput } from "./components/LocationInput";
import { useWeatherStore } from "./stores/weatherStore";
import { useChartSettings } from "./stores/chartSettingsStore";

export function App() {
  const { selectedDates, selectedLocation, weatherByLocation } = useWeatherStore();
  const { settings } = useChartSettings();

  const gridRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  // Setup resize observer for the grid
  useEffect(() => {
    if (!gridRef.current) {
      return;
    }

    const updateChartWidth = () => {
      if (!gridRef.current) {
        return;
      }

      // Get the actual width of a grid cell by measuring a child element
      const firstChild = gridRef.current.firstElementChild as HTMLElement;
      if (firstChild) {
        const width = firstChild.offsetWidth;
        setChartWidth(width - 32); // Subtract padding (2 * 16px)
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      updateChartWidth();
    });

    resizeObserver.observe(gridRef.current);
    // Initial width calculation
    updateChartWidth();

    return () => resizeObserver.disconnect();
  }, [selectedDates.length]); // Re-run when number of dates changes

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="w-full p-0 sm:p-4 space-y-4">
        {selectedLocation && weatherByLocation[selectedLocation]?.isSample && (
          <p role="status" className="bg-amber-100 text-amber-950 rounded p-3 mx-auto max-w-3xl">
            Historical sample data — these are not upcoming forecasts.
          </p>
        )}
        {!selectedLocation && (
          <div className="bg-white rounded shadow p-4 w-fit mx-auto">
            <LocationInput />
          </div>
        )}

        <div
          ref={gridRef}
          className="flex flex-col md:flex-row flex-wrap gap-4 justify-center max-w-[1800px] mx-auto p-0 sm:p-4"
        >
          {selectedDates &&
            selectedDates
              .sort((a, b) => a.getTime() - b.getTime())
              .map((date) => (
                <div
                  key={date.toISOString()}
                  style={{ maxWidth: `${settings.maxPanelWidth}px` }}
                  className="flex-1"
                >
                  <WeatherCard
                    date={date}
                    width={Math.min(chartWidth, settings.maxPanelWidth + 32)}
                  />
                </div>
              ))}
        </div>
      </main>
    </div>
  );
}
