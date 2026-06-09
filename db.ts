import fs from 'fs';
import path from 'path';
import { User, Room, Message, Report, BanRecord, AppStats } from './types';

const STORE_PATH = path.join(process.cwd(), 'karachi-db.json');

// Interface definition zaroori hai
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
    rooms: [{ id: 'general', name: 'Karachi Public Room 🏛️🇵🇰', type: 'public', participants: [] }],
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
    this.save();
  }

  private load(): Schema {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const fileContent = fs.readFileSync(STORE_PATH, 'utf8');
        return JSON.parse(fileContent);
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

  // Basic methods jo build ke liye zaroori hain
  public getMessages(): Message[] { return this.cache.messages; }
  public addMessage(msg: Message): void {
    this.cache.messages.push(msg);
    this.save();
  }
}

export const db = new MicroDatabase();
