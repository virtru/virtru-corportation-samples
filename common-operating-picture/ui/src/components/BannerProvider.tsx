import { BannerContext } from '@/contexts/BannerContext';
import { ReactNode, useState } from 'react';

export const BannerProvider = ({ children }: { children: ReactNode }) => {
    const [classification, setClassification] = useState('');
    const [needToKnow, setNeedToKnow] = useState('');
    const [relTo, setRelTo] = useState('');
    const [searchIsActive, setSearchIsActive] = useState(false);
    const [hasResults, setHasResults] = useState(false);

    return (
      <BannerContext.Provider value={{ 
            classification, setClassification, 
            needToKnow, setNeedToKnow, 
            relTo, setRelTo, 
            searchIsActive, setSearchIsActive, 
            hasResults, setHasResults,
        }}>
        {children}
      </BannerContext.Provider>
    );
};
