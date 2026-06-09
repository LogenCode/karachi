// db.ts - Clean Version
import fs from 'fs';
import path from 'path';
import { User, Room, Message, Report, BanRecord, AppStats } from './types';

const STORE_PATH = path.join(process.cwd(), 'karachi-db.json');

function getInitialDB(): Schema {
  return {
    users: [],
    rooms: [{ id: 'general', name: 'Karachi Public Room 🏛️🇵🇰', type: 'public', participants: [] }],
    messages: [], // Yahan messages khali honge
    reports: [],
    bans: [],
    blockedPairs: []
  };
}

// ... baaki class MicroDatabase ka code wahi rahega, 
// bas constructor mein aur load() mein 'messages' ko hamesha empty array rakhna.
