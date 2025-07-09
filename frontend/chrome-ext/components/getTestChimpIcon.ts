// Utility to get the logo icon URL for bug/scenario actions
export function getTestChimpIcon() {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL('images/logo-white.svg');
  }
  return 'images/logo-white.svg';
} 