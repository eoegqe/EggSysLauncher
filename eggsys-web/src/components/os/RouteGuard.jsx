import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useDisabledRoutes } from '@/hooks/useDisabledRoutes';
import DisabledPageScreen from './DisabledPageScreen';

const OWNER_EMAIL = 'eggtheegget@outlook.com';

// Layout route: renders its children (via <Outlet />) unless the current path
// is in the owner's disabled-routes list. The owner always bypasses the check.
export default function RouteGuard() {
  const location = useLocation();
  const { user } = useAuth();
  const { data: disabled = [], isLoading } = useDisabledRoutes();
  const disabledRoutes = Array.isArray(disabled) ? disabled : [];

  if (isLoading) return <Outlet />;
  if (location.pathname === '/SelectOS') return <Outlet />;
  const rec = disabledRoutes.find((r) => r?.route_path === location.pathname);
  if (rec) {
    // Owner bypasses unless the route is elevated to also include the owner.
    if (user?.email === OWNER_EMAIL && !rec.include_owner) return <Outlet />;
    return <DisabledPageScreen />;
  }
  return <Outlet />;
}
