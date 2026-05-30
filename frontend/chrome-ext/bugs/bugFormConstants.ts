import { BugCategory, BugSeverity } from '../datas';

export const SEVERITY_OPTIONS = [
  { label: 'S1', value: BugSeverity.High },
  { label: 'S2', value: BugSeverity.Medium },
  { label: 'S3', value: BugSeverity.Low },
];

export const BUG_CATEGORY_OPTIONS = Object.values(BugCategory).map((cat) => ({
  label: (cat as string).charAt(0) + (cat as string).slice(1).toLowerCase().replace(/_/g, ' '),
  value: cat as string,
}));
