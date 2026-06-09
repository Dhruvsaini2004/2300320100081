import { useState, useMemo } from 'react';
import {
  Box, Typography, CircularProgress, TextField, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import NotificationCard from '../components/NotificationCard';
import { Notification } from '../types';

interface Props {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => void;
}

const typeWeight: Record<string, number> = { Placement: 3, Result: 2, Event: 1 };

function score(n: Notification): number {
  const typeScore = typeWeight[n.type] || 0;
  const ageHours = (Date.now() - new Date(n.timestamp).getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 1 - ageHours / 72);
  return typeScore * 0.6 + recencyScore * 0.4;
}

export default function PriorityNotifications({ notifications, loading, onMarkAsRead }: Props) {
  const [topN, setTopN] = useState(10);
  const [filterType, setFilterType] = useState('');

  const filtered = useMemo(() => {
    let list = notifications.filter((n) => !n.isRead);
    if (filterType) list = list.filter((n) => n.type === filterType);
    return list.sort((a, b) => score(b) - score(a)).slice(0, topN);
  }, [notifications, topN, filterType]);

  if (loading) return <CircularProgress />;

  if (notifications.length === 0) {
    return <Typography>No notifications found.</Typography>;
  }

  return (
    <Box>
      <Box display="flex" gap={2} mb={2}>
        <TextField
          label="Top N"
          type="number"
          size="small"
          value={topN}
          onChange={(e) => setTopN(parseInt(e.target.value) || 10)}
          sx={{ width: 100 }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Type</InputLabel>
          <Select value={filterType} label="Type" onChange={(e) => setFilterType(e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="Placement">Placement</MenuItem>
            <MenuItem value="Result">Result</MenuItem>
            <MenuItem value="Event">Event</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {filtered.length === 0 ? (
        <Typography>No unread notifications match the criteria.</Typography>
      ) : (
        filtered.map((n) => (
          <NotificationCard key={n._id} notification={n} onMarkAsRead={onMarkAsRead} />
        ))
      )}
    </Box>
  );
}
