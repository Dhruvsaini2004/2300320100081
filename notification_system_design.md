# Notification System Design

## Stage 1 — API Design

### Core Actions
- Fetch notifications with filters (type, read status)
- Mark individual notifications as read
- View unread count
- Sync notifications from external API
- Receive real-time updates

### REST Endpoints

| Method | Endpoint | Description | Headers |
|--------|----------|-------------|---------|
| GET | /notifications | List notifications | Authorization: Bearer |
| GET | /notifications/unread-count | Get unread count | Authorization: Bearer |
| PATCH | /notifications/:id/read | Mark as read | Authorization: Bearer |
| POST | /notifications/sync | Sync from source | Authorization: Bearer |
| GET | /notifications/stream | SSE real-time stream | Authorization: Bearer |

### GET /notifications

**Query params:** `limit`, `page`, `notification_type`, `isRead`

**Response:**
```json
{
  "notifications": [
    {
      "_id": "664a1b2c...",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "timestamp": "2026-04-22T17:51:18.000Z",
      "isRead": false
    }
  ],
  "total": 42
}
```

### PATCH /notifications/:id/read

**Response:**
```json
{
  "_id": "664a1b2c...",
  "type": "Placement",
  "message": "CSX Corporation hiring",
  "timestamp": "2026-04-22T17:51:18.000Z",
  "isRead": true
}
```

### POST /notifications/sync

**Response:**
```json
{ "message": "synced" }
```

### Real-time Mechanism — Server-Sent Events

**Why SSE over alternatives:**

| Mechanism | Pros | Cons |
|-----------|------|------|
| SSE | Simple, auto-reconnect, works over HTTP/1.1, one-direction | No client-to-server messaging |
| WebSockets | Full duplex | More complex, needs ws library, firewall issues |
| Polling | Simplest to implement | Wastes bandwidth, high latency |

SSE is chosen because notifications are server-to-client only. Browsers handle reconnection automatically. No extra dependencies beyond Express.

**SSE endpoint:** `GET /notifications/stream`

The server pushes new notifications as they arrive. Client connects with `EventSource`.

---

## Stage 2 — Database Design

### Choice: MongoDB (NoSQL)

**Why MongoDB:**

| Factor | Decision |
|--------|----------|
| Schema flexibility | Notifications have a fixed schema, but types may evolve |
| Read-heavy workload | Notifications are read far more often than written |
| Document model | Each notification is a self-contained document |
| Scalability | Sharding by studentID is straightforward |
| Aggregation | Powerful pipeline for priority scoring |

### Schema

```javascript
{
  _id: ObjectId,
  externalId: String (unique, indexed),
  type: String ("Event" | "Result" | "Placement"),
  message: String,
  timestamp: Date (indexed),
  isRead: Boolean (indexed, default: false),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes:**
- `{ externalId: 1 }` — unique, for dedup during sync
- `{ type: 1, timestamp: -1 }` — common query pattern
- `{ isRead: 1 }` — unread count queries

### Data Volume Problems (50K students, 5M notifications)

| Problem | Impact | Solution |
|---------|--------|----------|
| Full collection scan | Slow queries without proper indexes | Add compound indexes |
| Write amplification | Many students syncing at once | Batch writes, rate limit |
| Stale data | Old notifications rarely accessed | TTL index or archival |
| Memory pressure | Working set exceeds RAM | Increase RAM or shard |

### NoSQL Queries

Fetch unread notifications for a type:
```javascript
db.notifications.find({ type: "Placement", isRead: false }).sort({ timestamp: -1 }).limit(20)
```

Mark as read:
```javascript
db.notifications.updateOne({ _id: ObjectId("...") }, { $set: { isRead: true } })
```

Unread count:
```javascript
db.notifications.countDocuments({ isRead: false })
```

---

## Stage 3 — Query Optimization

**Slow query given:**
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### 1. Is the query accurate?

Yes, the query is syntactically correct. It fetches all unread notifications for a specific student sorted oldest-first.

### 2. Why is it slow?

- No index on `(studentID, isRead, createdAt)` — the database does a full table scan
- `SELECT *` fetches all columns even if only a few are needed
- `ORDER BY createdAt ASC` without an index requires a sort pass
- With 5M rows and 50K students, scanning the entire table is expensive (~5M rows read per query)

### 3. What would you change and what is the likely computation cost?

**Change:** Add a composite index:
```sql
CREATE INDEX idx_student_read_date ON notifications (studentID, isRead, createdAt);
```

**Cost before:** O(n) full scan — ~5M rows examined, ~50ms–500ms per query depending on hardware.

**Cost after:** O(log n) index lookup — ~10–50 rows examined, <5ms per query. The index stores (studentID, isRead, createdAt) in a B-tree. The query uses the index to jump directly to `studentID=1042 AND isRead=false`, then reads in sorted order (no extra sort).

**Additional improvement:** Replace `SELECT *` with only needed columns to reduce IO.

### 4. Is "add indexes on every column" effective? Why/why not?

**No.** Indexes have tradeoffs:

| Cost | Detail |
|------|--------|
| Write overhead | Every INSERT/UPDATE must update all indexes |
| Storage | Each index consumes disk space |
| Memory | Indexes must fit in RAM for best performance |

Instead of indexing everything, analyze query patterns and create targeted compound indexes. For this system, 3–4 well-chosen indexes are sufficient.

### 5. Query: Find students with Placement notification in last 7 days

```sql
SELECT DISTINCT studentID
FROM notifications
WHERE notificationType = 'Placement'
  AND createdAt >= NOW() - INTERVAL 7 DAY;
