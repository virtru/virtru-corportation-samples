import { BannerContext } from '@/contexts/BannerContext';
import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TdfObjectResponse } from '@/hooks/useRpcClient';

export const BannerProvider = ({ children }: { children: ReactNode }) => {
    const [searchIsActive, setSearchIsActive] = useState(false);
    const [hasResults, setHasResults] = useState(false);

    // Moved method for managing the tdfobjects
    const [tdfObjects, setTdfObjects] = useState<TdfObjectResponse[]>([]);

    // Initialize with default
    const [activeEntitlements, setActiveEntitlements] = useState(new Set<string>(["NoAccess"]));

    // Tracks if entitlements have been initialized from the user object
    const [isEntitlementsInitialized, setIsEntitlementsInitialized] = useState(false);

    // Added auth to instantiate the active entitlements
    const { user } = useAuth();

    useEffect(() => {
        // Initialization
        const userEntitlements = user?.entitlements;
        const isUserLoaded = user && userEntitlements && userEntitlements[0] !== "loading";

        if (isUserLoaded && !isEntitlementsInitialized) {

            const initialEntitlements = userEntitlements.length > 0
                ? new Set(userEntitlements)
                : new Set<string>(); // Use an empty set if the list is empty

            // Set the active entitlements to all user entitlments
            setActiveEntitlements(initialEntitlements);

            // Mark that entitlements have been initilized
            setIsEntitlementsInitialized(true);
        }
    }, [user, isEntitlementsInitialized]); // Dependencies include 'user' and new flag

    return (
      <BannerContext.Provider value={{
            searchIsActive, setSearchIsActive,
            hasResults, setHasResults,
            activeEntitlements, setActiveEntitlements,
            tdfObjects, setTdfObjects,
        }}>
        {children}
      </BannerContext.Provider>
    );
};
