/**
 * Karachi Public Chat - Complete Application Types
 */

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string; // hashed password
  avatar: string; // url or data-uri
  status: 'online' | 'offline' | 'away';
  lastSeen: string;
  role: 'user' | 'admin';
  ipAddress: string;
  device: string;
  isBanned: boolean;
  banReason?: string;
  isMuted: boolean;
  muteExpiresAt?: string;
  createdAt: string;
}

export interface Room {
  id: string;
  name: string;
  type: 'public' | 'private' | 'random';
  participants: string[]; // User IDs (mainly for private/random rooms)
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  receiverId?: string; // for private messages
  roomId: string; // channel or private room id
  message: string;
  createdAt: string;
  status?: 'sent' | 'delivered' | 'seen';
  type: 'text' | 'image' | 'gif' | 'system';
  msgType: 'public' | 'private' | 'random';
  reactions?: { [key: string]: string[] }; // emoji -> string[] (usernames/userIds)
}

export interface Report {
  id: string;
  reporterId: string;
  reporterUsername: string;
  reportedUserId: string;
  reportedUsername: string;
  reason: string;
  chatType: 'public' | 'private' | 'random';
  evidence: string; // snapshot of last few messages
  createdAt: string;
}

export interface BanRecord {
  id: string;
  userId: string;
  username: string;
  reason: string;
  ipAddress: string;
  bannedBy: string;
  createdAt: string;
  expiresAt: string; // date-string or 'permanent'
}

export interface ActiveSession {
  userId: string;
  socketId: string;
  matchedWith?: string; // for random chat (Omegle-like partner ID)
  isMatching: boolean;  // is in Omegle queue
  isAnonymous: boolean; // is anonymous in random chat
}

export interface AppStats {
  totalUsers: number;
  onlineUsers: number;
  activeDMsCount: number;
  activeRandomChatsCount: number;
  bannedUsersCount: number;
  reportsCount: number;
}
