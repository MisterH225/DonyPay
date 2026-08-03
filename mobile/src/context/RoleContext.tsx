import React, { createContext, useContext, useMemo, useState } from 'react';
import type { UserRole } from '../types/role';

type RoleContextValue = {
  role: UserRole;
  setRole: (role: UserRole) => void;
  toggleRole: () => void;
};

const RoleContext = createContext<RoleContextValue | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('buyer');

  const value = useMemo(
    () => ({
      role,
      setRole,
      toggleRole: () =>
        setRole((current) => (current === 'buyer' ? 'seller' : 'buyer')),
    }),
    [role],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
