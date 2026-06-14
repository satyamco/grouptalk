const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Health check endpoint
app.get('/health', (req, res) => {
  res.send({ status: 'ok', roomsCount: Object.keys(rooms).length });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev simplicity
    methods: ['GET', 'POST']
  }
});

// In-memory room state
// roomId -> { id, topic, description, isPrivate, participants: { socketId -> Participant } }
const rooms = {};

// Helper to get active speakers in a room
function getSpeakers(roomId) {
  const room = rooms[roomId];
  if (!room) return [];
  return Object.values(room.participants).filter(p => p.role === 'owner' || p.role === 'moderator' || p.role === 'speaker');
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Get all public rooms list
  socket.on('get-rooms', (callback) => {
    const publicRooms = Object.values(rooms)
      .filter(r => !r.isPrivate)
      .map(r => ({
        id: r.id,
        topic: r.topic,
        description: r.description,
        speakersCount: Object.values(r.participants).filter(p => ['owner', 'moderator', 'speaker'].includes(p.role)).length,
        listenersCount: Object.values(r.participants).filter(p => p.role === 'listener').length,
        ownerName: Object.values(r.participants).find(p => p.role === 'owner')?.username || 'Unknown Host',
        ownerAvatar: Object.values(r.participants).find(p => p.role === 'owner')?.avatar || '🎙️'
      }));
    callback(publicRooms);
  });

  // 2. Create room
  socket.on('create-room', ({ roomId, topic, description, isPrivate, username, avatar }, callback) => {
    if (rooms[roomId]) {
      return callback({ error: 'Room already exists' });
    }

    rooms[roomId] = {
      id: roomId,
      topic,
      description,
      isPrivate: !!isPrivate,
      participants: {}
    };

    console.log(`Room created: ${roomId} - "${topic}"`);
    callback({ success: true });
  });

  // 3. Join room
  socket.on('join-room', ({ roomId, username, avatar }, callback) => {
    const room = rooms[roomId];
    if (!room) {
      return callback({ error: 'Room not found' });
    }

    // Determine role: First person is owner, others are listeners
    const isFirstUser = Object.keys(room.participants).length === 0;
    const role = isFirstUser ? 'owner' : 'listener';

    const newParticipant = {
      id: socket.id,
      username,
      avatar,
      role,
      isMuted: role === 'listener', // listeners are muted by default
      isHandRaised: false,
      joinedAt: Date.now()
    };

    room.participants[socket.id] = newParticipant;
    socket.join(roomId);

    console.log(`User ${username} (${socket.id}) joined room ${roomId} as ${role}`);

    // Notify room of new participant
    socket.to(roomId).emit('participant-joined', newParticipant);

    // If joining as a speaker (e.g. host), notify others for WebRTC
    if (role === 'owner') {
      socket.to(roomId).emit('speaker-joined', { socketId: socket.id });
    }

    // Send current room state back to the joiner
    callback({
      room: {
        id: room.id,
        topic: room.topic,
        description: room.description,
        isPrivate: room.isPrivate,
        participants: room.participants
      },
      self: newParticipant
    });
  });

  // 4. Leave room
  socket.on('leave-room', ({ roomId }) => {
    handleUserLeaving(socket, roomId);
  });

  // 5. Chat message
  socket.on('chat-message', ({ roomId, message }) => {
    const room = rooms[roomId];
    if (!room || !room.participants[socket.id]) return;

    const sender = room.participants[socket.id];
    const chatMsg = {
      id: `${socket.id}-${Date.now()}`,
      sender: {
        id: socket.id,
        username: sender.username,
        avatar: sender.avatar,
        role: sender.role
      },
      text: message,
      timestamp: Date.now()
    };

    io.to(roomId).emit('chat-message', chatMsg);
  });

  // 6. Raise / Lower Hand
  socket.on('raise-hand', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.participants[socket.id]) return;

    const participant = room.participants[socket.id];
    if (participant.role === 'listener') {
      participant.isHandRaised = true;
      io.to(roomId).emit('participant-updated', participant);
      console.log(`${participant.username} raised hand in ${roomId}`);
    }
  });

  socket.on('lower-hand', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || !room.participants[socket.id]) return;

    const participant = room.participants[socket.id];
    if (participant.isHandRaised) {
      participant.isHandRaised = false;
      io.to(roomId).emit('participant-updated', participant);
      console.log(`${participant.username} lowered hand in ${roomId}`);
    }
  });

  // 7. Update Mute State
  socket.on('mute-toggle', ({ roomId, isMuted }) => {
    const room = rooms[roomId];
    if (!room || !room.participants[socket.id]) return;

    const participant = room.participants[socket.id];
    // Listeners are always muted, they can't unmute themselves without becoming speakers
    if (participant.role === 'listener' && !isMuted) {
      return;
    }

    participant.isMuted = isMuted;
    io.to(roomId).emit('participant-updated', participant);
  });

  // 8. Moderate Participant Role (Promote/Demote/Mute/Kick)
  socket.on('moderate-participant', ({ roomId, targetSocketId, action }) => {
    const room = rooms[roomId];
    if (!room) return;

    const sender = room.participants[socket.id];
    const target = room.participants[targetSocketId];

    if (!sender || !target) return;

    // Only Owner and Moderator can moderate
    const hasModPower = sender.role === 'owner' || sender.role === 'moderator';
    if (!hasModPower) {
      return socket.emit('error-msg', { message: 'Unauthorized moderation action' });
    }

    // Owner cannot be moderated by anyone; moderators can only be moderated by the owner
    if (target.role === 'owner') {
      return socket.emit('error-msg', { message: 'Cannot moderate room owner' });
    }
    if (target.role === 'moderator' && sender.role !== 'owner') {
      return socket.emit('error-msg', { message: 'Only room owner can moderate moderators' });
    }

    console.log(`Moderation: ${sender.username} performed ${action} on ${target.username} in room ${roomId}`);

    if (action === 'promote') {
      // Listener -> Speaker
      target.role = 'speaker';
      target.isHandRaised = false;
      target.isMuted = false; // start speaking unmuted by default
      io.to(roomId).emit('participant-updated', target);
      // Notify the room that a new speaker joined for WebRTC connections
      io.to(roomId).emit('speaker-joined', { socketId: targetSocketId });
    } 
    else if (action === 'demote') {
      // Speaker/Moderator -> Listener
      const wasSpeaker = ['owner', 'moderator', 'speaker'].includes(target.role);
      target.role = 'listener';
      target.isHandRaised = false;
      target.isMuted = true; // listeners are always muted
      io.to(roomId).emit('participant-updated', target);
      
      if (wasSpeaker) {
        // Notify the room that a speaker left for WebRTC cleanups
        io.to(roomId).emit('speaker-left', { socketId: targetSocketId });
      }
    } 
    else if (action === 'make-moderator') {
      // Speaker -> Moderator
      target.role = 'moderator';
      io.to(roomId).emit('participant-updated', target);
    }
    else if (action === 'mute') {
      // Force mute a speaker
      if (target.role !== 'listener') {
        target.isMuted = true;
        io.to(roomId).emit('participant-updated', target);
      }
    } 
    else if (action === 'kick') {
      // Remove from room
      const wasSpeaker = ['owner', 'moderator', 'speaker'].includes(target.role);
      delete room.participants[targetSocketId];
      
      io.to(roomId).emit('participant-left', { id: targetSocketId, username: target.username });
      
      if (wasSpeaker) {
        io.to(roomId).emit('speaker-left', { socketId: targetSocketId });
      }

      // Instruct the specific socket to leave
      io.to(targetSocketId).emit('kicked-from-room');
    }
  });

  // 9. WebRTC Signaling Forwarding
  socket.on('webrtc-offer', ({ roomId, targetSocketId, offer }) => {
    io.to(targetSocketId).emit('webrtc-offer', {
      senderSocketId: socket.id,
      offer
    });
  });

  socket.on('webrtc-answer', ({ roomId, targetSocketId, answer }) => {
    io.to(targetSocketId).emit('webrtc-answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  socket.on('webrtc-candidate', ({ roomId, targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('webrtc-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // 10. Voice Activity Indicator (simulation styling/real audio indicator)
  socket.on('voice-activity', ({ roomId, isSpeaking }) => {
    const room = rooms[roomId];
    if (!room || !room.participants[socket.id]) return;

    // Broadcast voice active state to room
    socket.to(roomId).emit('voice-activity', {
      socketId: socket.id,
      isSpeaking
    });
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Find all rooms this socket was in and clean up
    Object.keys(rooms).forEach(roomId => {
      if (rooms[roomId].participants[socket.id]) {
        handleUserLeaving(socket, roomId);
      }
    });
  });
});

// Common cleanup helper when user leaves or disconnects
function handleUserLeaving(socket, roomId) {
  const room = rooms[roomId];
  if (!room) return;

  const participant = room.participants[socket.id];
  if (!participant) return;

  const wasSpeaker = ['owner', 'moderator', 'speaker'].includes(participant.role);
  console.log(`User ${participant.username} (${socket.id}) left room ${roomId}`);

  // Remove participant
  delete room.participants[socket.id];

  // Notify other room users
  socket.to(roomId).emit('participant-left', { id: socket.id, username: participant.username });

  if (wasSpeaker) {
    socket.to(roomId).emit('speaker-left', { socketId: socket.id });
  }

  // If no one is left in the room, delete it after a small delay (or immediately)
  if (Object.keys(room.participants).length === 0) {
    delete rooms[roomId];
    console.log(`Room empty, destroyed: ${roomId}`);
  } else if (participant.role === 'owner') {
    // If owner left, promote the next oldest speaker or moderator, or just first user
    const remainingParticipants = Object.values(room.participants);
    if (remainingParticipants.length > 0) {
      // Find a moderator or oldest joined participant
      remainingParticipants.sort((a, b) => a.joinedAt - b.joinedAt);
      const mod = remainingParticipants.find(p => p.role === 'moderator') || remainingParticipants[0];
      mod.role = 'owner';
      mod.isMuted = false;
      io.to(roomId).emit('participant-updated', mod);
      io.to(roomId).emit('speaker-joined', { socketId: mod.id });
      console.log(`New host assigned: ${mod.username} for room ${roomId}`);
    }
  }

  socket.leave(roomId);
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server listening on port ${PORT}`);
});
