// Utility to extract unique file paths from DOM
export function getFilePathsFromDOM(): string[] {
  try {
    const nodes = document.querySelectorAll('[data-filepath]');
    const paths = Array.from(nodes)
      .map(node => (node as HTMLElement).getAttribute('data-filepath'))
      .filter((v): v is string => !!v);
    return Array.from(new Set(paths));
  } catch (e) {
    return [];
  }
} 