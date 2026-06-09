import { Box, Typography, CircularProgress } from '@mui/material';
import NotificationCard from '../components/NotificationCard';
import { Notification } from '../types';

interface Props {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
}

export default function AllNotifications({ notifications, loading, onMarkAsRead }: Props) {
  if (loading) return <CircularProgress />;

  if (notifications.length === 0) {
    return <Typography>No notifications found.</Typography>;
  }

  const unread = notifications.filter((n) => !n.isRead);
  const read = notifications.filter((n) => n.isRead);

  return (
    <Box>
      {unread.length > 0 && (
        <Box mb={2}>
          <Typography variant="subtitle2" color="primary" mb={1}>
            New ({unread.length})
          </Typography>
          {unread.map((n) => (
            <NotificationCard key={n._id} notification={n} onMarkAsRead={onMarkAsRead} />
          ))}
        </Box>
      )}
      {read.length > 0 && (
        <Box>
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            Viewed ({read.length})
          </Typography>
          {read.map((n) => (
            <NotificationCard key={n._id} notification={n} onMarkAsRead={onMarkAsRead} />
          ))}
        </Box>
      )}
    </Box>
  );
}
