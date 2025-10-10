# WebSocket Real-Time Enrichment Updates

This directory contains the WebSocket implementation for real-time enrichment status updates.

## ⚠️ Current Architecture: Single-Server Mode

**IMPORTANT**: Currently running in **single-server mode** without Redis pub/sub. This works perfectly for our current single-server deployment but will need migration when scaling horizontally.

### Current Architecture

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   Frontend  │◄──────────────────────────►│   Socket.IO  │
│   Client    │      (enrichment:updates)  │   Server     │
└─────────────┘                            └──────┬───────┘
                                                  │
                                          In-Memory Direct Access
                                                  │
                                         ┌────────▼────────┐
                                         │  Single Server  │
                                         │  + BullMQ Worker│
                                         └─────────────────┘
```

**Why this works now:**
- BullMQ workers and WebSocket server run in the same Node.js process
- Direct memory access to `enrichmentNamespace` global variable
- No cross-server communication needed

**Limitations:**
- Cannot horizontally scale (limited to 1 server)
- Single point of failure
- ~10K concurrent WebSocket connection limit

## Files

### `server.ts`
- Creates Socket.IO server with HTTP server
- Implements Clerk JWT authentication middleware
- Handles connection/disconnection events
- **Note**: Redis adapter currently disabled (single-server mode)

### `enrichment-namespace.ts`
- Sets up `/enrichment` namespace for enrichment-specific events
- Manages room subscriptions (`enrichment:${userPlaceId}`)
- Handles `subscribe`/`unsubscribe` events
- Sends initial status on subscription
- Includes room cleanup logic (can be removed - Socket.IO handles this automatically)

## Events

### Client → Server

#### `subscribe`
Subscribe to enrichment status updates for a specific place.

**Payload**: `userPlaceId` (string, UUID)

**Response**: Immediate `status-update` with current status

```typescript
socket.emit('subscribe', userPlaceId)
```

#### `unsubscribe`
Unsubscribe from enrichment status updates.

**Payload**: `userPlaceId` (string, UUID)

```typescript
socket.emit('unsubscribe', userPlaceId)
```

### Server → Client

#### `status-update`
Real-time status update for an enrichment.

**Payload**:
```typescript
{
  userPlaceId: string
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed'
  step: string
  progress: number // 0-100
  updatedAt: number // Unix timestamp
  error?: string
  jobId?: string
}
```

#### `error`
Error notification (e.g., invalid UUID format).

**Payload**:
```typescript
{
  message: string
  code?: string
}
```

## Authentication

WebSocket connections require Clerk JWT authentication:

1. Frontend obtains token via `getToken()` from Clerk
2. Token passed in `socket.handshake.auth.token`
3. Backend verifies token with `clerkClient.verifyToken()`
4. Clerk user ID stored in `socket.data.userId`

## Room Management

Each enrichment has its own room: `enrichment:${userPlaceId}`

- Clients join room via `subscribe` event
- All updates for that enrichment broadcast to room
- Automatic cleanup of empty rooms every 5 minutes

## 🚀 Future: Multi-Server Support (Not Yet Implemented)

**When to migrate**: When you need to scale beyond 1 server (multiple instances, zero-downtime deploys, >10K connections)

**Migration plan** for Redis pub/sub:

### Architecture (Future State)

```
                      ┌─────────────────┐
                      │   Load Balancer │
                      └────────┬────────┘
                               │
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │  Server A    │  │  Server B    │  │  Server C    │
      │   ↑      ↓   │  │   ↑      ↓   │  │   ↑      ↓   │
      │   └──────┘   │  │   └──────┘   │  │   └──────┘   │
      └───────┬──────┘  └───────┬──────┘  └───────┬──────┘
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ↓
                      ┌─────────────────┐
                      │  Redis Pub/Sub  │
                      │  (Message Bus)  │
                      └─────────────────┘
                                ↑
                                │
                      ┌─────────▼─────────┐
                      │  BullMQ Workers   │
                      └───────────────────┘
```

### Implementation Steps

**1. Fix Redis ACL Permissions**
```bash
# Connect to Redis
redis-cli

# Grant pub/sub permissions
ACL SETUSER your-app-user +@pubsub
```

**2. Enable Socket.IO Redis Adapter**
```typescript
// apps/api/src/websocket/server.ts
import { createAdapter } from '@socket.io/redis-adapter'

