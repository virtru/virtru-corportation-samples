import { BannerContext, extractValues } from '@/contexts/BannerContext';
import { Autocomplete, Chip, TextField } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';
import { useContext } from 'react';

export function AttributeAutocompleteWidget({
  value,
  onChange,
  options,
  label,
}: WidgetProps) {
  const { setClassification, setNeedToKnow, setRelTo } = useContext(BannerContext);
  return (
    <Autocomplete
      multiple={!!options?.multiple}
      value={options?.multiple ?
        // multiple is enabled, so filter options for selected values or return empty array
        (options?.enumOptions || []).filter(o => value?.includes(o.value)) :
        // multiple is disabled, so find the selected value or return null
        (options?.enumOptions || []).find(o => o.value === value) || null
      }
      options={options?.enumOptions || []}
      onChange={(_, values) => {
        let fx;
        const extracted = extractValues(values ?? []);
        switch (label.toUpperCase()) {
          case 'CLASSIFICATION':
            fx = setClassification;
            break;
          case 'NEED TO KNOW':
            fx = setNeedToKnow;
            break;
          case 'REL TO':
            fx = setRelTo;
            break;
          default:
            fx = () => {};
        }
        fx(extracted);
        return onChange(
          (Array.isArray(values)
            ? values.map((v) => v.value)
            // undefined must be returned here instead of null to avoid RJSF validation errors for string types
            : values?.value) || undefined,
        );
      }}
      renderTags={(tagValue, getTagProps) => 
        tagValue.map((option, index) => (
          <Chip label={option.label}
            {...getTagProps({ index })}
            key={option.label}
          />
      ))}
      renderInput={(props) => (
        <TextField {...props} label={label} variant="outlined" />
      )}
    />
  );
}