```

---

## Stage 4 — Caching / Performance

### Problem
Notifications are fetched on every page load for every student, overwhelming the DB.

### Solutions

#### 1. In-Memory Cache (Redis / Node.js in-memory)

**How:** Store the most recent notifications in Redis with a TTL of 30–60 seconds. On page load, serve from cache if available.

**Improvement:** Reduces DB reads by 90%+ for repeat visits. Responses in <5ms instead of 50ms+.

**Tradeoffs:**
- Stale data: notifications up to 60 seconds old
- Memory usage: 5MB for 10K notifications
- Cache invalidation: must clear on new notification

#### 2. Client-Side Caching (ETag / Last-Modified)

**How:** Set `ETag` header on notification responses. Browser sends `If-None-Match` on next request. Server returns `304 Not Modified` if data unchanged.

**Improvement:** Saves bandwidth and server CPU for unchanged data.

**Tradeoffs:**
- Only helps returning users
- Requires server to compute ETag (hash of response)

#### 3. Pagination + Lazy Loading

**How:** Fetch only 20 notifications at a time. Load more on scroll.

**Improvement:** Reduces per-query cost by limiting result set.

**Tradeoffs:**
- More round trips to server
- Slightly more complex UI

### Recommended Strategy
Combine all three: Redis cache with 30s TTL + ETag headers + pagination. This handles the 50K student load with minimal infrastructure.

---

## Stage 5 — Bulk Notification Reliability

### Scenario
HR clicks "Notify All" — 50,000 students need email + in-app notification simultaneously.

### Broken Pseudocode
```
function notify_all(student_ids: array, message: string):
    for student_id in student_ids:
        send_email(student_id, message)   # calls Email API
        save_to_db(student_id, message)   # DB insert
        push_to_app(student_id, message)  # real-time mechanism
```

### 1. Shortcomings

| Problem | Impact |
|---------|--------|
| Sequential processing | 50K × 3 operations = 150K sequential calls, takes hours |
| No error handling | One failure stops everything |
| No retry mechanism | Failed emails are lost |
| No idempotency | Duplicate execution sends duplicate emails |
| Mixed concerns | Email and DB insert in same loop — DB lag blocks emails |

### 2. send_email failed for 200 students — what now?

In the current code, those 200 students silently miss their email. The remaining students continue. There is no record of failures.

**Fix:** Log failed student IDs to a retry queue. A background job retries them 3 times with exponential backoff.

### 3. Redesigned reliable and fast approach

```
function notify_all(student_ids, message):
    # Step 1: Insert all notifications to DB in bulk
    batch_insert(student_ids, message)
    
    # Step 2: Enqueue email jobs to message queue (RabbitMQ / SQS)
    for student_id in student_ids:
        email_queue.enqueue({ to: student_id, message })
    
    # Step 3: Push real-time notifications via SSE fan-out
    broadcast_to_all(message)
    
    # Step 4: Background workers process email queue
    # Workers retry failed emails up to 3 times
```

**Why this is better:**
- Bulk DB insert (single query) vs 50K individual inserts
- Async email via queue — doesn't block notification delivery
- Failed emails are retried automatically
- SSE broadcast is O(1) instead of O(n)

### 4. Should saving to DB and sending email be in the same transaction?

**No.** They serve different reliability requirements:
- DB save is internal and fast — can be in a transaction
- Email API call is external and slow — holding a transaction open for 50K API calls would lock the database

**Better approach:** DB save first (transactional). Enqueue email jobs separately (eventual consistency). If email fails, the notification is still visible in-app. A retry mechanism handles the email later.

### Revised Pseudocode

```
function notify_all(student_ids, message):
    # bulk insert — single operation
    db.notifications.insert_many(
        [{ studentID: sid, message, type: "Placement", createdAt: now() }
         for sid in student_ids]
    )
    
    # async email — fast, non-blocking
    for batch in chunks(student_ids, 100):
        email_queue.send(batch, message)
    
    # SSE broadcast to all connected clients
    sse_server.broadcast({ type: "Placement", message })
    
    # log completion
    Log("backend", "info", "service", "notify_all completed")
```

---

## Stage 6 — Priority Inbox Algorithm

### Approach

Priority is computed as a weighted score combining notification type importance and recency:

```
score = typeWeight * 0.6 + recencyScore * 0.4
```

| Type | Weight |
|------|--------|
| Placement | 100 |
| Result | 50 |
| Event | 10 |

Recency score decays from 1.0 (now) to 0.0 (72 hours old).

### Top N Selection

Full sort every time: O(n log n). Acceptable for small n.

### Maintaining Top 10 Efficiently

As new notifications arrive, use a **min-heap of size 10**:

1. Compute score for new notification
2. If heap has < 10 items, push it
3. If score > heap minimum, pop min, push new
4. O(log 10) = O(1) per insertion

### Implementation

See `stage6/priorityInbox.ts` — standalone TypeScript script that:
- Fetches from the Notifications API (no hardcoding, no DB)
- Scores and sorts
- Exports `topN()` and `maintainTopN()` functions
