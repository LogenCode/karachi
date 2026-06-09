import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createServer as createViteServer } from 'vite';
import { db } from './db';
import { User, Message, Room, Report, ActiveSession } from './types';

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'karachi_buland_parvaz_secure_jwt_token_2026';

// Initialize Express and HTTP Server
const app = express();
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Cache for manual location simulation
// Default: simulation is active so users can test immediately inside the AI Studio preview environment
const activeSimulations = new Map<string, { isWithinKarachi: boolean; simulatedIp: string; city: string }>();

// Helpers for IP detection
function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

function checkIsKarachi(ip: string): { isWithinKarachi: boolean; city: string; country: string } {
  // Classic IP range check: in production we would match subnets or hit a GeoIP service
  // Let's create an elegant pseudo-subnet filter + default to Karachi-registered subnets (e.g., 39.40.*, 111.68.*, 175.107.* etc)
  const ipStr = ip.trim();
  
  if (ipStr === '127.0.0.1' || ipStr === '::1' || ipStr.startsWith('192.168.') || ipStr.startsWith('10.')) {
    // Local development - allowed of course
    return { isWithinKarachi: true, city: 'Karachi (Local Developer)', country: 'Pakistan' };
  }

  // Common PTCL / Stormfiber/ Transworld IP subnets in Karachi starting bytes:
  if (ipStr.startsWith('39.38.') || ipStr.startsWith('39.40.') || ipStr.startsWith('39.42.') || 
      ipStr.startsWith('111.68.') || ipStr.startsWith('175.107.') || ipStr.startsWith('182.180.')) {
    return { isWithinKarachi: true, city: 'Karachi', country: 'Pakistan' };
  }

  // By default, Cloud Run nodes will show as Singapore, US, etc.
  return { isWithinKarachi: false, city: 'Unknown/Foreign Server Hub', country: 'International' };
}

// REST MIDDLEWARE for Auth Verification
function authenticateToken(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session token' });
    req.user = decoded;
    next();
  });
}

// --- API ENDPOINTS ---

// Location verification diagnostic check
app.get('/api/location/status', (req, res) => {
  const clientIp = getClientIp(req);
  const simulation = activeSimulations.get(clientIp);

  if (simulation) {
    return res.json({
      detectedIp: clientIp,
      simulated: true,
      simulatedIp: simulation.simulatedIp,
      isWithinKarachi: simulation.isWithinKarachi,
      city: simulation.city,
      country: 'Pakistan'
    });
  }

  const analysis = checkIsKarachi(clientIp);
  res.json({
    detectedIp: clientIp,
    simulated: false,
    isWithinKarachi: analysis.isWithinKarachi,
    city: analysis.city,
    country: analysis.country
  });
});

// Route to simulate location (crucial for developers and reviewers testing from foreign servers!)
app.post('/api/location/simulate', (req, res) => {
  const clientIp = getClientIp(req);
  const { enableSim, simulatedIp, isWithinKarachi } = req.body;

  if (enableSim) {
    activeSimulations.set(clientIp, {
      isWithinKarachi: isWithinKarachi ?? true,
      simulatedIp: simulatedIp || '39.40.120.32', // Kamran Clifton's Karachi IP
      city: isWithinKarachi ? 'Karachi (Simulated)' : 'Lahore (Simulated)'
    });
  } else {
    activeSimulations.delete(clientIp);
  }

  res.json({ success: true, message: 'Simulation configuration updated successfully' });
});

