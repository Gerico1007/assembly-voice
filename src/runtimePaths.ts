const CANONICAL_PREFIX = '/Assembly/voice/';

export const getRuntimeBasePath = (): string => {
  if (typeof window === 'undefined') return '/';
  const { pathname } = window.location;
  return pathname.startsWith(CANONICAL_PREFIX) ? CANONICAL_PREFIX : '/';
};

export const withRuntimeBasePath = (input: string): string => {
  const clean = input.replace(/^\/+/, '');
  const base = getRuntimeBasePath();
  return base === '/' ? `/${clean}` : `${base}${clean}`;
};
