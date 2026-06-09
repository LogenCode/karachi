# Karachi Public Chat 🇵🇰🏛️

Karachi Public Chat is a production-ready, highly localized full-stack web application designed as a real-time text chat platform inspired by Omegle and Discord. Built specifically for subnets within Karachi, Pakistan, the platform maintains active community lobbies, encrypted private direct messages, anonymous stranger-chat roulette matching, and robust administrative tools.

---

## 🚀 Key Features

### 1. Unified Authentication System
*   **JWT Sessions**: Secure session generation with standard `jsonwebtoken`.
*   **Password Hashing**: Salted secure hashes using `bcryptjs`.
*   **User Profiles**: Changeable custom nick-labels, email retrieval, and localized pre-configured portrait avatars.
*   **Presence Indicators**: Live status tags (**Online**, **Away**, **Offline**) synchronized instantly across sidebars.

### 2. Location-Based Access Lock (Karachi-Only)
*   **IP Intelligence**: Server-side parsing of client subnets.
*   **Sandbox Location Simulator**: Embedded coordinate controls, letting sandbox developers testing outside Pakistan inject Karachi IPs (e.g., PTCL subnet `39.40.120.32`) or bypass locks as admin monitors.
*   **Bypass Modules**: Administrators are immune to region locks to facilitate remote support logs.

### 3. Dedicated Lobbies (Public Chats)
*   **Main Rooms**: Preset chambers centering local icons:
    *   *Karachiites Lounge* 🏛️ (Principal public lobby)
    *   *Chai Shai Corner* ☕ (Hot debates and quick cookie/chai emojis)
    *   *Clifton Beach Point* 🌊 (Spicy corn and breezy arguments)
    *   *Saddar Bazaar Chitchat* 🛍️ (Fast-paced trading talk)
    *   *IBA vs SZABIST Banter* 🎓 (Biryani and elite debates)
*   **Typing States**: Animated alerts indicating active writing inside rooms.
*   **Auto Scroll**: Snappy chat stream focus matching incoming feeds.

### 4. Direct Messages (DMs)
*   **Private Rooms**: Encrypted routing generated dynamically on peer click.
*   **Receipt Synchronization**: Delivered/Sent ticks and dynamic seen indicators.
*   **Telemetry tracking**: Counters detailing unread items on sidebar slots.

### 5. Stranger Chat Roulette (Omegle mode)
*   **Matching Queue**: Socket.io-driven waiting lineup. High frequency matching combines waiters in dynamic chambers.
*   **Anonymous Toggle**: Ability to disguise usernames as "Anonymous Stranger".
*   **Skip-Next Router**: Re-queue immediately on tap of **Next Stranger**.
*   **Abuse Complaints**: Double-checks with reporting and blocking mechanisms.

### 6. Moderator Civic HQ (Admin Panel)
*   **Real-time Metrics**: KPI counters tracking registered counts, online peers, active private links, complaints, and bans.
*   **Directory Ledger**: Live searchable database containing user credentials, IP registers and active devices.
*   **Law Enforcement Modals**: Instant 15min Chat Mutes, customizable Temporary/Permanent Bans (kicking active TCP connections instantly).
*   **Report Auditing System**: Log review containing Snapshots of chat logs from reported sessions.
*   **Administrative Pruning**: Direct retraction/deletion of matching messages inside channels.

### 7. Moderation & Flood Defences
*   **Spam Rate Limiter**: Maximum block restricting rapid fire submission (checks last 3 timestamps to prevent flooding).
*   **Dirty Word Regex filter**: Automatic scrub list substituting matching words with safe characters.
*   **Block Pair Matrix**: Restricts matching or room synchronization for users block-listed by each other.

---

## 🛠️ Tech Stack & Design Architecture

*   **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide icons, Google Inter + Space Grotesk fonts.
*   **Backend**: Node.js, Express, Socket.io (using native WebSocket/polling protocols).
*   **Database**: File-backed SQL-like synchronous schema cache (`karachi-db.json`) persisting all items dynamically across server restarts.
*   **Packaging**: Bundled utilizing `esbuild` to a standalone `dist/server.cjs` file, bypassing ESM relative path loops on Cloud Run.

---

## 📦 Deployment Guide

### Deployment to Ubuntu VPS
1.  **Node Installation**: Install Node 20+:
    ```bash
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    ```
2.  **Repo Setup**: Clone repository and pull dependencies:
    ```bash
    npm install
    ```
3.  **Production build**:
    ```bash
    npm run build
    ```
4.  **Run with Process Manager (PM2)**:
    ```bash
    sudo npm install -y pm2 -g
    pm2 start dist/server.cjs --name "karachi-chat"
    pm2 save
    pm2 startup
    ```

### Containerized Sandbox (Docker)
A production-ready Dockerfile is ready. Create `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```
Build and run:
```bash
docker build -t karachi-chat .
docker run -p 3000:3000 --env JWT_SECRET="your-secret" karachi-chat
```
