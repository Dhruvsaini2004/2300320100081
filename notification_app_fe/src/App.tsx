import { useState, useEffect } from 'react';
import { Log } from './logger';
import { CssBaseline, Container, AppBar, Toolbar, Typography, Tabs, Tab, Box } from '@mui/material';
import AllNotifications from './pages/AllNotifications';
import PriorityNotifications from './pages/PriorityNotifications';
import { Notification } from './types';

function App() {
  const [tab, setTab] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/notifications?limit=50')
      .then((res) => res.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setLoading(false);
        Log('frontend', 'info', 'page', `loaded ${data.notifications?.length || 0} notifications`);
      })
      .catch((e: any) => {
        Log('frontend', 'error', 'page', `failed to load: ${e.message}`);
        setLoading(false);
      });
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/notifications/${id}/read`, { method: 'PATCH' });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      Log('frontend', 'info', 'page', `marked ${id} as read`);
    } catch (e: any) {
      Log('frontend', 'error', 'page', `mark read failed: ${e.message}`);
    }
  };

  return (
    <>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6">Campus Notifications</Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="All Notifications" />
          <Tab label="Priority" />
        </Tabs>
        <Box sx={{ mt: 2 }}>
          {tab === 0 && (
            <AllNotifications
              notifications={notifications}
              loading={loading}
              onMarkAsRead={markAsRead}
            />
          )}
          {tab === 1 && (
            <PriorityNotifications
              notifications={notifications}
              loading={loading}
              onMarkAsRead={markAsRead}
            />
          )}
        </Box>
      </Container>
    </>
  );
}

export default App;
