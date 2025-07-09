import { BugSeverity } from '../apiService';
import { BugCategory } from '../datas';

export const CATEGORY_COLORS: Record<string, string> = {
  "UNKNOWN_BUG_CATEGORY": "#d45c57", // muted brand base
  "OTHER": "#ff836a", // lighter coral
  "ACCESSIBILITY": "#ff6b9a", // coral‑pink
  "SECURITY": "#ff6bb4", // coral‑fuchsia
  "VISUAL": "#ff6bd5", // coral‑magenta
  "PERFORMANCE": "#d45c8b", // dusty rose
  "FUNCTIONAL": "#a94643", // deep clay
  "NETWORK": "#d47d57", // warm apricot
  "USABILITY": "#ff9e6b", // peach
  "COMPATIBILITY": "#ffa46b", // light pumpkin
  "DATA_INTEGRITY": "#d49c57", // honey
  "INTERACTION": "#c06bff", // violet
  "LOCALIZATION": "#8e43a9", // plum
  "RESPONSIVENESS": "#6b8dff", // cornflower
  "LAYOUT": "#4d5a7a", // steel blue
};

export const getCategoryColorWhiteFont = (category: string): string => {
  return CATEGORY_COLORS[category] ?? "#d45c57";
};

export const formatCategoryLabel = (category: string): string => {
  return category.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export const getSeverityLabel = (severity: BugSeverity): string => {
  switch (severity) {
    case BugSeverity.High: return 'S1';
    case BugSeverity.Medium: return 'S2';
    case BugSeverity.Low: return 'S3';
    default: return 'S1';
  }
};

export const SEVERITY_OPTIONS = [
  { label: 'S1', value: BugSeverity.High },
  { label: 'S2', value: BugSeverity.Medium },
  { label: 'S3', value: BugSeverity.Low },
];

export const truncateText = (text: string, max: number): string => {
  if (!text) return '';
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
};

export const getCatchBugsIcon = () => {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL('images/logo-white.svg');
  }
  return 'images/logo-white.svg';
};

export const BUG_CATEGORY_OPTIONS = Object.values(BugCategory).map(cat => ({
  label: (cat as string).charAt(0) + (cat as string).slice(1).toLowerCase().replace(/_/g, ' '),
  value: cat as string
})); 