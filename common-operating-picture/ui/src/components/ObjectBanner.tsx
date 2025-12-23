import { Box } from '@mui/material';
import { BannerClassification, Classifications } from '@/contexts/BannerContext';

interface ObjectBannerProps {
  objClassification: string[];
  objCaveats: string[];
  notes: any[]; 
}

export const ObjectBanner = ({ objClassification, objCaveats, notes }: ObjectBannerProps) => {
  // Gather all values from the object and its notes
  const allValues = new Set<string>();

  // Add object values
  objClassification.forEach(v => allValues.add(v.toUpperCase()));
  objCaveats.forEach(v => allValues.add(v.toUpperCase()));

  // Add note values
  notes.forEach(note => {
    try {
      const parsed = JSON.parse(note.tdfNote.search);
      const extract = (arr?: string[]) => arr?.map(url => url.split('/').pop()?.toUpperCase() || '') || [];
      extract(parsed.attrClassification).forEach(v => allValues.add(v));
      extract(parsed.attrNeedtoknow).forEach(v => allValues.add(v));
      extract(parsed.attrRelto).forEach(v => allValues.add(v));
    } catch (e) { /* ignore parse errors */ }
  });

  const activeValues = Array.from(allValues);

  // Find highest classification
  const highestClass = [...Classifications]
    .reverse()
    .find(cls => activeValues.includes(cls)) || 'UNCLASSIFIED';
  const caveats = activeValues.filter(val => !Classifications.includes(val) && val !== '');
  const displayString = caveats.length > 0
    ? `${highestClass}//${caveats.join('//')}`
    : highestClass;

  const color = BannerClassification[highestClass] || '#ccc';

  return (
    <Box sx={{
      background: color,
      color: 'white',
      textAlign: 'center',
      fontWeight: 'bold',
      fontSize: '0.75rem',
      padding: '2px 0',
      borderRadius: '4px 4px 0 0' // Rounded top to fit Accordion look
    }}>
      {displayString}
    </Box>
  );
};