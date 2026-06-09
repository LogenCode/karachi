import React, { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { 
  Send, MapPin, Menu, X, LogOut, MessageSquare
} from 'lucide-react';

// --- CONFIGURATION ---
const PUSHER_KEY = '30aafd63cbfe8ec5ba7a'; 
const PUSHER_CLUSTER = 'ap2';

interface User {
  id: string;
  username: string;
  avatar: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  message: string;
  createdAt: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('khi_chat_token'));
  const [currUser, setCurrUser] = useState<User | null>(null);

  // Layouts
  const [chatInput, setChatInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  // Form states
  const [usernameInput, setUsernameInput] = useState('');
  const messageEndRef = useRef<HTMLDivElement>(null);

  // 1. Load User on Start
  useEffect(() => {
    const savedUser = localStorage.getItem('khi_chat_user');
    if (savedUser && token) {
      setCurrUser(JSON.parse(savedUser));
    }
  }, [token]);

  // 2. Connect to Real-time Pusher Channel
  useEffect(() => {
    if (!token) return;

    // Pusher setup
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
    });

    // Private channel standard format to allow client-events without backend
    // Note: Channel ka naam 'private-' se shuru hona lazmi hai client-trigger ke liye
    const channel = pusher.subscribe('private-karachi-room');

    // Naye message ko listen karne ke liye
    channel.bind('client-new-message', (data: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [token]);

  // Scroll to bottom automatic
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Handle Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    const uId = 'user-' + Math.random().toString(36).substring(2, 9);
    const fakeUser: User = {
      id: uId,
      username: usernameInput.trim(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${usernameInput}`,
    };

    localStorage.setItem('khi_chat_token', 'true');
    localStorage.setItem('khi_chat_user', JSON.stringify(fakeUser));
    setToken('true');
    setCurrUser(fakeUser);
  };

  // 4. Send Message (Directly Broadcast to other devices)
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currUser) return;

    const newMsg: Message = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      senderId: currUser.id,
      senderName: currUser.username,
      senderAvatar: currUser.avatar,
      message: chatInput.trim(),
      createdAt: new Date().toISOString()
    };

    // 1. Apni screen pr message dikhayein
    setMessages(prev => [...prev, newMsg]);
    setChatInput('');

    // 2. Internet ke zariye dusri device ko bhejhein
    try {
      const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER });
      const channel = pusher.subscribe('private-karachi-room');
      // Client trigger jo direct dusri device pr message fekega
      channel.trigger('client-new-message', newMsg);
    } catch (err) {
      console.log("Error sending message:", err);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setCurrUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {!token ? (
        <div className="flex-grow flex flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 z-10">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 font-black text-xl">PK</div>
              <h1 className="text-xl font-black text-slate-100">Karachi Live Chat</h1>
              <p className="text-xs text-slate-400">Real people, real-time connection across devices!</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Choose Nickname</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your name..."
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/40"
                />
              </div>
              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl text-xs transition duration-200 cursor-pointer">
                Join Chat Room →
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex overflow-hidden h-[100vh]">
          {/* SIDEBAR */}
          <aside className={`w-64 border-r border-slate-900 bg-slate-950 flex flex-col z-40 transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0 absolute inset-0' : '-translate-x-full absolute inset-y-0 left-0'}`}>
            <div className="p-5 border-b border-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">K</div>
                <h2 className="text-sm font-black text-slate-100">Lobby</h2>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-900 rounded md:hidden"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 p-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase block px-2 mb-2">🟢 Live Connection</span>
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-3 rounded-xl font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                # Karachiites-Room
              </div>
            </div>
            <div className="p-4 border-t border-slate-900 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 truncate">
                <img src={currUser?.avatar} className="w-8 h-8 rounded-xl border border-slate-800" alt="avatar" />
                <h4 className="text-xs font-bold text-slate-200 truncate">{currUser?.username}</h4>
              </div>
              <button onClick={handleLogout} className="p-1.5 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-rose-400"><LogOut className="w-4 h-4" /></button>
            </div>
          </aside>

          {/* CHAT SECTION */}
          <main className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
            <header className="bg-slate-950 border-b border-slate-900 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-slate-900 border border-slate-800 rounded md:hidden"><Menu className="w-5 h-5" /></button>
                <h2 className="text-sm font-black text-slate-100">Karachi Live Lounge 🏛️</h2>
              </div>
              <div className="flex items-center space-x-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full font-mono text-[9px] text-slate-400">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Pusher Server Active</span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m) => {
                const isMe = m.senderId === currUser?.id;
                return (
                  <div key={m.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <img src={m.senderAvatar} className="w-8 h-8 rounded-xl" alt="src" />
                    <div className={`p-3 rounded-2xl text-xs max-w-md ${isMe ? 'bg-emerald-500 text-slate-950 rounded-tr-none' : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-850'}`}>
                      <div className="text-[10px] font-black opacity-80 block mb-1">{m.senderName}</div>
                      <p className="break-words">{m.message}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-900 flex items-center space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a real-time message..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/40"
              />
              <button type="submit" className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl transition">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </main>
        </div>
      )}
    </div>
  );
}
