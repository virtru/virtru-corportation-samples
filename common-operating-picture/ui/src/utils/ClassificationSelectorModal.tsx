import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { RJSFSchema } from '@rjsf/utils';
import { IChangeEvent, withTheme } from '@rjsf/core';
import { useContext, useState, useMemo } from 'react';
import { BannerContext, Classifications, ClassificationPriority } from '@/contexts/BannerContext';
import { getSubordinateClassifications } from '@/utils/attributes';
import { customizeValidator } from '@rjsf/validator-ajv8';
import { Theme as RJSFFormMuiTheme } from '@rjsf/mui';

// Configure RJSF
const validator = customizeValidator<any>();
const SetClassForm = withTheme<any, RJSFSchema>(RJSFFormMuiTheme);

// Define the shape of the form data
type ClassificationFormData = {
  activeClassification: string;
};

type ClassificationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userEntitlements: string[];
};

export function ClassificationSelectorModal({ isOpen, onClose, userEntitlements }: ClassificationModalProps) {
  const {
    classification: currentActiveClassification,
    setClassification,
    setHasResults,
    setActiveEntitlements,
    setTdfObjects,
  } = useContext(BannerContext);

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

  const [formData, setFormData] = useState<ClassificationFormData>({
    activeClassification: currentActiveClassification || userHighestClassification,
  });

  const handleChange = (e: IChangeEvent<ClassificationFormData>) => {
    if (e.formData) {
      setFormData(e.formData);
    }
  };

  // User entitlements log
  //console.log('2. Modal Prop (userEntitlements):', userEntitlements);

  const availableOptions = useMemo(() => {
    // Normalize entitlements to simple names (e.g. 'SECRET')
    const simpleEntitledClasses = userEntitlements
      .map(entitlement => entitlement.split('/').pop()?.toUpperCase())
      .filter((name): name is string => name !== undefined && Classifications.includes(name));

    //console.log('Normalized Simple Classes:', simpleEntitledClasses);

    //Filter the master Classifications list by normalized entitlements (preserves order)
    const entitledClasses = Classifications.filter(c => simpleEntitledClasses.includes(c));
    //console.log('Filtered Entitled Classes:', entitledClasses);

    // Use the intersection of entitled and subordinate
    const finalAvailableOptions = entitledClasses;
    //console.log('Final Available Options for Dropdown:', finalAvailableOptions);

    return finalAvailableOptions;

  }, [userEntitlements, formData.activeClassification]);

  // Handle the submission of new active classification level
  const handleSubmit = () => {
    const newClass = formData.activeClassification;

    const allEntitlements = userEntitlements;

    // Determine the subordinate classification names for the new class
    const subordinateClasses = getSubordinateClassifications(newClass);

    // Filter user entitlements
    const newActiveEntitlements = new Set(
        allEntitlements.filter(entitlement => {

            // Check if this is a classification FQN
            if (entitlement.includes('/attr/classification/value/')) {
                 const simpleName = entitlement.split('/').pop()?.toUpperCase();

                 // Keep classification entitlement if it is subordinate to the new class
                 return simpleName && subordinateClasses.includes(simpleName);
            }

            // Keep all non-classification entitlements active
            return true;
        })
    );

    //Update both the display classification and the active entitlements set
    setClassification(newClass);
    setActiveEntitlements(newActiveEntitlements);

    //console.log("New Active Entitlements:", newActiveEntitlements)

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
        // Show only the filtered, available options
        enum: availableOptions,
        enumNames: availableOptions.map(c => c.toUpperCase()),
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