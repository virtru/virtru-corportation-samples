import { ReactNode } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import { useDocTitle } from '@/hooks/useDocTitle';

interface Props{
  title: string;
  subContent?: ReactNode;
}

export function PageTitle({ title, subContent }: Props) {
  useDocTitle(title);

  const renderTitle = () => {
    if (!subContent) {
      return (
        <Typography variant="h3" gutterBottom>
          {title}
        </Typography>
      );
    }

    return (
      <Box display="flex" gap={2} alignItems="center">
        <Typography variant="h3" gutterBottom>
          {title}
        </Typography>
        {subContent}
      </Box>
    );
  };

  return (
    <>
      {renderTitle()}
      <Divider sx={{ marginBottom: 2 }} />
    </>
  );
}
