import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, MessageSquare, Shuffle, Settings, LogOut, Send, 
  MapPin, Radio, Shield, HelpCircle, ChevronRight, Menu, X, Bell, Search
} from 'lucide-react';

// --- MOCK USER TYPES ---
interface User {
  id: string;
  username: string;
  avatar: string;
  status: 'online' | 'offline';
  role: 'user' | 'admin';
}

interface Room {
  id: string;
  name: string;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  roomId: string;
  message: string;
  createdAt: string;
}

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('khi_chat_token'));
  const [currUser, setCurrUser] = useState<User | null>(null);
  const [passedLoc, setPassedLoc] = useState(true);

  // App layouts
  const [currTab, setCurrTab] = useState<'public' | 'private' | 'settings'>('public');
  const [activeRoomId, setActiveRoomId] = useState<string>('general');
  const [activeRoomName, setActiveRoomName] = useState<string>('Karachiites Lounge 🏛️');
  const [activeDmUser, setActiveDmUser] = useState<User | null>(null);

  // Form states
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [userSearchText, setUserSearchText] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dummy Preloaded Data for Chat
  const [publicRooms] = useState<Room[]>([
    { id: 'general', name: 'Karachiites Lounge 🏛️' },
    { id: 'chai-shai', name: 'Chai Shai Corner ☕' },
    { id: 'clifton', name: 'Clifton Beach Point 🌊' },
    { id: 'saddar', name: 'Saddar Bazaar Chitchat 🛍️' },
  ]);

  const [chatUsers, setChatUsers] = useState<User[]>([
    { id: 'u2', username: 'Zain_Karachi', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zain', status: 'online', role: 'user' },
    { id: 'u3', username: 'Ayesha_Khi', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ayesha', status: 'online', role: 'user' },
    { id: 'u4', username: 'BiryaniKing', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Biryani', status: 'online', role: 'user' },
    { id: 'u5', username: ' TariqRoad_Rider', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Rider', status: 'online', role: 'user' },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', senderId: 'u2', senderName: 'Zain_Karachi', senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Zain', roomId: 'general', message: 'AoA bhaiyo! Kya chal raha hai Karachi mein aj?', createdAt: new Date().toISOString() },
    { id: 'm2', senderId: 'u3', senderName: 'Ayesha_Khi', senderAvatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Ayesha', roomId: 'general', message: 'Walaikum Assalam, bas garmi bohot hai aj to 🥵', createdAt: new Date().toISOString() }
  ]);

  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('khi_chat_user');
    if (savedUser && token) {
      setCurrUser(JSON.parse(savedUser));
    }
  }, [token]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // --- MOCK ACTIONS ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    const fakeUser: User = {
      id: 'u-me',
      username: usernameInput.trim(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${usernameInput}`,
      status: 'online',
      role: 'user'
    };

    localStorage.setItem('khi_chat_token', 'mock-valid-token-12345');
    localStorage.setItem('khi_chat_user', JSON.stringify(fakeUser));
    setToken('mock-valid-token-12345');
    setCurrUser(fakeUser);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currUser) return;

    const newMsg: Message = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      senderId: currUser.id,
      senderName: currUser.username,
      senderAvatar: currUser.avatar,
      roomId: currTab === 'public' ? activeRoomId : `private-${activeDmUser?.id}`,
      message: chatInput.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');

    // Simulate Fake Reply after 1.5 seconds to make chat look alive!
    setTimeout(() => {
      const randomUser = chatUsers[Math.floor(Math.random() * chatUsers.length)];
      const replies = [
        "Sahi baat hai bhai! 👍",
        "Zabardast yaar, maza aya sun ke.",
        "Hahaha sahi keh rahe ho 😂",
        "Chai peene chalein phir?",
        "Bhai ye system bohot fit banaya hai aapne!"
      ];
      const botMsg: Message = {
        id: 'msg-' + Math.random().toString(36).substring(2, 9),
        senderId: randomUser.id,
        senderName: randomUser.username,
        senderAvatar: randomUser.avatar,
        roomId: currTab === 'public' ? activeRoomId : `private-${activeDmUser?.id}`,
        message: replies[Math.floor(Math.random() * replies.length)],
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1500);
  };

  const handleLogout = () => {
    localStorage.removeItem('khi_chat_token');
    localStorage.removeItem('khi_chat_user');
    setToken(null);
    setCurrUser(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {!token ? (
        /* MOCK LOGIN SCREEN */
        <div className="flex-grow flex flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 z-10">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 font-black text-xl">PK</div>
              <h1 className="text-xl font-black text-slate-100">Karachi Public Chat</h1>
              <p className="text-xs text-slate-400">Saddar, Clifton, Gulshan, Nazimabad — Connect Safely!</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Enter username (e.g. ChaiShaiLover)"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/40"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Password</label>
                <input
                  type="password"
                  placeholder="Enter any password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/40"
                />
              </div>

              <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl text-xs transition duration-200 flex items-center justify-center gap-1.5 cursor-pointer">
                Enter Karachi Public Chat →
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* WORKSPACE WITH BYPASSED MOCK DATA */
        <div className="flex-grow flex overflow-hidden h-[100vh]">
          <aside className={`w-80 border-r border-slate-900 bg-slate-950 flex flex-col z-40 transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0 absolute inset-0' : '-translate-x-full absolute inset-y-0 left-0'}`}>
            <div className="p-5 border-b border-slate-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">K</div>
                <div>
                  <h2 className="text-sm font-black text-slate-100">Karachi Chat</h2>
                  <span className="text-[9px] text-emerald-400 font-bold block">STANDALONE MODE</span>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-900 rounded md:hidden"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-3 border-b border-slate-900">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search online Karachiites..."
                  value={userSearchText}
                  onChange={(e) => setUserSearchText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block px-2">🏛️ Lobbies</span>
                {publicRooms.map(room => (
                  <button
                    key={room.id}
                    onClick={() => { setCurrTab('public'); setActiveRoomId(room.id); setActiveRoomName(room.name); setSidebarOpen(false); }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${currTab === 'public' && activeRoomId === room.id ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-slate-400 hover:bg-slate-900'}`}
                  >
                    <span>#</span> {room.name}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase block px-2">💬 Online Users</span>
                {chatUsers
                  .filter(u => !userSearchText || u.username.toLowerCase().includes(userSearchText.toLowerCase()))
                  .map(user => (
                    <button
                      key={user.id}
                      onClick={() => { setCurrTab('private'); setActiveDmUser(user); setSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 ${currTab === 'private' && activeDmUser?.id === user.id ? 'bg-indigo-500/10 text-indigo-400 font-bold' : 'text-slate-400 hover:bg-slate-900'}`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {user.username}
                    </button>
                  ))}
              </div>
            </nav>

            <div className="p-4 border-t border-slate-900 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 truncate">
                <img src={currUser?.avatar} className="w-8 h-8 rounded-xl border border-slate-800" alt="avatar" />
                <div className="truncate">
                  <h4 className="text-xs font-bold text-slate-200 truncate">{currUser?.username}</h4>
                  <span className="text-[9px] text-emerald-400 block font-mono">LOCAL HOST</span>
                </div>
              </div>
              <button onClick={handleLogout} className="p-1.5 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-rose-400"><LogOut className="w-4 h-4" /></button>
            </div>
          </aside>

          <main className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
            <header className="bg-slate-950 border-b border-slate-900 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-slate-900 border border-slate-800 rounded md:hidden"><Menu className="w-5 h-5" /></button>
                <h2 className="text-sm font-black text-slate-100">
                  {currTab === 'public' ? activeRoomName : `Direct DM: ${activeDmUser?.username}`}
                </h2>
              </div>
              <div className="flex items-center space-x-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full font-mono text-[9px] text-slate-400">
                <MapPin className="w-3 h-3 text-emerald-400" />
                <span>Karachi Client Local</span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages
                .filter(m => currTab === 'public' ? m.roomId === activeRoomId : m.roomId === `private-${activeDmUser?.id}`)
                .map((m) => {
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
                placeholder="Type your message here..."
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