export const createWebSocketServer = (httpServer: HTTPServer) => {
  const io = new SocketIOServer(httpServer, { /* ... */ })

  // Add Redis adapter for horizontal scaling
  const pubClient = redisClient.duplicate()
  const subClient = redisClient.duplicate()
  io.adapter(createAdapter(pubClient, subClient))

  // ... rest of code
}
```

**3. No Code Changes Needed!**
The existing `enrichmentNamespace.to(room).emit()` calls will automatically work across servers once the adapter is enabled.

**Benefits:**
- Horizontal scaling (N servers)
- High availability (no single point of failure)
- Zero-downtime deploys
- Support 100K+ concurrent connections

## Performance Considerations

### Connection Limits
- Default Node.js: ~1024 sockets
- Increase with: `ulimit -n 10000`
- Monitor with: `enrichmentNs.sockets.size`

### Memory Management
- Each socket: ~10KB memory
- 10,000 connections: ~100MB
- Empty room cleanup runs every 5 minutes
- Disconnect handlers clean up immediately

### Network Bandwidth
- Status update: ~200 bytes
- 100 active enrichments: ~20KB/s
- 1000 active enrichments: ~200KB/s

## Monitoring

### Metrics to Track
- Active connections: `enrichmentNs.sockets.size`
- Active rooms: `enrichmentNs.adapter.rooms.size`
- Redis pub/sub messages/sec
- WebSocket message latency

### Logs to Monitor
- `websocket_auth_failed`: Authentication issues
- `enrichment_websocket_subscribe`: Client subscriptions
- `enrichment_batch_emit`: Batched status updates
- `enrichment_terminal_status_emit`: Immediate completion/failure events

## Testing

### Manual Testing
```bash
# Start server
pnpm dev

# In browser console
const socket = io('http://localhost:3030/enrichment', {
  auth: { token: 'your-clerk-jwt' }
})

socket.on('connect', () => {
  console.log('Connected:', socket.id)
  socket.emit('subscribe', 'user-place-id')
})

socket.on('status-update', (data) => {
  console.log('Status update:', data)
})
```

### Load Testing
```bash
# Install artillery
npm install -g artillery

# Create test config
artillery quick --count 100 --num 10 ws://localhost:3030/enrichment
```

## Troubleshooting

### "Authentication failed"
- Verify `CLERK_JWT_KEY` env variable
- Check token is valid (not expired)
- Ensure token passed in `auth.token`

### "No status updates received"
- Verify `setEnrichmentNamespace()` called in `index.ts`
- Check that worker is in same process as WebSocket server
- Check room subscription: `socket.rooms`
- Verify enrichment status is being set via `setEnrichmentStatus()`

### "High memory usage"
- Check for memory leaks: `process.memoryUsage()`
- Verify empty rooms cleaned up
- Monitor socket count: `io.sockets.sockets.size`

### "Connection drops frequently"
- Increase `pingTimeout` (default: 60s)
- Check network stability
- Monitor `disconnect` event reasons

## Environment Variables

```bash
# Frontend (.env)
VITE_WS_BASE_URL=http://localhost:3030

# Backend (.env)
CLERK_JWT_KEY=your-clerk-jwt-key
FRONTEND_URL=http://localhost:5173
REDIS_URL=redis://localhost:6379
```

## Migration from Polling

The system uses **graceful degradation**:

1. WebSocket connects → real-time updates (<100ms latency)
2. WebSocket fails → falls back to HTTP polling (2-3s latency)
3. No code changes required in UI components

## Future Improvements

### High Priority (When Scaling)
1. **Multi-Server Support**: Enable Redis pub/sub adapter (see section above)
2. **Metrics**: Expose Prometheus metrics endpoint for monitoring
3. **Rate Limiting**: Per-client rate limits for subscribe/unsubscribe events

### Medium Priority
4. **Compression**: Enable Socket.IO compression for large payloads
5. **Sticky Sessions**: Use load balancer sticky sessions for better performance
6. **Monitoring Dashboard**: Real-time WebSocket connection visualization

### Low Priority
7. **Binary Protocol**: Use MessagePack instead of JSON for smaller payloads
8. **Connection Pooling**: Optimize Redis connection management
