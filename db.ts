// db.ts - Saaf aur Fresh Version
import fs from 'fs';
import path from 'path';
import { User, Room, Message, Report, BanRecord, AppStats } from './types';

const STORE_PATH = path.join(process.cwd(), 'karachi-db.json');

interface Schema {
  users: User[];
  rooms: Room[];
  messages: Message[];
  reports: Report[];
  bans: BanRecord[];
  blockedPairs: [string, string][];
}

function getInitialDB(): Schema {
  return {
    users: [],
    rooms: [
      { id: 'general', name: 'Karachi Public Room 🏛️🇵🇰', type: 'public', participants: [] }
    ],
    messages: [], // Yahan khali array rakhein taake purane bots load na hon
    reports: [],
    bans: [],
    blockedPairs: []
  };
}

class MicroDatabase {
  private cache: Schema;

  constructor() {
    // Agar file maujood hai to use load karein, warna initial data
    this.cache = this.load();
    this.save(); 
  }

  private load(): Schema {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const fileContent = fs.readFileSync(STORE_PATH, 'utf8');
        const db = JSON.parse(fileContent);
        // Forcefully empty messages if you want to wipe bots every restart
        db.messages = []; 
        return db;
      }
    } catch (e) {
      console.error('Error loading DB', e);
    }
    return getInitialDB();
  }

  public save(): void {
    try {
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.cache, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save DB', e);
    }
  }

  // ... (Baaki saare methods wahi rahenge jo aapne pehle likhe the)
  public getMessages(): Message[] {
    return this.cache.messages;
  }

  public addMessage(msg: Message): void {
    this.cache.messages.push(msg);
    this.save();
  }
}

export const db = new MicroDatabase();
