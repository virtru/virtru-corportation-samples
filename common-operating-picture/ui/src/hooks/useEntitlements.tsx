import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';

export interface CategorizedEntitlements {
  [category: string]: string[];
}

export function useEntitlements() {
  const { user } = useAuth();

  const categorizedData = useMemo(() => {
    const data: CategorizedEntitlements = {};

    if (!user?.entitlements) return data;

    user.entitlements.forEach((url) => {
      try {
        const parts = url.split('/');
        const category = parts[4];
        const value = parts[6];

        if (category && value) {
          if (!data[category]) {
            data[category] = [];
          }
          // Prevent duplicate values in the same category
          if (!data[category].includes(value)) {
            data[category].push(value);
          }
        }
      } catch (e) {
        console.error("Failed to parse entitlement URL:", url, e);
      }
    });

    return data;
  }, [user?.entitlements]);

  return { categorizedData, rawEntitlements: user?.entitlements || [] };
}