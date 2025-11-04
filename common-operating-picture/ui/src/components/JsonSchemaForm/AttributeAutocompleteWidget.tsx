import { Autocomplete, Chip, TextField } from '@mui/material';
import type { WidgetProps } from '@rjsf/utils';

export function AttributeAutocompleteWidget({
  value,
  onChange,
  options,
  label,
}: WidgetProps) {
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
        return onChange(
          Array.isArray(values)
            ? values.map((v) => v.value)
            // Return undefined for empty values to keep RJSF validation happy
            : values?.value || undefined
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
