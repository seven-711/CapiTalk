/**
 * CapiTalk WebSocket Matchmaking & Chat Server
 * Runs on port 4000 alongside Next.js (port 3000)
 * Handles: queue join/leave, matchmaking, chat relay, typing, skip signals
 */

const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 4000;
const wss = new WebSocketServer({ port: PORT });

// Map: userId -> { ws, user, filter, joinedAt }
const queue = new Map();
// Map: userId -> { ws, roomId, partnerId }
const rooms = new Map();
// Map: roomId -> Set<userId>
const roomMembers = new Map();
// Set of all connected websockets (for online count)
const allClients = new Set();

function broadcastOnlineCount() {
  const count = allClients.size;
  const msg = JSON.stringify({ type: 'ONLINE_COUNT', count });
  allClients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(msg);
    }
  });
}

function send(ws, data) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function broadcastToRoom(roomId, senderId, data) {
  const members = roomMembers.get(roomId);
  if (!members) return;
  members.forEach((uid) => {
    const info = rooms.get(uid);
    if (info && uid !== senderId) {
      send(info.ws, data);
    }
  });
}

function tryMatchInQueue() {
  const entries = Array.from(queue.values());

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];

      // Validate both websockets are still live and open
      if (!a.ws || a.ws.readyState !== 1) {
        queue.delete(a.user.id);
        continue;
      }
      if (!b.ws || b.ws.readyState !== 1) {
        queue.delete(b.user.id);
        continue;
      }

      // Check bidirectional blocked lists
      const aBlockedB = Array.isArray(a.blockedUserIds) && a.blockedUserIds.includes(b.user.id);
      const bBlockedA = Array.isArray(b.blockedUserIds) && b.blockedUserIds.includes(a.user.id);

      if (aBlockedB || bBlockedA) {
        console.log(`[Queue] Skipped match between ${a.user.username} and ${b.user.username} due to active block.`);
        continue;
      }

      const aMatchesB = filterMatches(a.filter, a.user, b.user);
      const bMatchesA = filterMatches(b.filter, b.user, a.user);

      if (aMatchesB && bMatchesA) {
        // Remove from queue
        queue.delete(a.user.id);
        queue.delete(b.user.id);

        const roomId = 'room_' + Math.random().toString(36).substring(2, 9);

        // Register room members
        roomMembers.set(roomId, new Set([a.user.id, b.user.id]));
        rooms.set(a.user.id, { ws: a.ws, roomId, partnerId: b.user.id });
        rooms.set(b.user.id, { ws: b.ws, roomId, partnerId: a.user.id });

        const matchPayload = {
          type: 'MATCH_FOUND',
          roomId,
          userOne: a.user,
          userTwo: b.user,
        };

        send(a.ws, matchPayload);
        send(b.ws, matchPayload);

        console.log(`[Match] ${a.user.username} <-> ${b.user.username} | Room: ${roomId}`);
        return;
      }
    }
  }
}

function filterMatches(filter, myUser, theirUser) {
  if (filter === 'anyone') return true;
  if (filter === 'same') return myUser.department === theirUser.department;
  if (filter === 'different') return myUser.department !== theirUser.department;
  if (filter === theirUser.department) return true;
  return false;
}

function removeUserFromAll(userId) {
  // Remove from queue
  if (queue.has(userId)) {
    queue.delete(userId);
    console.log(`[Queue] ${userId} left queue`);
  }

  // Handle room leave
  const roomInfo = rooms.get(userId);
  if (roomInfo) {
    const { roomId, partnerId } = roomInfo;
    rooms.delete(userId);

    // Notify partner immediately with offline status and partner left signal
    const partnerInfo = rooms.get(partnerId);
    if (partnerInfo) {
      send(partnerInfo.ws, { type: 'STATUS', status: 'offline' });
      send(partnerInfo.ws, { type: 'PARTNER_LEFT', reason: 'disconnected' });
    }

    // Clean up room
    const members = roomMembers.get(roomId);
    if (members) {
      members.delete(userId);
      if (members.size === 0) {
        roomMembers.delete(roomId);
      }
    }

    console.log(`[Room] ${userId} left room ${roomId}`);
  }
}

