import {  Box, Container } from '@mui/material';
import { Outlet } from 'react-router-dom';
import { TopBar } from './TopBar';
import { SideBar } from './SideBar';
import { Banner } from './Banner';

export function Layout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Banner />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <SideBar />
        <Box component="main" flexGrow={1}>
          <TopBar />
          <Container maxWidth={false} sx={{ marginTop: '1rem' }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
