export const flags = {
  get offlineCache() {
    try {
      return localStorage.getItem('offlineCache') === '1';
    } catch {
      return false;
    }
  },
};
