import React, { useState, useEffect, useRef } from 'react';
import Pusher from 'pusher-js';
import { 
  Users, MessageSquare, Shuffle, Settings, LogOut, Send, 
  MapPin, Radio, Shield, HelpCircle, ChevronRight, Menu, X, Bell, Search
} from 'lucide-react';

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
  const [token, setToken] = useState<string | null>(null);
  const [currUser, setCurrUser] = useState<User | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]); // Khali array
  const [usernameInput, setUsernameInput] = useState('');
  
  const messageEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('khi_chat_token');
    const savedUser = localStorage.getItem('khi_chat_user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setCurrUser(JSON.parse(savedUser));
    }
  }, []);

  useEffect(() => {
    if (!token || !currUser) return;

    pusherRef.current = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
    });

    channelRef.current = pusherRef.current.subscribe('private-karachi-room');

    channelRef.current.bind('client-new-message', (data: Message) => {
      setMessages((prev) => [...prev, data]);
    });

    return () => {
      if (channelRef.current) channelRef.current.unbind_all();
      if (pusherRef.current) pusherRef.current.disconnect();
    };
  }, [token, currUser]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    const uId = 'user-' + Math.random().toString(36).substring(2, 9);
    const userObj: User = {
      id: uId,
      username: usernameInput.trim(),
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${usernameInput}`,
    };

    localStorage.setItem('khi_chat_token', 'true');
    localStorage.setItem('khi_chat_user', JSON.stringify(userObj));
    setToken('true');
    setCurrUser(userObj);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !currUser || !channelRef.current) return;

    const newMsg: Message = {
      id: 'msg-' + Math.random().toString(36).substring(2, 9),
      senderId: currUser.id,
      senderName: currUser.username,
      senderAvatar: currUser.avatar,
      message: chatInput.trim(),
      createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, newMsg]);
    setChatInput('');
    channelRef.current.trigger('client-new-message', newMsg);
  };

  const handleLogout = () => {
    localStorage.clear();
    setToken(null);
    setCurrUser(null);
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {!token ? (
        <div className="flex-grow flex items-center justify-center p-6">
          <form onSubmit={handleLoginSubmit} className="w-full max-w-sm bg-slate-900 p-6 rounded-2xl border border-slate-800">
            <h1 className="text-xl font-black mb-4">Karachi Public Chat</h1>
            <input
              type="text"
              placeholder="Enter username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 mb-4 text-xs"
            />
            <button type="submit" className="w-full bg-emerald-500 py-3 rounded-xl text-xs font-bold text-slate-950">Enter</button>
          </form>
        </div>
      ) : (
        <div className="flex-grow flex h-screen overflow-hidden">
          <main className="flex-1 flex flex-col h-full bg-slate-950">
            <header className="border-b border-slate-900 p-4 flex justify-between items-center">
              <h2 className="text-sm font-bold">Karachiites Lounge</h2>
              <button onClick={handleLogout} className="text-rose-400 text-xs font-bold">Logout</button>
            </header>
            
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.senderId === currUser?.id ? 'justify-end' : ''}`}>
                  <div className={`p-3 rounded-2xl max-w-xs text-xs ${m.senderId === currUser?.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-900'}`}>
                    <div className="font-bold mb-0.5">{m.senderName}</div>
                    <div>{m.message}</div>
                  </div>
                </div>
              ))}
              <div ref={messageEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-900 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs"
              />
              <button type="submit" className="bg-emerald-500 p-3 rounded-xl"><Send className="w-4 h-4 text-slate-950" /></button>
            </form>
          </main>
        </div>
      )}
    </div>
  );
}
