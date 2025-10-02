import {  Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useContext, useEffect } from 'react';
import { BannerContext, BannerClassification } from '@/contexts/BannerContext';
import { useLocation } from 'react-router-dom';

export const Banner = () => {
  const theme = useTheme();
  const { classification, setClassification, needToKnow, setNeedToKnow, relTo, setRelTo, searchIsActive, hasResults } = useContext(BannerContext);
  const bannerColor = BannerClassification[classification as keyof typeof BannerClassification];
  const location = useLocation();
  const createIsActive = location?.search?.includes('mode=create');
  const showBanner = location?.pathname === '/source-types' && (createIsActive || searchIsActive || hasResults);
  useEffect(() => {
    if (!showBanner) {
      setClassification('');
      setNeedToKnow('');
      setRelTo('');
    }
  }
  , [setClassification, setNeedToKnow, setRelTo, location.pathname, createIsActive, searchIsActive, hasResults, showBanner]);

  return showBanner && classification && 
        (<Box 
          style={
            { 
              background: bannerColor, 
              zIndex: theme.zIndex.modal + 1,
              textAlign: 'center',
            }
          }>
          {[classification, needToKnow, `${relTo ? 'REL TO ' : ''}${relTo}`].filter((v) => v).join(' // ')}
        </Box>);
};