// Authentication Routes
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const usernameTrimmed = username.trim();
  if (usernameTrimmed.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }

  // Find by username (case insensitive)
  let user = db.getUserByUsername(usernameTrimmed);

  if (!user) {
    // Auto-create account
    const hashedPassword = bcrypt.hashSync(password, 10);
    const clientIp = getClientIp(req);
    const sim = activeSimulations.get(clientIp);
    const finalIp = sim ? sim.simulatedIp : clientIp;
    
    const isMainAdmin = usernameTrimmed.toLowerCase() === 'admin';

    user = {
      id: 'user-' + Math.random().toString(36).substring(2, 11),
      username: usernameTrimmed,
      email: `${usernameTrimmed.toLowerCase()}@karachichat.pk`,
      password: hashedPassword,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(usernameTrimmed)}`,
      status: 'online',
      lastSeen: new Date().toISOString(),
      role: isMainAdmin ? 'admin' : 'user',
      ipAddress: finalIp,
      device: req.headers['user-agent'] || 'Unknown device',
      isBanned: false,
      isMuted: false,
      createdAt: new Date().toISOString()
    };

    db.addUser(user);
  } else {
    // User exists - login check
    if (user.isBanned) {
      return res.status(403).json({ error: `This account has been banned. Reason: ${user.banReason || 'Unspecified violation'}` });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password || '');
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password for this username. Please try again or choose a different username.' });
    }

    // Update IP & Last Seen on Login
    const clientIp = getClientIp(req);
    const sim = activeSimulations.get(clientIp);
    const finalIp = sim ? sim.simulatedIp : clientIp;
    db.updateUser(user.id, { lastSeen: new Date().toISOString(), status: 'online', ipAddress: finalIp });
  }

  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  
  const { password: _, ...userSafe } = user;
  res.json({ token, user: userSafe });
});

app.get('/api/auth/me', authenticateToken, (req: any, res) => {
  const user = db.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User session not found' });
  if (user.isBanned) return res.status(403).json({ error: 'User is banned' });

  const { password: _, ...userSafe } = user;
  res.json(userSafe);
});

app.post('/api/auth/update-profile', authenticateToken, (req: any, res) => {
  const { username, avatar, password, privacySettings } = req.body;
  const userId = req.user.id;

  // Validation
  if (username) {
    const existing = db.getUserByUsername(username);
    if (existing && existing.id !== userId) {
      return res.status(400).json({ error: 'Username already taken' });
    }
  }

  const updates: Partial<User> = {};
  if (username) updates.username = username;
  if (avatar) updates.avatar = avatar;
  if (password) {
    updates.password = bcrypt.hashSync(password, 10);
  }

  const updatedUser = db.updateUser(userId, updates);
  if (!updatedUser) return res.status(404).json({ error: 'User not found' });

  // Broadcast user update so real-time sidebars refresh user lists instantly
  io.emit('user:presence', {
    id: updatedUser.id,
    username: updatedUser.username,
    avatar: updatedUser.avatar,
    status: updatedUser.status
  });

  const { password: _, ...userSafe } = updatedUser;
  res.json({ success: true, user: userSafe });
});

// Public Chat Room list and message retrieval
app.get('/api/rooms', authenticateToken, (req, res) => {
  res.json(db.getRooms());
});

app.get('/api/rooms/:id/messages', authenticateToken, (req, res) => {
  const { id } = req.params;
  const messages = db.getMessagesForRoom(id);
  res.json(messages);
});

// Admin API Routes
app.get('/api/admin/stats', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' });
  res.json(db.getStats());
});

app.get('/api/admin/users', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' });
  res.json(db.getUsers());
});

app.post('/api/admin/users/:id/ban', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' });
  const { id } = req.params;
  const { reason, duration } = req.body;

  const target = db.getUserById(id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'admin') return res.status(400).json({ error: 'Cannot ban other administrators' });

  const expiresAt = duration === 'permanent' ? 'permanent' : new Date(Date.now() + parseInt(duration) * 60 * 60 * 1000).toISOString();
  db.setBanUser(id, reason || 'Inappropriate behavior', req.user.username, expiresAt);

  // Kick user socket if connected
  const targetSocket = userToSocket.get(id);
  if (targetSocket) {
    io.to(targetSocket).emit('user:banned', { reason: reason || 'Inappropriate behavior' });
    const s = io.sockets.sockets.get(targetSocket);
    s?.disconnect(true);
  }

  res.json({ success: true, message: 'User banned and sessions closed successfully' });
});

app.post('/api/admin/users/:id/unban', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' });
  const { id } = req.params;
  db.liftBanUser(id);
  res.json({ success: true, message: 'User ban lifted successfully' });
});

app.post('/api/admin/users/:id/mute', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' });
  const { id } = req.params;
  const { durationMinutes } = req.body;

  const target = db.getUserById(id);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const muteExp = new Date(Date.now() + durationMinutes * 6000).toISOString();
  db.updateUser(id, { isMuted: true, muteExpiresAt: muteExp });

  // Broadcast mute update
  const socketId = userToSocket.get(id);
  if (socketId) {
    io.to(socketId).emit('user:muted', { muteExpiresAt: muteExp });
  }

  res.json({ success: true, message: `User muted for ${durationMinutes} minutes` });
});

app.get('/api/admin/reports', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' });
  res.json(db.getReports());
});

app.delete('/api/admin/reports/:id', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' });
  const { id } = req.params;
  db.deleteReport(id);
  res.json({ success: true });
});

app.delete('/api/admin/messages/:id', authenticateToken, (req: any, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access denied' });
  const { id } = req.params;
  db.deleteMessage(id);
  io.emit('message:deleted', { messageId: id });
  res.json({ success: true });
});

// --- REAL-TIME COMMUNICATIONS (SOCKET.IO) ---

const socketToUser = new Map<string, string>(); // socketId -> userId
const userToSocket = new Map<string, string>(); // userId -> socketId

// Dynamic lists for random Matching (Omegle mode)
interface MatchingUserInfo {
  userId: string;
  socketId: string;
  username: string;
  isAnonymous: boolean;
}
let waitingStrangers: MatchingUserInfo[] = [];
const activeStrangerRooms = new Map<string, { room: string; partnerId: string; partnerSocket: string }>();

io.on('connection', (socket: Socket) => {
  console.log(`Socket connection: ${socket.id}`);

  // User authenticates with socket
  socket.on('auth:init', ({ token }) => {
    if (!token) return;
    
    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return;
      const userId = decoded.id;
      const user = db.getUserById(userId);

      if (!user || user.isBanned) {
        socket.disconnect();
        return;
      }

      // Record connection mapping
      socketToUser.set(socket.id, userId);
      userToSocket.set(userId, socket.id);

      // Set user presence online
      db.updateUser(userId, { status: 'online', lastSeen: new Date().toISOString() });
      
      // Let everyone know user presence update
      io.emit('user:presence', { 
        id: userId, 
        username: user.username, 
        avatar: user.avatar, 
        status: 'online' 
      });

      // Join standard group channels by default
      socket.join('general');
      socket.join('chai-shai');
      socket.join('clifton');
      socket.join('saddar');
      socket.join('banter');

      // Sync active chat counters and online counts
      io.emit('stats:counts', {
        online: db.getUsers().filter(u => u.status === 'online').length
      });
    });
  });

  // Typing updates
  socket.on('chat:typing', ({ roomId, username, isTyping }) => {
    socket.to(roomId).emit('chat:typing', { roomId, username, isTyping });
  });

  // Seen receipt status
  socket.on('chat:seen', ({ messageId, senderId, roomId }) => {
    const senderSocket = userToSocket.get(senderId);
    if (senderSocket) {
      io.to(senderSocket).emit('chat:seen', { messageId, roomId });
    }
  });

  // Room Message sending
  socket.on('chat:message', (data: { roomId: string; message: string; type: 'text' | 'image' | 'gif'; msgType: 'public' | 'private' | 'random'; tempId?: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const user = db.getUserById(userId);
    if (!user) return;

    if (user.isMuted) {
      const now = new Date();
      if (user.muteExpiresAt && new Date(user.muteExpiresAt) > now) {
        socket.emit('error:toast', { message: 'You are currently muted from sending messages.' });
        return;
      } else {
        db.updateUser(userId, { isMuted: false, muteExpiresAt: undefined });
      }
    }

    // Rate limits (Flood and spam mitigation)
    // Avoid double submissions or rapid 1-second spamming
    const userMessages = db.getMessages()
      .filter(m => m.senderId === userId)
      .slice(-3);
    if (userMessages.length >= 3) {
      const timestamps = userMessages.map(m => new Date(m.createdAt).getTime());
      const diff = Date.now() - timestamps[0];
      if (diff < 1500) { // Less than 1.5 seconds for 3 messages
        socket.emit('error:toast', { message: 'Spam Prevention: Please slow down your messaging rate.' });
        return;
      }
    }

    const newMessage: Message & { tempId?: string } = {
      id: 'msg-' + Math.random().toString(36).substring(2, 11),
      senderId: userId,
      senderName: user.username,
      senderAvatar: user.avatar,
      roomId: data.roomId,
      message: data.message,
      createdAt: new Date().toISOString(),
      type: data.type || 'text',
      msgType: data.msgType || 'public',
      status: 'sent'
    };

    if (data.tempId) {
      newMessage.tempId = data.tempId;
    }

    // If private chat message
    if (data.msgType === 'private') {
      const parts = data.roomId.replace('private-', '').split('-');
      const receiverId = parts.find(p => p !== userId);
      if (receiverId) {
        newMessage.receiverId = receiverId;
        newMessage.senderName = user.username;
        
        // Guarantee private room existence in virtual list
        const privateRoomId = data.roomId;
        db.addRoom({
          id: privateRoomId,
          name: `Direct Chat: ${user.username}`,
          type: 'private',
          participants: [userId, receiverId]
        });

        const receiverSocketId = userToSocket.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('chat:message', newMessage);
        }
        // Emit back to sender as well to reconcile tempId
        socket.emit('chat:message', newMessage);
      }
    } else if (data.msgType === 'random') {
      // In Omegle match chat, routes specifically to stranger's private room scope
      newMessage.senderName = data.roomId.includes('anon') ? 'Anonymous Stranger' : user.username;
      
      const session = activeStrangerRooms.get(socket.id);
      if (session) {
        io.to(session.partnerSocket).emit('chat:message', newMessage);
      }
      // Emit back to sender as well to reconcile tempId
      socket.emit('chat:message', newMessage);
    } else {
      // General public channels
      io.to(data.roomId).emit('chat:message', newMessage);
    }

    db.addMessage(newMessage);
  });

  // Emoji Reactions
  const handleReactionEmit = ({ messageId, emoji, roomId }: { messageId: string; emoji: string; roomId: string }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const updated = db.addReaction(messageId, emoji, userId);
    if (updated) {
      const payload = { messageId, reactions: updated.reactions, roomId };
      io.to(roomId).emit('chat:reaction', payload);
      io.to(roomId).emit('message:react', payload);
    }
  };

  socket.on('chat:reaction', handleReactionEmit);
  socket.on('message:react', handleReactionEmit);

  // --- OMEGLE-LIKE RANDOM CHAT ENGINE ---
  socket.on('random:join', ({ isAnonymous }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const user = db.getUserById(userId);
    if (!user) return;

    // Remove any previous waiting nodes
    waitingStrangers = waitingStrangers.filter(u => u.userId !== userId && u.socketId !== socket.id);

    // If they were already in a random chat, clean it up
    disconnectStranger(socket);

    // Add user back to matching queue
    waitingStrangers.push({
      userId,
      socketId: socket.id,
      username: isAnonymous ? 'Anonymous Stranger' : user.username,
      isAnonymous
    });

    console.log(`User ${user.username} entered Stranger Queue. Queue Size: ${waitingStrangers.length}`);

    // Check if matching pair is ready
    if (waitingStrangers.length >= 2) {
      const userA = waitingStrangers.shift()!;
      const userB = waitingStrangers.shift()!;

      const randomRoomId = `random-room-${userA.userId}-${userB.userId}`;
      
      // Setup live stranger links
      activeStrangerRooms.set(userA.socketId, {
        room: randomRoomId,
        partnerId: userB.userId,
        partnerSocket: userB.socketId
      });

      activeStrangerRooms.set(userB.socketId, {
        room: randomRoomId,
        partnerId: userA.userId,
        partnerSocket: userA.socketId
      });

      // Create dummy room entry
      db.addRoom({
        id: randomRoomId,
        name: 'Omegle Stranger Match',
        type: 'random',
        participants: [userA.userId, userB.userId]
      });

      // Emit matching alerts
      io.to(userA.socketId).emit('random:match', {
        roomId: randomRoomId,
        partyId: userB.userId,
        partyName: userB.isAnonymous ? 'Anonymous Stranger' : userB.username,
        partyIsAnon: userB.isAnonymous
      });

      io.to(userB.socketId).emit('random:match', {
        roomId: randomRoomId,
        partyId: userA.userId,
        partyName: userA.isAnonymous ? 'Anonymous Stranger' : userA.username,
        partyIsAnon: userA.isAnonymous
      });

      console.log(`Matched Omegle strangers: ${userA.username} with ${userB.username}`);
    }
  });

  socket.on('random:leave', () => {
    disconnectStranger(socket);
  });

  // Client blocks a user
  socket.on('user:block', ({ targetId }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    db.blockUser(userId, targetId);
    socket.emit('user:blocked_success', { targetId });
  });

  // Client reports a user
  socket.on('user:report', ({ targetId, reason, chatType, evidence }) => {
    const userId = socketToUser.get(socket.id);
    if (!userId) return;

    const reporter = db.getUserById(userId);
    const target = db.getUserById(targetId);

    if (reporter && target) {
      const newReport: Report = {
        id: 'rep-' + Math.random().toString(36).substring(2, 10),
        reporterId: userId,
        reporterUsername: reporter.username,
        reportedUserId: targetId,
        reportedUsername: target.username,
        reason,
        chatType: chatType || 'public',
        evidence: evidence || 'Message logs snapshot',
        createdAt: new Date().toISOString()
      };
      db.addReport(newReport);
      socket.emit('error:toast', { message: 'Thank you! Your report has been dispatched to Karachi moderators.' });
    }
  });

  // Socket Disconnection
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    const userId = socketToUser.get(socket.id);

    if (userId) {
      // Update DB presence
      db.updateUser(userId, { status: 'offline', lastSeen: new Date().toISOString() });
      
      // Let everyone know presence went offline
      const user = db.getUserById(userId);
      if (user) {
        io.emit('user:presence', { 
          id: userId, 
          username: user.username, 
          avatar: user.avatar, 
          status: 'offline' 
        });
      }

      // Cleanup queues
      waitingStrangers = waitingStrangers.filter(u => u.userId !== userId && u.socketId !== socket.id);
      disconnectStranger(socket);

      // Delete connection associations
      socketToUser.delete(socket.id);
      userToSocket.delete(userId);
    }
  });
});

// Helper to gracefully teardown an active Omegle matching room
function disconnectStranger(socket: Socket) {
  const session = activeStrangerRooms.get(socket.id);
  if (session) {
    const partnerSocketId = session.partnerSocket;
    const partnerSocketInstance = io.sockets.sockets.get(partnerSocketId);

    // Notify partner that stranger disconnected
    if (partnerSocketInstance) {
      partnerSocketInstance.emit('random:disconnected', { message: 'Stranger disconnected.' });
    }

    // Clean active matches
    activeStrangerRooms.delete(socket.id);
    activeStrangerRooms.delete(partnerSocketId);
    db.removeRoom(session.room);
  }
}

// --- VITE DEV OR STATIC FRONTEND INTEGRATION ---

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static outputs from /dist folder
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // PORT 3000 is required by standard dev stack
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`===============================================`);
    console.log(`🚀 Karachi Public Chat listening on Port: ${PORT}`);
    console.log(`===============================================`);
  });
}

startServer();
