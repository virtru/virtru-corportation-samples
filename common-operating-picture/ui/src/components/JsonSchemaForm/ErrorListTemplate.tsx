import { Alert } from '@mui/material';

export function ErrorListTemplate() {
  return (
    <Alert variant="filled" severity="error" sx={{ marginTop: '1.5em' }}>
      Please correct the errors in the form before submitting.
    </Alert>
  );
}
