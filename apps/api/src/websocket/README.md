# WebSocket Real-Time Enrichment Updates

This directory contains the WebSocket implementation for real-time enrichment status updates.

## Architecture Overview

```
┌─────────────┐         WebSocket          ┌──────────────┐
│   Frontend  │◄──────────────────────────►│   Socket.IO  │
│   Client    │      (enrichment:updates)  │   Server     │
└─────────────┘                            └──────┬───────┘
                                                  │
                                                  │ Redis Pub/Sub
                                                  │
                ┌─────────────────────────────────┴────────────┐
                │                                              │
         ┌──────▼───────┐                             ┌───────▼──────┐
         │  Server 1    │                             │  Server 2    │
         │  (Worker)    │                             │  (Worker)    │
         └──────────────┘                             └──────────────┘
```

## Files

### `server.ts`
- Creates Socket.IO server with HTTP server
- Configures Redis adapter for horizontal scaling
- Implements Clerk JWT authentication middleware
- Handles connection/disconnection events

### `enrichment-namespace.ts`
- Sets up `/enrichment` namespace for enrichment-specific events
- Manages room subscriptions (`enrichment:${userPlaceId}`)
- Handles `subscribe`/`unsubscribe` events
- Sends initial status on subscription
- Periodic cleanup of empty rooms (every 5 minutes)

### `redis-subscriber.ts`
- Subscribes to Redis pub/sub channels (`enrichment:updates:*`)
- Relays updates from Redis to WebSocket clients
- Enables multi-server deployments (horizontal scaling)

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

## Multi-Server Support

Uses Redis pub/sub for cross-server communication:

1. Worker publishes update to Redis: `enrichment:updates:${userPlaceId}`
2. All server instances subscribe to pattern: `enrichment:updates:*`
3. Each server relays update to its connected WebSocket clients
4. Socket.IO Redis adapter handles room synchronization

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
- `redis_pubsub_relay`: Cross-server updates
- `enrichment_websocket_subscribe`: Client subscriptions
- `enrichment_websocket_room_cleanup`: Empty room removal

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
- Check Redis connection
- Verify `setEnrichmentNamespace()` called
- Ensure worker publishes to Redis pub/sub
- Check room subscription: `socket.rooms`

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

1. **Compression**: Enable Socket.IO compression for large payloads
2. **Batching**: Batch multiple status updates into single message
3. **Metrics**: Expose Prometheus metrics endpoint
4. **Rate Limiting**: Per-client rate limits for events
5. **Clustering**: Use sticky sessions for better performance
