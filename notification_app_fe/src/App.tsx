import { useState, useEffect } from 'react';
import { Log } from 'logging-middleware';
import {
  CssBaseline, Container, AppBar, Toolbar, Typography, Tabs, Tab, Box,
  Grid, Card, CardContent, Badge, Button, CircularProgress, Snackbar, Alert
} from '@mui/material';
import SyncIcon from '@mui/icons-material/Sync';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AllNotifications from './pages/AllNotifications';
import PriorityNotifications from './pages/PriorityNotifications';
import { Notification } from './types';

function App() {
  const [tab, setTab] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/notifications?limit=50');
      const data = await res.json();
      setNotifications(data.notifications || []);
      Log('frontend', 'info', 'page', `Refetched ${data.notifications?.length || 0} notifications`);
    } catch (e: any) {
      Log('frontend', 'error', 'page', `Failed to fetch notifications: ${e.message}`);
    }
  };

  useEffect(() => {
    // 1. Fetch access token first so logging-middleware can use it
    fetch('/notifications/token')
      .then((res) => res.json())
      .then((data) => {
        (window as any).ACCESS_TOKEN = data.token;
        Log('frontend', 'info', 'page', 'Application started and token loaded');

        // 2. Fetch initial notifications
        return fetch('/notifications?limit=50');
      })
      .then((res) => {
        if (res) return res.json();
      })
      .then((data) => {
        if (data) {
          setNotifications(data.notifications || []);
          setLoading(false);
          Log('frontend', 'info', 'page', `Loaded ${data.notifications?.length || 0} notifications`);
        }
      })
      .catch((e: any) => {
        Log('frontend', 'error', 'page', `Failed to initialize app: ${e.message}`);
        setLoading(false);
      });

    // 3. Set up SSE connection
    const eventSource = new EventSource('/notifications/stream');
    eventSource.onmessage = (event) => {
      try {
        const newNotif = JSON.parse(event.data);
        setNotifications((prev) => {
          if (prev.some((n) => n._id === newNotif._id)) return prev;
          return [newNotif, ...prev];
        });
        Log('frontend', 'info', 'api', `SSE received new notification: ${newNotif.message}`);
      } catch (err: any) {
        Log('frontend', 'error', 'api', `SSE parse error: ${err.message}`);
      }
    };
    eventSource.onerror = () => {
      Log('frontend', 'error', 'api', 'SSE stream connection lost');
    };

    return () => {
      eventSource.close();
    };
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

  const handleSync = async () => {
    setSyncing(true);
    Log('frontend', 'info', 'page', 'manual sync triggered');
    try {
      const res = await fetch('/notifications/sync', { method: 'POST' });
      if (res.ok) {
        await fetchNotifications();
        setToast({ open: true, message: 'Synced latest notifications successfully!', severity: 'success' });
      } else {
        throw new Error(`API responded with status ${res.status}`);
      }
    } catch (e: any) {
      setToast({ open: true, message: `Sync failed: ${e.message}`, severity: 'error' });
      Log('frontend', 'error', 'page', `manual sync failed: ${e.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const placementCount = notifications.filter((n) => n.type === 'Placement').length;
  const resultCount = notifications.filter((n) => n.type === 'Result').length;
  const eventCount = notifications.filter((n) => n.type === 'Event').length;

  return (
    <>
      <CssBaseline />
      <AppBar position="sticky">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <NotificationsIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Campus Notification Hub
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            onClick={handleSync}
            disabled={syncing}
            startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '8px',
              px: 2,
            }}
          >
            {syncing ? 'Syncing...' : 'Sync'}
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md" sx={{ mt: 4, pb: 6 }}>
        <Box mb={2}>
          <Typography variant="h5" color="text.primary">
            Student Feed Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time updates for college placements, academic results, and campus events.
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ mb: 4, mt: 1 }}>
          <Grid item xs={6} sm={3}>
            <Card sx={{ background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.12) 0%, rgba(20, 18, 43, 0.4) 100%)' }}>
              <CardContent sx={{ py: '14px !important' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Unread</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mt: 0.5 }}>{unreadCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderLeft: '4px solid #3b82f6' }}>
              <CardContent sx={{ py: '14px !important' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Placements</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main', mt: 0.5 }}>{placementCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderLeft: '4px solid #10b981' }}>
              <CardContent sx={{ py: '14px !important' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Results</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', mt: 0.5 }}>{resultCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Card sx={{ borderLeft: '4px solid #f59e0b' }}>
              <CardContent sx={{ py: '14px !important' }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>Events</Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main', mt: 0.5 }}>{eventCount}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            mb: 3,
            '& .MuiTabs-indicator': {
              height: '3px',
              borderRadius: '3px 3px 0 0',
            }
          }}
        >
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1.5}>
                <span>All Feed</span>
                {unreadCount > 0 && (
                  <Badge
                    badgeContent={unreadCount}
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '0.68rem',
                        height: 18,
                        minWidth: 18,
                        fontWeight: 700,
                      }
                    }}
                  />
                )}
              </Box>
            }
          />
          <Tab label="Priority Inbox" />
        </Tabs>
        <Box>
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
      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%', borderRadius: '10px', fontWeight: 500 }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default App;
