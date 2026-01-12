import { Box } from '@mui/material';
import { BannerClassification, Classifications } from '@/contexts/BannerContext';

interface ObjectBannerProps {
  objClassification: string[];
  objNTK: string[];
  objRel: string[];
  notes: any[];
}

export const ObjectBanner = ({ objClassification, objNTK, objRel, notes }: ObjectBannerProps) => {
  const classifications = new Set<string>();
  const ntkValues = new Set<string>();
  const relValues = new Set<string>();

  // Process Object Values
  (objClassification ?? []).forEach(v => v && classifications.add(v.toUpperCase()));
  (objNTK ?? []).forEach(v => v && ntkValues.add(v.toUpperCase()));
  (objRel ?? []).forEach(v => v && relValues.add(v.toUpperCase()));

  // Validation for object classification
   if (classifications.size === 0) {
    throw new Error("Data Integrity Error: No classification found for object.");
  }

  // Process Note Values
  (notes ?? []).forEach(note => {
    try {
      // Use optional chaining for nested JSON paths
      const searchData = note?.tdfNote?.search;
      if (!searchData) return;
      const parsed = JSON.parse(searchData);

      const extract = (arr?: string[]) =>
        arr?.map(url => url.split('/').pop()?.toUpperCase() || '').filter(Boolean) ?? [];

      const noteClasses = extract(parsed.attrClassification);

      // Validation for classification
      if (noteClasses.length === 0) {
       throw new Error(`Validation Error: Note ${note.id} is missing a classification.`);
      }

      extract(parsed.attrClassification).forEach(v => classifications.add(v));
      extract(parsed.attrNeedtoknow).forEach(v => ntkValues.add(v));
      extract(parsed.attrRelto).forEach(v => relValues.add(v));
    } catch (e) {
      console.error("Failed to parse note data", e);
    }
  });

  // Determine Highest Classification
  const highestClass = [...Classifications]
    .reverse()
    .find(cls => classifications.has(cls)) || 'UNCLASSIFIED';

  // Build the Caveat String
  const combinedNTK = Array.from(ntkValues);
  const combinedRel = Array.from(relValues);
  const finalNTK = combinedNTK.filter(v => v !== highestClass && v !== '');
  const finalRelRaw = combinedRel.filter(v => v !== highestClass && v !== '');

  // Join all countries with a comma, then add one "REL TO" at the start
  const formattedRel = finalRelRaw.length > 0
    ? [`REL TO ${finalRelRaw.join(', ')}`]
    : [];

  const allCaveats = [...finalNTK, ...formattedRel];

  const displayString = allCaveats.length > 0
    ? `${highestClass}//${allCaveats.join('//')}`
    : highestClass;

  const color = BannerClassification[highestClass] || '#ccc';

  return (
    <Box sx={{
      background: color, color: 'white', textAlign: 'center',
      fontWeight: 'bold', fontSize: '0.75rem', padding: '2px 0',
      borderRadius: '4px 4px 0 0'
    }}>
      {displayString}
    </Box>
  );
};