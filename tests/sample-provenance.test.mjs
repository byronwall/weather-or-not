import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useWeatherStore } from '../.test-build/weatherStore.js';

test('sample provenance persists through selection and changes on live lookup', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ days: [], resolvedAddress: 'Example', timezone: 'UTC' }) });
  try {
    await useWeatherStore.getState().loadSampleData('46220 Indy');
    let state = useWeatherStore.getState();
    assert.equal(state.weatherByLocation[state.selectedLocation].isSample, true);
    state.selectDatesForPreferredDay(null, { startHour: 12, endHour: 18 });
    state = useWeatherStore.getState();
    assert.equal(state.weatherByLocation[state.selectedLocation].isSample, true);
    await state.loadWeatherData('46220 Indy', { startHour: 12, endHour: 18 }, null);
    state = useWeatherStore.getState();
    assert.equal(state.weatherByLocation[state.selectedLocation].isSample, false);
  } finally {
    globalThis.fetch = original;
  }
});
