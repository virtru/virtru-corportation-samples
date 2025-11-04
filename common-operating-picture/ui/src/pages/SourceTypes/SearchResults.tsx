import { LatLng } from 'leaflet';
import { Card, CardContent, Typography } from '@mui/material';
import { TdfObjectResponse } from '@/hooks/useRpcClient';
import { useState, useEffect, useCallback } from 'react';
import { ClassificationPriority, extractValues } from '@/contexts/BannerContext';
import { TdfObjectResult } from './TdfObjectResult';
import { useEntitlements } from '@/hooks/useEntitlements';

type Props = {
  tdfObjects: TdfObjectResponse[];
  onFlyToClick: (location: LatLng) => void;
};

// Type defining the structure of search attributes extracted from TDF objects and notes
interface TDFObjectSearchAttributes {
  attrClassification?: string[];
  attrNeedtoknow?: string[];
  attrRelto?: string[];
}

// Define the attribute structure coming from the TdfObjectResult component
interface NoteAttributeData {
  noteId: string;
  searchAttributes: string;
}

export function SearchResults({ tdfObjects, onFlyToClick }: Props) {
  const [allNoteAttributes, setAllNoteAttributes] = useState<Record<string, NoteAttributeData[]>>({});
  const { categorizedData } = useEntitlements();

  // Handler to receive updated notes
  const handleNotesUpdated = useCallback((objectId: string, notes: NoteAttributeData[]) => {
  // Only update state if the notes have actually changed
  setAllNoteAttributes((prev) => {
    const currentNotes = prev[objectId] || [];
    if (JSON.stringify(currentNotes) !== JSON.stringify(notes)) {
        return {
          ...prev,
          [objectId]: notes,
        };
      }
      return prev; // No update if the notes are the same
    });
  }, []);

  // Function to combine banner attributes from all TDF objects and their notes
  const combineAndUpdateBanner = useCallback(() => {
    let classPriority = 0;
    let needToKnow = new Set<string>();
    let relTo = new Set<string>();

    // Iterate over tdfobjects
    tdfObjects.forEach((o) => {
        // Classification
        const objClassification = extractValues(o.decryptedData.attrClassification);
        const classificationKey = objClassification as keyof typeof ClassificationPriority;
        if (ClassificationPriority.hasOwnProperty(classificationKey)) {
            classPriority = Math.max(classPriority, ClassificationPriority[classificationKey]);
        }
        // NeedToKnows and RelTos
        const objNeedToKnows = extractValues(o.decryptedData.attrNeedToKnow || []).split(', ').filter(v => v.trim() !== '');
        objNeedToKnows.forEach(v => needToKnow.add(v));
        const objRelTo = extractValues(o.decryptedData.attrRelTo || []).split(', ').filter(v => v.trim() !== '');
        objRelTo.forEach(v => relTo.add(v));
    });

    // Iterate over notes to extract their attributes
    Object.values(allNoteAttributes).flat().forEach((note) => {
        let parsedNote: TDFObjectSearchAttributes = {};
        try {
            parsedNote = JSON.parse(note.searchAttributes);
        } catch (e) {
            console.error("Failed to parse note search attributes:", e);
            return;
        }

        // Note attribute extractor
        const extractNoteAttr = (attrArray: string[] | undefined): string[] => {
            if (!attrArray || attrArray.length === 0) return [];

            // Iterate over all attributes in the array
            return attrArray.map((attrUrl: string) =>
                attrUrl.split('/').pop()?.toUpperCase() || ''
            ).filter(v => v.trim() !== '');
        };

        // Classification
        const noteClassification = extractNoteAttr(parsedNote.attrClassification);
        if (noteClassification.length > 0) {
            const classificationKey = noteClassification[0] as keyof typeof ClassificationPriority;
            if (ClassificationPriority.hasOwnProperty(classificationKey)) {
                classPriority = Math.max(classPriority, ClassificationPriority[classificationKey]);
            }
        }
        // NeedToKnows and RelTos
        extractNoteAttr(parsedNote.attrNeedtoknow).forEach(v => needToKnow.add(v));
        extractNoteAttr(parsedNote.attrRelto).forEach(v => relTo.add(v));
    });

  }, [
      tdfObjects,
      allNoteAttributes,
  ]);


  // UseEffect that triggers the update when new objects or collected notes change
  useEffect(() => {
    combineAndUpdateBanner();
    //console.log("SearchResults useEffect triggered banner update.");
  }, [combineAndUpdateBanner]);

  if (!tdfObjects.length) {
    return (
      <Card>
        <CardContent>
          <Typography>No Results</Typography>
        </CardContent>
      </Card>
    );
  }

  return tdfObjects.map((o) => (
    <TdfObjectResult
      key={o.tdfObject.id}
      tdfObjectResponse={o}
      categorizedData={categorizedData}
      onFlyToClick={onFlyToClick}
      onNotesUpdated={handleNotesUpdated}
    />
  ));
}
