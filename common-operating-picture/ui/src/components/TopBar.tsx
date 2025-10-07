import { AppBar, Avatar, Menu, MenuItem, Toolbar, Typography, IconButton, Divider, Stack } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function TopBar() {
  const { user, signOut } = useAuth();
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);
  const accountMenuOpen = Boolean(accountMenuAnchor);

  // Build initials from the user name if they have one
  const initials = user?.name ? user.name
    .split(' ')
    .map((i) => i[0])
    .join('') : '';

  const handleClick = (
    event: React.MouseEvent<HTMLButtonElement>, 
    anchorSetter: React.Dispatch<React.SetStateAction<HTMLElement | null>>,
  ) => {
    anchorSetter(event.currentTarget);
  };

  const handleClose = (
    anchorSetter: React.Dispatch<React.SetStateAction<HTMLElement | null>>,
  ) => {
    anchorSetter(null);
  };

  return (
    <>
      <AppBar position="relative">
        <Toolbar sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <IconButton onClick={e => handleClick(e, setAccountMenuAnchor)}>
            <Avatar sx={{ bgcolor: 'white', textTransform: 'uppercase' }}>{initials}</Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={accountMenuAnchor} open={accountMenuOpen} onClose={() => handleClose(setAccountMenuAnchor)}>
        <MenuItem sx={{ cursor: 'default' }}>
          <Stack>
            <Typography variant="h6" sx={{ textTransform: 'capitalize' }}>{user?.name}</Typography>
            <Typography>{user?.email}</Typography>
          </Stack>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
            signOut();
            handleClose(setAccountMenuAnchor);
          }}>Logout</MenuItem>
      </Menu>
    </>
  );
}
