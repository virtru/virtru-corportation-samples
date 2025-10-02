import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, ListSubheader, Typography } from '@mui/material';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { pages } from '@/components/Router/config';

const Logo = styled.img`
  width: 125px;
`;

export function SideBar() {
  const navigate = useNavigate();

  return (
    <Drawer variant="permanent" PaperProps={{
      sx: { position: 'relative', width: '250px' },
    }}>
      <List component="nav">
        <ListItemButton onClick={() => navigate('/')} sx={{ justifyContent: 'center' }}>
          <Logo src="/img/virtru_Logo_WhiteBlue.png" alt="Virtru" />
          <Typography variant="h6" ml={1}>| COP</Typography>
        </ListItemButton>
        <ListSubheader sx={{ paddingLeft: '1.5rem', paddingTop: '1.5rem', lineHeight: '1' }}>
          <Typography sx={{ fontSize: '95%' }}>
            MENU
          </Typography>
        </ListSubheader>
        {pages.map((p) => (
          <ListItemButton key={p.name} onClick={() => navigate(p.path)} sx={{ paddingLeft: '1.75rem' }}>
            <ListItemIcon sx={{ minWidth: '35px' }}><p.icon /></ListItemIcon>
            <ListItemText primary={p.name} />
          </ListItemButton>
        ))}
      </List>
      <Typography mt="auto" p="1rem" textAlign="center" fontSize="90%">
        &copy; {new Date().getFullYear()} - Virtru Corporation
      </Typography>
    </Drawer>
  );
}
