export const flags = {
  get offlineCache() {
    try {
      return localStorage.getItem('offlineCache') === '1';
    } catch {
      return false;
    }
  },
  get plannerStub() {
    try {
      return localStorage.getItem('plannerStub') === '1';
    } catch {
      return false;
    }
  },
  get copilot() {
    try {
      return localStorage.getItem('copilot') === '1';
    } catch {
      return false;
    }
  },
};
