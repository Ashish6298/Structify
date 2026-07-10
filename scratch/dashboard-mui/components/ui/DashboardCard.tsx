import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

type DashboardCardProps = {
  title: string;
  children: React.ReactNode;
};

export function DashboardCard({ title, children }: DashboardCardProps) {
  return (
    <Card
      variant="outlined"
      sx={{
        bgcolor: '#fff',
        borderColor: '#e2e8f0',
        borderRadius: 3,
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
        width: '100%',
        minWidth: 0,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="caption"
          sx={{
            color: '#94a3b8',
            textTransform: 'uppercase',
            fontWeight: 'bold',
            letterSpacing: 1,
          }}
        >
          {title}
        </Typography>
        <Box sx={{ mt: 2 }}>{children}</Box>
      </CardContent>
    </Card>
  );
}
