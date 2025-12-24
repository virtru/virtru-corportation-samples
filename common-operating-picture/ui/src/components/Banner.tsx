import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useContext } from 'react';
import { BannerContext, Classifications, BannerClassification } from '@/contexts/BannerContext';

export const Banner = () => {
  const theme = useTheme();
  const { activeEntitlements } = useContext(BannerContext);

  // Helper to extract the value from the FQN (e.g., 'secret')
  const getFqnValue = (fqn: string): string => (fqn || '').split('/').pop()?.toUpperCase() || '';

  const getBannerData = () => {
    const activeValues = Array.from(activeEntitlements).map(getFqnValue);

    // Highest Classification only
    const highestClass = [...Classifications]
      .reverse()
      .find(cls => activeValues.includes(cls)) || 'UNCLASSIFIED';
    const caveats = activeValues.filter(val => !Classifications.includes(val));
    const displayString = caveats.length > 0
      ? `${highestClass}//${caveats.join('//')}`
      : highestClass;

    return {
      label: "MAX CLASSIFICATION: " + displayString,
      color: BannerClassification[highestClass]
    };
  };

  const { label, color } = getBannerData();

  if ( activeEntitlements.size === 0) return null;

  return (
    <Box
      sx={{
        background: color,
        color: 'white',
        zIndex: theme.zIndex.modal + 1,
        textAlign: 'center',
        fontWeight: 'bold',
        padding: '4px 0',
      }}
    >
      {label}
    </Box>
  );
};