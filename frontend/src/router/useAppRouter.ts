import { useState, useEffect, useCallback, useMemo } from 'react';
import type { NavItemKey } from '../components/layout/AppShell';

export type AppRoute =
  | { type: 'landing' }
  | { type: 'login'; returnUrl?: string }
  | { type: 'workspace'; tab: NavItemKey; applicationId?: string };

const VALID_TABS: Record<string, NavItemKey> = {
  overview: 'overview',
  applications: 'applications',
  scrutiny: 'scrutiny',
  documents: 'documents',
  compliance: 'compliance',
  institutions: 'institutions',
  registry: 'registry',
  gateways: 'gateways',
  audit: 'audit',
};

/**
 * Parses a window path and search into a structured AppRoute.
 */
export function parseRoute(pathname: string, search: string): AppRoute {
  const cleanPath = pathname.replace(/\/+$/, '') || '/';
  const searchParams = new URLSearchParams(search);

  if (cleanPath === '/' || cleanPath === '') {
    return { type: 'landing' };
  }

  if (cleanPath === '/login' || cleanPath === '/signin') {
    const returnUrl = searchParams.get('returnUrl') || undefined;
    return { type: 'login', returnUrl };
  }

  // Workspace protected routes: /app, /app/:tab, /dashboard, etc.
  if (cleanPath === '/app' || cleanPath === '/dashboard') {
    return { type: 'workspace', tab: 'overview' };
  }

  if (cleanPath.startsWith('/app/')) {
    const segments = cleanPath.slice('/app/'.length).split('/');
    const tabSegment = segments[0]?.toLowerCase() || 'overview';
    const tab: NavItemKey = VALID_TABS[tabSegment] || 'overview';
    const applicationId = segments[1] || undefined;
    return { type: 'workspace', tab, applicationId };
  }

  // Any other unknown path defaults to landing
  return { type: 'landing' };
}

/**
 * Constructs a browser URL from an AppRoute or tab.
 */
export function routeToPath(route: AppRoute): string {
  switch (route.type) {
    case 'landing':
      return '/';
    case 'login':
      return route.returnUrl
        ? `/login?returnUrl=${encodeURIComponent(route.returnUrl)}`
        : '/login';
    case 'workspace':
      if (route.applicationId && route.tab === 'applications') {
        return `/app/applications/${route.applicationId}`;
      }
      return `/app/${route.tab}`;
  }
}

/**
 * Lightweight, zero-dependency browser router hook synchronized with HTML5 History API.
 */
export function useAppRouter() {
  const [currentLocation, setCurrentLocation] = useState<{
    pathname: string;
    search: string;
  }>(() => ({
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
    search: typeof window !== 'undefined' ? window.location.search : '',
  }));

  // Synchronize on browser forward / back button events
  useEffect(() => {
    function handlePopState() {
      setCurrentLocation({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    }

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const route = useMemo(
    () => parseRoute(currentLocation.pathname, currentLocation.search),
    [currentLocation.pathname, currentLocation.search]
  );

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean; scrollToTop?: boolean }) => {
      const url = new URL(to, window.location.origin);
      const targetPath = url.pathname + url.search;

      if (options?.replace) {
        window.history.replaceState(null, '', targetPath);
      } else {
        window.history.pushState(null, '', targetPath);
      }

      setCurrentLocation({
        pathname: url.pathname,
        search: url.search,
      });

      if (options?.scrollToTop !== false) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    []
  );

  const navigateToTab = useCallback(
    (tab: NavItemKey, applicationId?: string) => {
      const path = routeToPath({ type: 'workspace', tab, applicationId });
      navigate(path);
    },
    [navigate]
  );

  return {
    pathname: currentLocation.pathname,
    search: currentLocation.search,
    route,
    navigate,
    navigateToTab,
  };
}
