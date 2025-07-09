// Utility functions for scenarios

export function truncateStepText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

export function getLastNSteps(steps: any[], n: number, maxLength: number): string {
  if (!Array.isArray(steps)) return '';
  const lastSteps = steps.slice(-n);
  return lastSteps
    .map(step => truncateStepText(step.description || '', maxLength))
    .join('\n');
} 