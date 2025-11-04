import { useState } from 'react';
import { DatePicker } from '@mui/x-date-pickers';
import { WidgetProps } from '@rjsf/utils';
import dayjs, { Dayjs } from 'dayjs';

export function DatePickerWidget({
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
    onChange(date ? date.utc().format('YYYY-MM-DD') : undefined);
  };

  return (
    <DatePicker
      value={pickerValue}
      onChange={handleChange}
      label={label}
      timezone="system"
      slotProps={{ field: { clearable: true } }}
    />
  );
}
