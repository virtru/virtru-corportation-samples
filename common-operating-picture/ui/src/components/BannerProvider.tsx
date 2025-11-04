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

    // Separate Active Entitlements for limiting search
    const [activeEntitlements, setActiveEntitlements] = useState(new Set<string>());

    // Moved method for managing the tdfobjects. Enabled clearing from changing classification
    const [tdfObjects, setTdfObjects] = useState<TdfObjectResponse[]>([]);

    // Added auth to instantiate the active entitlements
    const { user } = useAuth();


    useEffect(() => {
        if (user && user.entitlements && activeEntitlements.size === 0) {
            // Initialize activeEntitlements to the user's full entitlements on load
            setActiveEntitlements(new Set(user.entitlements));
        }
    }, [user, activeEntitlements.size]);

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
