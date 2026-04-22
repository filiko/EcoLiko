/**
 * Re-exports the CLI store so the companion and CLI share the same
 * ~/.ecoliko/data.json file as the single source of truth.
 */
export {
  loadEvents,
  saveEvent,
  saveEvents,
  loadConfig,
  saveConfig,
  getTodayEvents,
  getEventsByRange,
} from 'ecoliko/store';
