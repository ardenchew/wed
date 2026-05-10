export function resolveAsset(path: string): string {
  const isAbsoluteUrl = /^(?:https?:)?\/\//.test(path) || path.startsWith('data:');
  if (isAbsoluteUrl) return path;
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}
