import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { RJSFSchema } from '@rjsf/utils';
import { IChangeEvent, withTheme } from '@rjsf/core';
import { useContext, useState, useMemo } from 'react';
import { BannerContext, Classifications, ClassificationPriority } from '@/contexts/BannerContext';
import { attributes, getSubordinateClassifications } from '@/utils/attributes';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { Theme as RJSFFormMuiTheme } from '@rjsf/mui';

// Configure RJSF
const validator = customizeValidator<any>();
const SetClassForm = withTheme<any, RJSFSchema>(RJSFFormMuiTheme);

// Define the shape of the form data
type ClassificationFormData = {
  activeClassification: string;
  activeNeedToKnow: string[];
  activeRelTo: string[];
};

type ClassificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userEntitlements: string[];
};

interface AttributeValue {
    value: string;
    label: string;
    group?: string;
}

export function ClassificationSelectorModal({ isOpen, onClose, userEntitlements }: ClassificationModalProps) {
  const {
    setClassification,
    setHasResults,
    setActiveEntitlements,
    setTdfObjects,
    activeEntitlements,
  } = useContext(BannerContext);

  const extractEntitlementValues = (category: string) =>
      userEntitlements
          .filter(entitlement => entitlement.includes(`/attr/${category}/value/`))
          .map(entitlement => entitlement.split('/').pop()?.toUpperCase())
          .filter((name): name is string => name !== undefined);

  const defaultNeedToKnows = extractEntitlementValues('needtoknow');
  const defaultRelTo = extractEntitlementValues('relto');

  // Find the user's highest entitlement
  const userHighestClassification = useMemo(() => {
    let maxPriority = -1;
    let highestClass = Classifications[0];

    userEntitlements
        // Filter entitlement to get classification name
        .map(entitlement => entitlement.split('/').pop()?.toUpperCase())
        .forEach(name => {
            if (name && ClassificationPriority.hasOwnProperty(name)) {
                const priority = ClassificationPriority[name as keyof typeof ClassificationPriority];
                if (priority > maxPriority) {
                    maxPriority = priority;
                    highestClass = name;
                }
            }
        });
    return highestClass;
  }, [userEntitlements]);

  const activeValues = useMemo(() => {
    let currentClass = userHighestClassification;
    const currentNeedToKnow: string[] = [];
    const currentRelTo: string[] = [];
    let maxPriority = -1;

    // Iterate over the currently active entitlements set
    activeEntitlements.forEach(entitlement => {
        const simpleName = entitlement.split('/').pop()?.toUpperCase();
        if (!simpleName) return;

        if (entitlement.includes('/attr/classification/value/')) {
            // Find the highest active classification
            if (ClassificationPriority.hasOwnProperty(simpleName)) {
                const priority = ClassificationPriority[simpleName as keyof typeof ClassificationPriority];
                if (priority > maxPriority) {
                    maxPriority = priority;
                    currentClass = simpleName;
                }
            }
        } else if (entitlement.includes('/attr/needtoknow/value/')) {
            // Collect all active needtoknows
            currentNeedToKnow.push(simpleName);
        } else if (entitlement.includes('/attr/relto/value/')) {
            // Collect all active relto
            currentRelTo.push(simpleName);
        }
    });

    return {
        activeClassification: currentClass,
        activeNeedToKnow: currentNeedToKnow,
        activeRelTo: currentRelTo,
    };
  }, [activeEntitlements, userHighestClassification]);

  // Initialize Form

  const [formData, setFormData] = useState<ClassificationFormData>({
    activeClassification: activeValues.activeClassification,
    activeNeedToKnow: activeValues.activeNeedToKnow.length > 0 ? activeValues.activeNeedToKnow : defaultNeedToKnows,
    activeRelTo: activeValues.activeRelTo.length > 0 ? activeValues.activeRelTo : defaultRelTo,
  });

  const handleChange = (e: IChangeEvent<ClassificationFormData>) => {
    if (e.formData) {
      setFormData(e.formData);
    }
  };

  const extractSimpleNames = (attributeList: AttributeValue[]): string[] => {
    return attributeList
        .map(attr => attr.value.split('/').pop()?.toUpperCase())
        .filter((name): name is string => name !== undefined);
  };

  const availableOptions = useMemo(() => {
    // Dropdown options for based on all user entitlements
    const simpleEntitledClasses = userEntitlements
      .map(entitlement => entitlement.split('/').pop()?.toUpperCase())
      .filter((name): name is string => name !== undefined && Classifications.includes(name));

    const entitledClasses = Classifications.filter(c => simpleEntitledClasses.includes(c));
    const finalAvailableOptions = entitledClasses;

    const allKnownNeedToKnows = extractSimpleNames(attributes.needToKnow);
    const availableNeedToKnows = allKnownNeedToKnows
      .filter(val => defaultNeedToKnows.includes(val));

    const allKnownRelTo = extractSimpleNames(attributes.relto);
    const availableRelTo = allKnownRelTo
      .filter(val => defaultRelTo.includes(val));

    return {
      classification: finalAvailableOptions,
      needToKnow: availableNeedToKnows,
      relTo: availableRelTo,
    };

  }, [userEntitlements]);

  // Handle the submission of new active classification level
  const handleSubmit = () => {
    const { activeClassification, activeNeedToKnow, activeRelTo } = formData;
    const allEntitlements = userEntitlements;

    // Determine the subordinate classification names for the new class
    const subordinateClasses = getSubordinateClassifications(activeClassification)

    // Filter user entitlements
    const newActiveEntitlements = new Set(
        allEntitlements.filter(entitlement => {
            const simpleName = entitlement.split('/').pop()?.toUpperCase();
            if (!simpleName) return false;

            // Classification Filtering
            if (entitlement.includes('/attr/classification/value/')) {
                 return subordinateClasses.includes(simpleName);
            }

            // Needtoknow Filtering
            if (entitlement.includes('/attr/needtoknow/value/')) {
                // Keep the entitlement if its simple name is in the user's *selection*
                return activeNeedToKnow.includes(simpleName);
            }

            // Relto Filtering
            if (entitlement.includes('/attr/relto/value/')) {
                return activeRelTo.includes(simpleName);
            }

            return true;
        })
    );

    //Update both the display classification and the active entitlements set
    setClassification(activeClassification);
    setActiveEntitlements(newActiveEntitlements);

    //Refresh results after setting new classification
    setHasResults(false);
    setTdfObjects([]);

    onClose();
  };

  // The RJSF Schema for the form
  const schema: RJSFSchema = {
    type: 'object',
    required: ['activeClassification'],
    properties: {
      activeClassification: {
        type: 'string',
        title: 'Active Classification',
        enum: availableOptions.classification,
        enumNames: availableOptions.classification.map(c => c.toUpperCase()),
      },
      activeNeedToKnow: {
        type: 'array',
        title: 'Active Need-to-Knows',
        items: {
            type: 'string',
            enum: availableOptions.needToKnow,
            enumNames: availableOptions.needToKnow.map(c => c.toUpperCase()),
        },
        uniqueItems: true,
      },
      activeRelTo: {
        type: 'array',
        title: 'Active RelTo',
        items: {
            type: 'string',
            enum: availableOptions.relTo,
            enumNames: availableOptions.relTo.map(c => c.toUpperCase()),
        },
        uniqueItems: true,
      },
    },
  };

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogTitle>Set Active Classification</DialogTitle>
      <DialogContent>
        <SetClassForm
          schema={schema}
          formData={formData}
          onChange={handleChange}
          onSubmit={handleSubmit}
          validator={validator}
          // Hide the submit button from the RJSF form, we'll use DialogActions button
          uiSchema={{ "ui:submitButtonOptions": { "norender": true } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">Set</Button>
      </DialogActions>
    </Dialog>
  );
}