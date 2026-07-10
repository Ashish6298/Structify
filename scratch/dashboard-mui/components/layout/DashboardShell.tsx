import React from 'react';
import { Box, Container, Typography, Stack } from '@mui/material';

type DashboardShellProps = {
  children: React.ReactNode;
};

export default function DashboardShell({ children }: DashboardShellProps) {
  const childrenArray = React.Children.toArray(children);
  const sidebar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Sidebar'
  );
  const topbar = childrenArray.find(
    (child) => React.isValidElement(child) && (child.type as { name?: string }).name === 'Topbar'
  );
  const mainContent = childrenArray.filter(
    (child) =>
      !React.isValidElement(child) ||
      (((child.type as { name?: string }).name !== 'Sidebar' &&
        (child.type as { name?: string }).name !== 'Topbar'))
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: '100vh', bgcolor: '#f8fafc', width: '100%' }}>
      {sidebar}
      <Box sx={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {topbar}
        <Box component="main" sx={{ flexGrow: 1, p: 4, width: '100%', maxWidth: 1600, mx: 'auto', boxSizing: 'border-box' }}>
          <Stack spacing={3}>
            {mainContent}
          </Stack>
        </Box>
        <Container maxWidth="md" sx={{ py: 4, borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ opacity: 0.5 }}>Built with Structify. Replace this starter content with your own production copy.</Typography>
        </Container>
      </Box>
    </Box>
  );
}
