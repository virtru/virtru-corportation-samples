import { Dispatch, SetStateAction, createContext } from 'react';
import { mapColors } from '@/pages/SourceTypes/helpers/markers';
import { TdfObjectResponse } from '@/hooks/useRpcClient';

export const extractValues = (values: string[] | object[] | string |  object) => {
    const vals = Array.isArray(values) ? values : [values];
    const filteredVals = vals.filter(v => v);
    const extract = (v: string) => v.split('/').pop()?.toUpperCase();
    return Array.from(new Set(filteredVals.map((v) => extract(typeof v === 'string' ? v : v.value)))).join(', ');
};

export const calculateBannerAttributes = (tdfs: TdfObjectResponse[]) => {
    let classPriority = 0;
    let needToKnow = new Set<string>();
    let relTo = new Set<string>();

    tdfs.forEach((o) => {
        // Max Classification
        const objClassification = extractValues(o.decryptedData.attrClassification);
        const classificationKey = objClassification as keyof typeof ClassificationPriority;
        if (ClassificationPriority.hasOwnProperty(classificationKey) && classificationKey !== 'UNCLASSIFIED') {
            classPriority = Math.max(classPriority, ClassificationPriority[classificationKey]);
        }

        // Union Of NeedToKnows
        const tdfNeedToKnows = extractValues(o.decryptedData.attrNeedToKnow || []).split(', ').filter(v => v.trim() !== '');
        tdfNeedToKnows.forEach(v => needToKnow.add(v));

        // Union Of RelTo
        const tdfRelTo = extractValues(o.decryptedData.attrRelTo || []).split(', ').filter(v => v.trim() !== '');
        tdfRelTo.forEach(v => relTo.add(v));
    });

    return {
        classification: Classifications[classPriority],
        needToKnow: [...needToKnow].filter(v => v.trim() !== '').join(', '),
        relTo: [...relTo].filter(v => v.trim() !== '').join(', '),
    };
};

// Order matters here as the index of the classification in the array is the priority
export const Classifications = ['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOPSECRET'];
export const ClassificationPriority = Classifications.reduce((priority, c, i) => {
    priority[c] = i;
    return priority;
}, {} as { [key: string]: number });
export const BannerClassification = Classifications.reduce((classification, c) => {
    classification[c] = mapColors[c.toLowerCase() as keyof typeof mapColors];
    return classification;
}, {} as { [key: string]: string });



type BannerContextType = {
    classification: string,
    setClassification: Dispatch<SetStateAction<string>>,
    needToKnow: string,
    setNeedToKnow: Dispatch<SetStateAction<string>>,
    relTo: string,
    setRelTo: Dispatch<SetStateAction<string>>,
    searchIsActive: boolean,
    setSearchIsActive: Dispatch<SetStateAction<boolean>>,
    hasResults: boolean,
    setHasResults: Dispatch<SetStateAction<boolean>>,
    activeEntitlements: Set<string>,
    setActiveEntitlements: Dispatch<SetStateAction<Set<string>>>,
    tdfObjects: TdfObjectResponse[];
    setTdfObjects: Dispatch<SetStateAction<TdfObjectResponse[]>>;
};

export const BannerContext = createContext<BannerContextType>(
    {
        classification: '',
        setClassification: () => {},
        needToKnow: '',
        setNeedToKnow: () => {},
        relTo: '',
        setRelTo: () => {},
        searchIsActive: false,
        setSearchIsActive: () => {},
        hasResults: false,
        setHasResults: () => {},
        activeEntitlements: new Set(),
        setActiveEntitlements: () => {},
        tdfObjects: [],
        setTdfObjects: () => {},
    },
);
