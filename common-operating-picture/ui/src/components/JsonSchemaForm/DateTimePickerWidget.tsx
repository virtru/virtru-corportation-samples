import { useState } from 'react';
import { DateTimePicker } from '@mui/x-date-pickers';
import { WidgetProps } from '@rjsf/utils';
import dayjs, { Dayjs } from 'dayjs';

export function DateTimePickerWidget({
  label,
  value,
  onChange,
}: WidgetProps) {
  const [pickerValue, setPickerValue] = useState<Dayjs | null>(() => {
    return value ? dayjs(value).local() : null;
  });

  const handleChange = (date: Dayjs | null) => {
    setPickerValue(date);
    // RJSF onChange value must be a string or undefined to work correctly
    onChange(date ? date.utc().format() : undefined);
  };

  return (
    <DateTimePicker
      value={pickerValue}
      onChange={handleChange}
      label={label}
      timezone="system"
      slotProps={{ field: { clearable: true } }}
    />
  );
}
