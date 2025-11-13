import { BannerContext } from '@/contexts/BannerContext';
import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { TdfObjectResponse } from '@/hooks/useRpcClient';

export const BannerProvider = ({ children }: { children: ReactNode }) => {
    const [classification, setClassification] = useState('');
    const [needToKnow, setNeedToKnow] = useState('');
    const [relTo, setRelTo] = useState('');
    const [searchIsActive, setSearchIsActive] = useState(false);
    const [hasResults, setHasResults] = useState(false);

    // Moved method for managing the tdfobjects
    const [tdfObjects, setTdfObjects] = useState<TdfObjectResponse[]>([]);

    // Initialize with an empty Set or the default practice set if needed for initial rendering
    const [activeEntitlements, setActiveEntitlements] = useState(new Set<string>(["NoAccess"]));

    // Tracks if entitlements have been initialized from the user object
    const [isEntitlementsInitialized, setIsEntitlementsInitialized] = useState(false);

    // Added auth to instantiate the active entitlements
    const { user } = useAuth();

    useEffect(() => {
        // Condition Check:
        // 1. Check if the user object (and entitlements) is loaded (i.e., not the initial 'loading' array).
        // 2. Check if the entitlements **haven't** been initialized yet.

        // Assuming user?.entitlements will eventually be an array of actual entitlements
        // or an empty array, and not the literal string array ["loading"].
        // We check for the presence of user.entitlements AND that the length > 0 OR user is fully loaded.

        // **Updated Logic for Initialization**
        const userEntitlements = user?.entitlements;
        const isUserLoaded = user && userEntitlements && userEntitlements[0] !== "loading";

        //console.log("User Entitlements", userEntitlements);

        if (isUserLoaded && !isEntitlementsInitialized) {

            const initialEntitlements = userEntitlements.length > 0
                ? new Set(userEntitlements)
                : new Set<string>(); // Use an empty set if the list is empty

            // Set the active entitlements to all user entitlments
            setActiveEntitlements(initialEntitlements);

            // Mark that entitlements have been initilized
            setIsEntitlementsInitialized(true);

            //console.log("Entitlements Initialized:", initialEntitlements);
        }
    }, [user, isEntitlementsInitialized]); // Dependencies include 'user' and new flag

    return (
      <BannerContext.Provider value={{
            classification, setClassification,
            needToKnow, setNeedToKnow,
            relTo, setRelTo,
            searchIsActive, setSearchIsActive,
            hasResults, setHasResults,
            activeEntitlements, setActiveEntitlements,
            tdfObjects, setTdfObjects,
        }}>
        {children}
      </BannerContext.Provider>
    );
};
