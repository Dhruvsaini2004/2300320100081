import { Card, CardContent, Typography, Chip, Box, IconButton } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { Notification } from '../types';

const typeColors: Record<string, string> = {
  Placement: 'primary',
  Result: 'success',
  Event: 'warning',
};

interface Props {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export default function NotificationCard({ notification, onMarkAsRead }: Props) {
  return (
    <Card
      sx={{
        mb: 1,
        opacity: notification.isRead ? 0.7 : 1,
        borderLeft: 4,
        borderColor: notification.isRead ? 'grey.300' : 'primary.main',
      }}
    >
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Chip
            label={notification.type}
            color={(typeColors[notification.type] as any) || 'default'}
            size="small"
            sx={{ mb: 1 }}
          />
          <Typography variant="body1">{notification.message}</Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(notification.timestamp).toLocaleString()}
          </Typography>
        </Box>
        {!notification.isRead && (
          <IconButton onClick={() => onMarkAsRead(notification._id)} size="small">
            <MarkEmailReadIcon />
          </IconButton>
        )}
      </CardContent>
    </Card>
  );
}
