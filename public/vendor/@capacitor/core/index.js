const platform = typeof window === 'undefined' ? 'node' : 'web';

export const Capacitor = {
  getPlatform() {
    return platform;
  },
  isNativePlatform() {
    return platform !== 'web';
  }
};

export class WebPlugin {
  constructor() {
    this.platform = platform;
  }
}

export function registerPlugin(_name, implementations = {}) {
  if (platform === 'web' && implementations.web) {
    return typeof implementations.web === 'function'
    ? implementations.web()
    : implementations.web;
  }
  if (implementations.default) {
    return typeof implementations.default === 'function'
    ? implementations.default()
    : implementations.default;
  }
  return {};
}
