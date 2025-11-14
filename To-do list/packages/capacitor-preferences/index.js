import { WebPlugin, registerPlugin } from '@capacitor/core';

const memoryStore = new Map();

function getStore() {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return {
    getItem: (key) => memoryStore.get(key) ?? null,
    setItem: (key, value) => memoryStore.set(key, value),
    removeItem: (key) => memoryStore.delete(key),
    clear: () => memoryStore.clear(),
    key: (index) => Array.from(memoryStore.keys())[index] ?? null,
    get length() {
      return memoryStore.size;
    }
  };
}

class PreferencesWeb extends WebPlugin {
  constructor() {
    super();
    this.store = getStore();
  }

  async get(options) {
    const value = this.store.getItem(options.key ?? '');
    return { value };
  }

  async set(options) {
    this.store.setItem(options.key ?? '', options.value ?? '');
  }

  async remove(options) {
    this.store.removeItem(options.key ?? '');
  }

  async clear() {
    this.store.clear();
  }

  async keys() {
    const keys = [];
    for (let i = 0; i < this.store.length; i += 1) {
      const key = this.store.key(i);
      if (key != null) {
        keys.push(key);
      }
    }
    if (!this.store.length && memoryStore.size) {
      return { keys: Array.from(memoryStore.keys()) };
    }
    return { keys };
  }
}

export const Preferences = registerPlugin('Preferences', {
  web: () => new PreferencesWeb()
});

export default Preferences;
