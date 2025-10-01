import { kvGet } from './kv.js';

export const flags = {
  get offlineCache() {
    return kvGet('offlineCache') === '1';
  },
  get plannerStub() {
    return kvGet('plannerStub') === '1';
  },
  get copilot() {
    return kvGet('copilot') === '1';
  },
  get copilotUi() {
    return kvGet('copilotUi') === '1';
  },
  get tts() {
    return kvGet('tts') === '1';
  },
  get copilotExec() {
    return kvGet('copilotExec') === '1';
  },
  get copilotNav() {
    return kvGet('copilotNav') === '1';
  },
};
