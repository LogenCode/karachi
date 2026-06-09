import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Room, Message, Report, BanRecord, AppStats } from './types';

const STORE_PATH = path.join(process.cwd(), 'karachi-db.json');

interface Schema {
  users: User[];
  rooms: Room[];
  messages: Message[];
  reports: Report[];
  bans: BanRecord[];
  blockedPairs: [string, string][]; // [userA, userB] blocking each other
}

// Initial default data
const DEFAULT_ROOMS: Room[] = [
  { id: 'general', name: 'Karachi Public Room 🏛️🇵🇰', type: 'public', participants: [] }
];

function getInitialDB(): Schema {
  return {
    users: [],
    rooms: DEFAULT_ROOMS,
    messages: [],
    reports: [],
    bans: [],
    blockedPairs: []
  };
}

class MicroDatabase {
  private cache: Schema;

  constructor() {
    this.cache = this.load();
    this.save(); // Writes defaults to disk if brand new
  }

  private load(): Schema {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const fileContent = fs.readFileSync(STORE_PATH, 'utf8');
        const db = JSON.parse(fileContent);
        // Sync structures in case of file bugs
        if (!db.users) db.users = [];
        if (!db.rooms) db.rooms = DEFAULT_ROOMS;
        if (!db.messages) db.messages = [];
        if (!db.reports) db.reports = [];
        if (!db.bans) db.bans = [];
        if (!db.blockedPairs) db.blockedPairs = [];
        return db;
      }
    } catch (e) {
      console.error('Error loading micro DB, regenerating defaults...', e);
    }
    return getInitialDB();
  }

  public save(): void {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write database file', e);
    }
  }

  // --- USER OPERATIONS ---
  public getUsers(): User[] {
    return this.cache.users;
  }

  public getUserById(id: string): User | undefined {
    return this.cache.users.find(u => u.id === id);
  }

  public getUserByUsername(username: string): User | undefined {
    return this.cache.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  public getUserByEmail(email: string): User | undefined {
    return this.cache.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public addUser(user: User): void {
    this.cache.users.push(user);
    this.save();
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const userIndex = this.cache.users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      this.cache.users[userIndex] = { ...this.cache.users[userIndex], ...updates } as User;
      // Sync sender metadata across mock/real messages history inside memory
      const updatedUser = this.cache.users[userIndex];
      this.cache.messages.forEach(msg => {
        if (msg.senderId === id) {
          msg.senderName = updatedUser.username;
          msg.senderAvatar = updatedUser.avatar;
        }
      });
      this.save();
      return this.cache.users[userIndex];
    }
    return undefined;
  }

  // --- ROOM OPERATIONS ---
  public getRooms(): Room[] {
    return this.cache.rooms;
  }

  public getRoomById(id: string): Room | undefined {
    return this.cache.rooms.find(r => r.id === id);
  }

  public addRoom(room: Room): void {
    if (!this.cache.rooms.some(r => r.id === room.id)) {
      this.cache.rooms.push(room);
      this.save();
    }
  }

  public removeRoom(id: string): void {
    this.cache.rooms = this.cache.rooms.filter(r => r.id !== id);
    this.save();
  }

  // --- MESSAGE OPERATIONS ---
  public getMessages(): Message[] {
    return this.cache.messages;
  }

  public getMessagesForRoom(roomId: string, limit = 100): Message[] {
    return this.cache.messages
      .filter(m => m.roomId === roomId)
      .slice(-limit);
  }

  public addMessage(msg: Message): void {
    // Bad Word Filtering (Saddist slang, sensitive words, standard profanities)
    msg.message = this.filterBadWords(msg.message);
    this.cache.messages.push(msg);
    this.save();
  }

  public deleteMessage(msgId: string): void {
    this.cache.messages = this.cache.messages.filter(m => m.id !== msgId);
    this.save();
  }

  public addReaction(msgId: string, emoji: string, userId: string): Message | undefined {
    const msg = this.cache.messages.find(m => m.id === msgId);
    if (msg) {
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
      
      const users = msg.reactions[emoji];
      const index = users.indexOf(userId);
      if (index > -1) {
        users.splice(index, 1); // Toggle off if already reacted
      } else {
        users.push(userId);
      }
      
      if (users.length === 0) {
        delete msg.reactions[emoji];
      }
      
      this.save();
      return msg;
    }
    return undefined;
  }

  // --- BLOCK & CHAT SYSTEM ---
  public blockUser(blockerId: string, blockedId: string): void {
    const exists = this.cache.blockedPairs.some(
      pair => (pair[0] === blockerId && pair[1] === blockedId) || (pair[0] === blockedId && pair[1] === blockerId)
    );
    if (!exists) {
      this.cache.blockedPairs.push([blockerId, blockedId]);
      this.save();
    }
  }

  public isBlocked(userA: string, userB: string): boolean {
    return this.cache.blockedPairs.some(
      pair => (pair[0] === userA && pair[1] === userB) || (pair[0] === userB && pair[1] === userA)
    );
  }

  // --- REPORT OPERATIONS ---
  public addReport(report: Report): void {
    this.cache.reports.push(report);
    this.save();
  }

  public getReports(): Report[] {
    return this.cache.reports;
  }

  public deleteReport(reportId: string): void {
    this.cache.reports = this.cache.reports.filter(r => r.id !== reportId);
    this.save();
  }

  // --- BAN RECORDS ---
  public setBanUser(userId: string, reason: string, bannedBy: string, expiresAt: string): void {
    const user = this.getUserById(userId);
    if (user) {
      this.updateUser(userId, { isBanned: true, banReason: reason });
      
      // Add Ban History record
      const newBan: BanRecord = {
        id: 'ban-' + Math.random().toString(36).substring(2, 9),
        userId,
        username: user.username,
        reason,
        ipAddress: user.ipAddress || '127.0.0.1',
        bannedBy,
        createdAt: new Date().toISOString(),
        expiresAt
      };
      
      this.cache.bans = this.cache.bans.filter(b => b.userId !== userId); // Avoid duplicates
      this.cache.bans.push(newBan);
      this.save();
    }
  }

  public liftBanUser(userId: string): void {
    this.updateUser(userId, { isBanned: false, banReason: undefined });
    this.cache.bans = this.cache.bans.filter(b => b.userId !== userId);
    this.save();
  }

  public getBans(): BanRecord[] {
    return this.cache.bans;
  }

  // --- MODERATION BAD WORD FILTER ---
  private filterBadWords(text: string): string {
    const badWords = [
      'chotia', 'chutiya', 'kameena', 'kamina', 'harami', 'bhadwa', 
      'gandu', 'saala', 'sala', 'bhenchod', 'maderchod', 'teri maa ki',
      'loda', 'laundia', 'lulli', 'fucker', 'asshole', 'bitch', 'randi'
    ];
    
    let filtered = text;
    for (const word of badWords) {
      const regex = new RegExp(`\\b${word}\\b|${word}`, 'gi');
      filtered = filtered.replace(regex, '***');
    }
    return filtered;
  }

  // --- ADMIN ANALYTICS ---
  public getStats(): AppStats {
    const onlineCount = this.cache.users.filter(u => u.status === 'online' || u.status === 'away').length;
    const activeDMs = this.cache.rooms.filter(r => r.type === 'private').length;
    const activeRandom = this.cache.rooms.filter(r => r.type === 'random').length;
    const banned = this.cache.users.filter(u => u.isBanned).length;

    return {
      totalUsers: this.cache.users.length,
      onlineUsers: onlineCount,
      activeDMsCount: activeDMs,
      activeRandomChatsCount: activeRandom,
      bannedUsersCount: banned,
      reportsCount: this.cache.reports.length
    };
  }
}

export const db = new MicroDatabase();
