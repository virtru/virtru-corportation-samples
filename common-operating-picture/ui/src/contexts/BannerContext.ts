import { Dispatch, SetStateAction, createContext } from 'react';
import { mapColors } from '@/pages/SourceTypes/helpers/markers';

export const extractValues = (values: string[] | object[] | string |  object) => {
    const vals = Array.isArray(values) ? values : [values];
    const extract = (v: string) => v.split('/').pop()?.toUpperCase();
    return Array.from(new Set(vals.map((v) => extract(typeof v === 'string' ? v : v.value)))).join(', ');
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
    },
);
