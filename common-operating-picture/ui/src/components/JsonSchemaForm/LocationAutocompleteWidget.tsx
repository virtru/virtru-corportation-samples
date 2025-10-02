import { useState } from 'react';
import type { WidgetProps } from '@rjsf/utils';
import { Autocomplete, TextField } from '@mui/material';

export function LocationAutocompleteWidget({ options, label, value, onChange }: WidgetProps) {
  const [inputValue, setInputValue] = useState('');

  return (
    <Autocomplete
      options={options?.enumOptions || []}
      getOptionLabel={option => option?.label || option?.country || ''}
      value={value}
      onChange={(_, newValue) => onChange(newValue?.value || null)}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      renderInput={props => <TextField {...props} label={label} variant="outlined" />}
    />
  );
}
