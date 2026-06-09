// db.ts mein yeh function update karein
function getInitialDB(): Schema {
  return {
    users: [],
    rooms: [
      { id: 'general', name: 'Karachi Public Room 🏛️🇵🇰', type: 'public', participants: [] }
    ],
    messages: [], // Yahan khali array rakhein taake purane bots na aayein
    reports: [],
    bans: [],
    blockedPairs: []
  };
}
