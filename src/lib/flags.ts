export const flags = {
  get offlineCache(): boolean {
    try {
      return localStorage.getItem('offlineCache') === '1';
    } catch {
      return false;
    }
  },
};