wss.on('connection', (ws) => {
  allClients.add(ws);
  broadcastOnlineCount();
  let clientUserId = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }

    const { type } = msg;

    if (type === 'QUEUE_JOIN') {
      const { user, filter, blockedUserIds } = msg;
      clientUserId = user.id;

      // Remove any stale presence for this user
      removeUserFromAll(user.id);

      queue.set(user.id, {
        ws,
        user,
        filter,
        blockedUserIds: Array.isArray(blockedUserIds) ? blockedUserIds : [],
        joinedAt: Date.now(),
      });
      console.log(`[Queue] ${user.username} (${user.department}) joined | filter: ${filter} | blocked: ${(blockedUserIds || []).length} | queue size: ${queue.size}`);

      send(ws, { type: 'QUEUE_ACK', queueSize: queue.size });
      tryMatchInQueue();
    }

    else if (type === 'QUEUE_LEAVE') {
      if (clientUserId) {
        removeUserFromAll(clientUserId);
      }
    }

    else if (type === 'BOT_MATCH_REQUEST') {
      // User explicitly requested a bot match
      const { user, filter } = msg;
      clientUserId = user.id;
      queue.delete(user.id);

      send(ws, {
        type: 'BOT_MATCH_FOUND',
        user,
        filter,
      });
    }

    else if (type === 'CHAT_MESSAGE') {
      const { roomId, message } = msg;
      const roomInfo = rooms.get(clientUserId);
      if (roomInfo && roomInfo.roomId === roomId) {
        broadcastToRoom(roomId, clientUserId, {
          type: 'CHAT_MESSAGE',
          message,
        });
      }
    }

    else if (type === 'TYPING') {
      const { roomId, isTyping } = msg;
      const roomInfo = rooms.get(clientUserId);
      if (roomInfo && roomInfo.roomId === roomId) {
        broadcastToRoom(roomId, clientUserId, {
          type: 'TYPING',
          isTyping,
        });
      }
    }

    else if (type === 'SKIP') {
      const { roomId, reason } = msg;
      const roomInfo = rooms.get(clientUserId);
      if (roomInfo && roomInfo.roomId === roomId) {
        broadcastToRoom(roomId, clientUserId, { type: 'SKIP', reason });
        removeUserFromAll(clientUserId);
      }
    }

    else if (type === 'STATUS') {
      const { roomId, status } = msg;
      const roomInfo = rooms.get(clientUserId);
      if (roomInfo && roomInfo.roomId === roomId) {
        broadcastToRoom(roomId, clientUserId, {
          type: 'STATUS',
          status,
        });
      }
    }

    else if (type === 'THEME') {
      const { roomId, theme } = msg;
      const roomInfo = rooms.get(clientUserId);
      if (roomInfo && roomInfo.roomId === roomId) {
        broadcastToRoom(roomId, clientUserId, {
          type: 'THEME',
          theme,
        });
      }
    }

    else if (type === 'FRIEND_ADD') {
      const { roomId, partnerProfile, sender } = msg;
      const roomInfo = rooms.get(clientUserId);
      if (roomInfo && roomInfo.roomId === roomId) {
        broadcastToRoom(roomId, clientUserId, {
          type: 'FRIEND_ADD',
          partnerProfile,
          sender,
        });
      }
    }

    else if (type === 'REPORT_SUBMITTED') {
      const { report } = msg;
      console.log(`[Report] New incident report logged: ${report.reporter_username} -> ${report.reported_username}`);
      allClients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          send(client, { type: 'REPORT_BROADCAST', report });
        }
      });
    }

    else if (type === 'ANNOUNCEMENT') {
      const { announcement } = msg;
      console.log(`[Announcement] Broadcast: ${announcement.message}`);
      allClients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          send(client, { type: 'ANNOUNCEMENT_BROADCAST', announcement });
        }
      });
    }

    else if (type === 'GLOBAL_DM_MESSAGE' || (type && type.startsWith('CONNECTION_'))) {
      allClients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          send(client, msg);
        }
      });
    }

    else if (type === 'ROOM_JOIN') {
      // Connect / Reconnect to room
      const { roomId, userId, partnerId } = msg;
      clientUserId = userId;
      rooms.set(userId, { ws, roomId, partnerId });

      let members = roomMembers.get(roomId);
      if (!members) {
        members = new Set();
        roomMembers.set(roomId, members);
      }
      members.add(userId);
      console.log(`[Room] ${userId} active in room ${roomId}`);

      // If partner is currently open in this room, sync online status
      const partnerInfo = rooms.get(partnerId);
      if (partnerInfo && partnerInfo.roomId === roomId && partnerInfo.ws?.readyState === 1) {
        send(ws, { type: 'STATUS', status: 'online' });
        send(partnerInfo.ws, { type: 'STATUS', status: 'online' });
      }
    }

    else if (type === 'PING') {
      send(ws, { type: 'PONG' });
    }
  });

  ws.on('close', () => {
    allClients.delete(ws);
    broadcastOnlineCount();
    if (clientUserId) {
      removeUserFromAll(clientUserId);
    } else {
      // Robust lookup by websocket reference in case clientUserId was not attached
      for (const [uid, info] of rooms.entries()) {
        if (info.ws === ws) {
          removeUserFromAll(uid);
          break;
        }
      }
      for (const [uid, q] of queue.entries()) {
        if (q.ws === ws) {
          removeUserFromAll(uid);
          break;
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.error('[WS Error]', err.message);
  });
});

console.log(`✅ CapiTalk WebSocket server running on ws://localhost:${PORT}`);
