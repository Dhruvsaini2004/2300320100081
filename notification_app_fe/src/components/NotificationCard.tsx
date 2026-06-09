import { Card, CardContent, Typography, Chip, Box, IconButton } from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import WorkIcon from '@mui/icons-material/Work';
import SchoolIcon from '@mui/icons-material/School';
import EventIcon from '@mui/icons-material/Event';
import { Notification } from '../types';

const typeColors: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  Placement: 'info',
  Result: 'success',
  Event: 'warning',
};

const typeIcons: Record<string, React.ReactNode> = {
  Placement: <WorkIcon sx={{ fontSize: 14 }} />,
  Result: <SchoolIcon sx={{ fontSize: 14 }} />,
  Event: <EventIcon sx={{ fontSize: 14 }} />,
};

interface Props {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}

export default function NotificationCard({ notification, onMarkAsRead }: Props) {
  const icon = typeIcons[notification.type] || null;
  const chipColor = typeColors[notification.type] || 'default';

  return (
    <Card
      sx={{
        mb: 2,
        opacity: notification.isRead ? 0.6 : 1,
        borderLeft: 5,
        borderColor: notification.isRead ? 'rgba(255, 255, 255, 0.15)' : `${chipColor}.main`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: '14px !important' }}>
        <Box display="flex" flexDirection="column" gap={0.5}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Chip
              icon={icon as any}
              label={notification.type}
              color={chipColor}
              size="small"
              sx={{
                fontWeight: 600,
                fontSize: '0.72rem',
                borderRadius: '6px',
                height: 22,
                '& .MuiChip-icon': {
                  color: 'inherit',
                }
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>
              {new Date(notification.timestamp).toLocaleString()}
            </Typography>
          </Box>
          <Typography variant="body1" sx={{ mt: 0.5, fontWeight: notification.isRead ? 400 : 500, color: notification.isRead ? 'text.secondary' : 'text.primary' }}>
            {notification.message}
          </Typography>
        </Box>
        {!notification.isRead && (
          <IconButton 
            onClick={() => onMarkAsRead(notification._id)} 
            size="small"
            color="primary"
            sx={{
              backgroundColor: 'rgba(167, 139, 250, 0.1)',
              '&:hover': {
                backgroundColor: 'rgba(167, 139, 250, 0.2)',
                transform: 'scale(1.08)',
              },
              transition: 'all 0.2s',
            }}
          >
            <MarkEmailReadIcon fontSize="small" />
          </IconButton>
        )}
      </CardContent>
    </Card>
  );
}
