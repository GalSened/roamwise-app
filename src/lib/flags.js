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
  get copilotUi() {
    try {
      return localStorage.getItem('copilotUi') === '1';
    } catch {
      return false;
    }
  },
  get tts() {
    try {
      return localStorage.getItem('tts') === '1';
    } catch {
      return false;
    }
  },
  get copilotExec() {
    try {
      return localStorage.getItem('copilotExec') === '1';
    } catch {
      return false;
    }
  },
  get copilotNav() {
    try {
      return localStorage.getItem('copilotNav') === '1';
    } catch {
      return false;
    }
  },
};
