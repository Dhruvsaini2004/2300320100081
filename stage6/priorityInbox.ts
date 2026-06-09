/**
 * Priority Inbox Algorithm - Stage 6
 *
 * Finds the top n most important unread notifications.
 * Priority: placement > result > event, combined with recency.
 *
 * Usage: set ACCESS_TOKEN env var, then run with ts-node
 */

const API_URL = 'http://4.224.186.213/evaluation-service/notifications';

interface Notification {
  ID: string;
  Type: string;
  Message: string;
  Timestamp: string;
}

interface Scored {
  notification: Notification;
  score: number;
}

// priority weights by type
const WEIGHTS: Record<string, number> = {
  Placement: 100,
  Result: 50,
  Event: 10,
};

function score(n: Notification): number {
  const typeWeight = WEIGHTS[n.Type] || 0;
  const age = Date.now() - new Date(n.Timestamp).getTime();
  const hoursOld = age / (1000 * 60 * 60);
  // recency: newer = higher score, decays over 72 hours
  const recency = Math.max(0, 1 - hoursOld / 72);
  return typeWeight + recency * 50;
}

async function fetchAll(): Promise<Notification[]> {
  const token = process.env.ACCESS_TOKEN;
  if (!token) throw new Error('ACCESS_TOKEN not set');

  const all: Notification[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(`${API_URL}?limit=100&page=${page}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json() as { notifications: Notification[] };
    if (!data.notifications || data.notifications.length === 0) break;
    all.push(...data.notifications);
    page++;
  }

  return all;
}

function topN(notifications: Notification[], n: number): Scored[] {
  return notifications
    .map((n) => ({ notification: n, score: score(n) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

/*
 * Maintaining the top 10 efficiently as new notifications arrive:
 *
 * Instead of re-sorting all notifications each time, use a min-heap
 * of size 10. For each new notification, compute its score.
 * If the heap has fewer than 10 items, push it in.
 * If the new score is higher than the heap's minimum, pop the min
 * and push the new one. This gives O(log 10) = O(1) per insertion
 * instead of O(n log n) for a full sort.
 */

// simple min-heap for demonstration
class MinHeap {
  items: Scored[] = [];

  push(item: Scored) {
    this.items.push(item);
    this.items.sort((a, b) => a.score - b.score);
  }

  pop(): Scored | undefined {
    return this.items.shift();
  }

  peek(): Scored | undefined {
    return this.items[0];
  }

  get size() {
    return this.items.length;
  }

  get sorted(): Scored[] {
    return [...this.items].sort((a, b) => b.score - a.score);
  }
}

function maintainTopN(
  existing: Scored[],
  incoming: Notification[],
  n: number
): Scored[] {
  const heap = new MinHeap();

  for (const item of existing) {
    heap.push(item);
  }

  for (const notification of incoming) {
    const s = score(notification);
    if (heap.size < n) {
      heap.push({ notification, score: s });
    } else if (s > heap.peek()!.score) {
      heap.pop();
      heap.push({ notification, score: s });
    }
  }

  return heap.sorted;
}

async function main() {
  const notifications = await fetchAll();
  console.log(`Fetched ${notifications.length} notifications`);

  const top10 = topN(notifications, 10);

  console.log('\nTop 10 priority notifications:\n');
  top10.forEach((item, i) => {
    const n = item.notification;
    console.log(
      `${i + 1}. [${n.Type}] ${n.Message} (${new Date(n.Timestamp).toLocaleString()}) score: ${item.score.toFixed(2)}`
    );
  });

  console.log('\n--- Efficiency analysis ---');
  console.log('Full sort approach: O(n log n) for all notifications');
  console.log('Min-heap approach: O(log n) per new notification');
  console.log('For 50k students x 5M notifications, maintaining a heap');
  console.log('of top 10 means each new notification is O(1) to process.');
}

main().catch(console.error);

export { score, topN, maintainTopN };
