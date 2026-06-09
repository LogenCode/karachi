import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Users, MessageSquare, Shuffle, ShieldCheck, Settings, LogOut, Send, 
  Smile, Image as ImageIcon, MapPin, Radio, Shield, HelpCircle, ChevronRight, Menu, X, Bell, Trash2, Heart, Search
} from 'lucide-react';

import { KarachiGateway } from './KarachiGateway';
import { AuthModal } from './AuthModal';
import { StrangerTab } from './StrangerTab';
import { AdminDashboard } from './AdminDashboard';
import { ProfileSettings } from './ProfileSettings';
import { User, Room, Message } from './types';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('khi_chat_token'));
  const [currUser, setCurrUser] = useState<User | null>(null);
  
  // Security Bypass Trigger: Hamesha true rahega taake Out-of-Region wala lock hamesha ke liye khul jaye!
  const [passedLoc, setPassedLoc] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Layout & Navigation State
  const [currTab, setCurrTab] = useState<'public' | 'private' | 'stranger' | 'admin' | 'settings'>('public');
  const [activeRoomId, setActiveRoomId] = useState<string>('general'); // default public channel id
  const [activeRoomName, setActiveRoomName] = useState<string>('Karachiites Lounge 🏛️');
  const [activeDmUser, setActiveDmUser] = useState<User | null>(null); // selected DM target user

  // Socket and Chat Data State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatUsers, setChatUsers] = useState<User[]>([]); // global online users list
  const [chatInput, setChatInput] = useState('');
  const [othersTyping, setOthersTyping] = useState<string[]>([]);
  const [unreads, setUnreads] = useState<{ [roomId: string]: number }>({});

  // Mobile sidebar controls
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Custom alerts toaster state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeout = useRef<NodeJS.Timeout | null>(null);

  // Sidebar real-time search state
  const [userSearchText, setUserSearchText] = useState('');
  // Active reaction popover track
  const [activeReactPopoverId, setActiveReactPopoverId] = useState<string | null>(null);

  // References
  const messageEndRef = useRef<HTMLDivElement>(null);
  const typingTimeout = useRef<NodeJS.Timeout | null>(null);
  const [meTyping, setMeTyping] = useState(false);

  // Closures refs to keep Socket.io alive across room switching
  const currTabRef = useRef(currTab);
  const activeRoomIdRef = useRef(activeRoomId);
  const activeDmUserRef = useRef(activeDmUser);
  const currUserRef = useRef(currUser);

  useEffect(() => { currTabRef.current = currTab; }, [currTab]);
  useEffect(() => { activeRoomIdRef.current = activeRoomId; }, [activeRoomId]);
  useEffect(() => { activeDmUserRef.current = activeDmUser; }, [activeDmUser]);
  useEffect(() => { currUserRef.current = currUser; }, [currUser]);

  // --- COMPONENT HELPERS ---
  const triggerToast = (msg: string) => {
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    setToastMessage(msg);
    toastTimeout.current = setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // 1. Check Auth Verification & Load Context on Startup
  const checkSession = async () => {
    const cachedToken = localStorage.getItem('khi_chat_token');
    if (!cachedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${cachedToken}` }
      });
      if (res.ok) {
        const user = await res.json();
        setCurrUser(user);
        setToken(cachedToken);
      } else {
        localStorage.removeItem('khi_chat_token');
        localStorage.removeItem('khi_chat_user');
        setToken(null);
        setCurrUser(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, [passedLoc]);

  // 2. Manage Socket.io connections & global listeners
  useEffect(() => {
    if (!token || !currUser || !passedLoc) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const socketInstance = io(window.location.origin, {
      reconnectionDelay: 2000,
      reconnectionDelayMax: 5000,
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      console.log('Connected to Karachi Realtime Engine');
      socketInstance.emit('auth:init', { token });
    });

    fetchPublicRoomList();
    fetchUsersDirectory();

    socketInstance.on('user:presence', (data: { id: string; username: string; status: string }) => {
      setChatUsers(prev => {
        return prev.map(u => {
          if (u.id === data.id) {
            return { ...u, status: data.status } as User;
          }
          return u;
        });
      });
    });

    socketInstance.on('chat:message', (msg: Message & { tempId?: string }) => {
      const currentTab = currTabRef.current;
      const currentActiveRoomId = activeRoomIdRef.current;
      const currentActiveDmUser = activeDmUserRef.current;
      const currentUser = currUserRef.current;

      if (!currentUser) return;

      const isViewingPublic = currentTab === 'public' && msg.msgType === 'public' && msg.roomId === currentActiveRoomId;
      const privateRoomId = currentActiveDmUser ? `private-${[currentUser.id, currentActiveDmUser.id].sort().join('-')}` : '';
      const isViewingPrivate = currentTab === 'private' && msg.msgType === 'private' && msg.roomId === privateRoomId;

      if (isViewingPublic || isViewingPrivate) {
        setMessages(prev => {
          if (msg.tempId && prev.some(m => m.id === msg.tempId)) {
            return prev.map(m => m.id === msg.tempId ? msg : m);
          }
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        socketInstance.emit('chat:seen', { messageId: msg.id, senderId: msg.senderId, roomId: msg.roomId });
      } else if (msg.msgType === 'private') {
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1487/1487-84.wav');
          audio.volume = 0.4;
          audio.play().catch(() => {});
        } catch (e) {}

        setUnreads(prev => ({
          ...prev,
          [msg.roomId]: (prev[msg.roomId] || 0) + 1
        }));
      }
    });

    socketInstance.on('chat:typing', (data: { roomId: string; username: string; isTyping: boolean }) => {
      const currentTab = currTabRef.current;
      const currentActiveRoomId = activeRoomIdRef.current;
      const currentActiveDmUser = activeDmUserRef.current;
      const currentUser = currUserRef.current;

      if (!currentUser) return;

      const activePrivateRoomId = currentActiveDmUser ? `private-${[currentUser.id, currentActiveDmUser.id].sort().join('-')}` : '';
      const matchesPublic = currentTab === 'public' && data.roomId === currentActiveRoomId;
      const matchesPrivate = currentTab === 'private' && data.roomId === activePrivateRoomId;

      if ((matchesPublic || matchesPrivate) && data.username !== currentUser.username) {
        setOthersTyping(prev => {
          if (data.isTyping) {
            if (prev.includes(data.username)) return prev;
            return [...prev, data.username];
          } else {
            return prev.filter(name => name !== data.username);
          }
        });
      }
    });

    const handleReaction = (data: { messageId: string; reactions: { [key: string]: string[] }; roomId: string }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          return { ...m, reactions: data.reactions };
        }
        return m;
      }));
    };

    socketInstance.on('chat:reaction', handleReaction);
    socketInstance.on('message:react', handleReaction);

    socketInstance.on('message:deleted', ({ messageId }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    });

    socketInstance.on('user:banned', ({ reason }) => {
      triggerToast(`Banned: This account has been locked. Reason: ${reason}`);
      handleLogout();
    });

    socketInstance.on('user:muted', () => {
      triggerToast(`You have been temporarily muted from messaging by modular administration.`);
    });

    socketInstance.on('error:toast', ({ message }) => {
      triggerToast(message);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [token, currUser, passedLoc]);

  const fetchPublicRoomList = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/rooms', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const rooms = await res.json();
        setPublicRooms(rooms);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsersDirectory = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const users = await res.json();
        setChatUsers(users);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMessages = async (roomId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const msgList = await res.json();
        setMessages(msgList);
        setOthersTyping([]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (currTab === 'public' && activeRoomId) {
      fetchMessages(activeRoomId);
    } else if (currTab === 'private' && activeDmUser && currUser) {
      const privateRoomId = `private-${[currUser.id, activeDmUser.id].sort().join('-')}`;
      fetchMessages(privateRoomId);
      setUnreads(prev => ({
        ...prev,
        [privateRoomId]: 0
      }));
    }
  }, [currTab, activeRoomId, activeDmUser]);

  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, othersTyping]);

  const handleAuthSuccess = (newToken: string, newUser: User) => {
    setToken(newToken);
    setCurrUser(newUser);
    triggerToast(`As-salamu alaykum, ${newUser.username}! Welcome to Karachi Public Chat. 🇵🇰`);
  };

  const handleLogout = () => {
    localStorage.removeItem('khi_chat_token');
    localStorage.removeItem('khi_chat_user');
    setToken(null);
    setCurrUser(null);
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket || !currUser) return;

    let targetRoomId = activeRoomId;
    let targetMsgType: 'public' | 'private' | 'random' = 'public';

    if (currTab === 'private' && activeDmUser) {
      targetRoomId = `private-${[currUser.id, activeDmUser.id].sort().join('-')}`;
      targetMsgType = 'private';
    }

    const tempId = 'optimistic-' + Math.random().toString(36).substring(2, 9);

    socket.emit('chat:message', {
      roomId: targetRoomId,
      message: chatInput.trim(),
      type: 'text',
      msgType: targetMsgType,
      tempId
    });

    const localMsg: Message = {
      id: tempId,
      senderId: currUser.id,
      senderName: currUser.username,
      senderAvatar: currUser.avatar,
      roomId: targetRoomId,
      message: chatInput.trim(),
      createdAt: new Date().toISOString(),
      type: 'text',
      msgType: targetMsgType,
      status: 'sent'
    };

    setMessages(prev => [...prev, localMsg]);
    setChatInput('');
    socket.emit('chat:typing', { roomId: targetRoomId, username: currUser.username, isTyping: false });
    setMeTyping(false);
  };

  const handleInputTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChatInput(e.target.value);
    if (!socket || !currUser) return;

    const currentTargetRoomId = currTab === 'private' && activeDmUser 
      ? `private-${[currUser.id, activeDmUser.id].sort().join('-')}` 
      : activeRoomId;

    if (!meTyping) {
      setMeTyping(true);
      socket.emit('chat:typing', { roomId: currentTargetRoomId, username: currUser.username, isTyping: true });
    }

    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('chat:typing', { roomId: currentTargetRoomId, username: currUser.username, isTyping: false });
      setMeTyping(false);
    }, 2000);
  };

  const deleteMsgAdmin = async (messageId: string) => {
    if (!currUser || currUser.role !== 'admin') return;
    try {
      const res = await fetch(`/api/admin/messages/${messageId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        triggerToast('Message retracted from global feeds');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const injectEmoji = (emoji: string) => {
    setChatInput(prev => prev + emoji);
  };

  const sendGif = (gifUrl: string) => {
    if (!socket || !currUser) return;
    let targetRoomId = activeRoomId;
    let targetMsgType: 'public' | 'private' | 'random' = 'public';

    if (currTab === 'private' && activeDmUser) {
      targetRoomId = `private-${[currUser.id, activeDmUser.id].sort().join('-')}`;
      targetMsgType = 'private';
    }

    const tempId = 'optimistic-gif-' + Math.random().toString(36).substring(2, 9);

    socket.emit('chat:message', {
      roomId: targetRoomId,
      message: gifUrl,
      type: 'gif',
      msgType: targetMsgType,
      tempId
    });

    const localMsg: Message = {
      id: tempId,
      senderId: currUser.id,
      senderName: currUser.username,
      senderAvatar: currUser.avatar,
      roomId: targetRoomId,
      message: gifUrl,
      createdAt: new Date().toISOString(),
      type: 'gif',
      msgType: targetMsgType,
      status: 'sent'
    };
    setMessages(prev => [...prev, localMsg]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 1. TOASTER OVERLAY BAR */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-slate-900 border border-emerald-500/30 px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 text-xs z-50 animate-bounce cursor-pointer text-slate-100" onClick={() => setToastMessage(null)}>
          <Bell className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. SECURITY GATEWAY CHECKS */}
      {!passedLoc ? (
        <div className="flex-1 flex items-center justify-center bg-slate-950 p-4">
          <KarachiGateway onPassed={setPassedLoc} bypass={currUser?.role === 'admin'} />
        </div>
      ) : !token ? (
        <div className="flex-grow flex flex-col items-center justify-center p-6 bg-slate-950 relative overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl"></div>
          
          <AuthModal onAuthSuccess={handleAuthSuccess} />
          
          <div className="mt-4 flex items-center gap-1 text-[11px] text-slate-500 font-mono">
            <span>By entering, you confirm location verification limits.</span>
            <button onClick={() => setPassedLoc(false)} className="text-emerald-400 underline uppercase" id="loc-gate-return">Reset filter</button>
          </div>
        </div>
      ) : (
        /* 3. CORE SECURE CHAT WORKSPACE */
        <div className="flex-grow flex overflow-hidden h-[100vh]">
          {/* LEFT SIDEBAR navigation drawer */}
          <aside className={`w-80 border-r border-slate-900/90 bg-slate-950 flex flex-col z-40 transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? 'translate-x-0 absolute inset-0' : '-translate-x-full absolute inset-y-0 left-0'}`}>
            <div className="p-5 border-b border-slate-900/95 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold">
                  K
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-100 tracking-wide">Karachi Chat</h2>
                  <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>GATEWAY SECURE</span>
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-1 hover:bg-slate-900 rounded md:hidden text-slate-400"
                id="close-sidebar-mobile"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-slate-900/90 bg-slate-950 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search online Karachiites..."
                  value={userSearchText}
                  onChange={(e) => setUserSearchText(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 font-sans focus:outline-none focus:border-indigo-500/50 transition-all font-mono"
                  id="user-search-input"
                />
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
              <div className="space-y-2">
                <span className="px-2 text-[10px] font-black uppercase text-slate-500 tracking-widest block">🏛️ Lobbies (Public Chats)</span>
                <div className="space-y-0.5">
                  {(publicRooms.length > 0 ? publicRooms : [
                    { id: 'general', name: 'Karachiites Lounge 🏛️', type: 'public', participants: [] },
                    { id: 'chai-shai', name: 'Chai Shai Corner ☕', type: 'public', participants: [] },
                    { id: 'clifton', name: 'Clifton Beach Point 🌊', type: 'public', participants: [] },
                    { id: 'saddar', name: 'Saddar Bazaar Chitchat 🛍️', type: 'public', participants: [] },
                    { id: 'banter', name: 'IBA vs SZABIST Banter 🎓', type: 'public', participants: [] },
                  ]).map((room) => {
                    const isSelected = currTab === 'public' && activeRoomId === room.id;
                    const count = unreads[room.id] || 0;
                    return (
                      <button
                        key={room.id}
                        onClick={() => {
                          setCurrTab('public');
                          setActiveRoomId(room.id);
                          setActiveRoomName(room.name);
                          setSidebarOpen(false);
                        }}
                        className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${isSelected ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-400' : 'text-slate-400 hover:bg-slate-900 status-hover'}`}
                        id={`lobby-chan-${room.id}`}
                      >
                        <span className="truncate flex items-center gap-1.5 font-mono">
                          <span className="text-slate-600 font-black">#</span>
                          <span>{room.name}</span>
                        </span>
                        {count > 0 && (
                          <span className="px-2 py-0.5 bg-indigo-500 text-slate-950 font-bold text-[9px] rounded-full">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2 animate-fade-in">
                <span className="px-2 text-[10px] font-black uppercase text-slate-500 tracking-widest block">💬 ACTIVE CHATS (DMs)</span>
                <div className="space-y-0.5">
                  {chatUsers
                    .filter(u => u.id !== currUser?.id)
                    .filter(u => !userSearchText || u.username.toLowerCase().includes(userSearchText.toLowerCase()))
                    .slice(0, 15)
                    .map(user => {
                      const isSelected = currTab === 'private' && activeDmUser?.id === user.id;
                      const dmRoomId = `private-${[currUser?.id, user.id].sort().join('-')}`;
                      const count = unreads[dmRoomId] || 0;

                      return (
                        <button
                          key={user.id}
                          onClick={() => {
                            setCurrTab('private');
                            setActiveDmUser(user);
                            setSidebarOpen(false);
                          }}
                          className={`w-full px-3 py-2 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all ${isSelected ? 'bg-indigo-500/10 text-indigo-400 font-bold border-l-2 border-indigo-400' : 'text-slate-400 hover:bg-slate-900 status-hover'}`}
                          id={`user-dm-${user.username}`}
                        >
                        <div className="flex items-center space-x-2 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${user.status === 'online' ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                          <span className="truncate">{user.username}</span>
                        </div>
                        {count > 0 && (
                          <span className="px-2 py-0.5 bg-indigo-500 text-slate-950 font-bold text-[9px] rounded-full">{count}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <span className="px-2 text-[10px] font-black uppercase text-slate-500 tracking-widest block font-sans">🎲 Roulettes & Settings</span>
                <div className="space-y-0.5 text-xs">
                  <button
                    onClick={() => { setCurrTab('stranger'); setSidebarOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-left font-semibold flex items-center space-x-2.5 transition-all ${currTab === 'stranger' ? 'bg-indigo-500/10 text-indigo-400 font-bold border-l-2 border-indigo-400' : 'text-slate-400 hover:bg-slate-900'}`}
                    id="trigger-stranger"
                  >
                    <Shuffle className="w-4 h-4 text-indigo-400 animate-spin-slow" />
                    <span>Stranger Roulette (Omegle)</span>
                  </button>

                  <button
                    onClick={() => { setCurrTab('settings'); setSidebarOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-left font-semibold flex items-center space-x-2.5 transition-all ${currTab === 'settings' ? 'bg-emerald-500/10 text-emerald-400 font-bold border-l-2 border-emerald-400' : 'text-slate-400 hover:bg-slate-900'}`}
                    id="trigger-settings"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Account Settings</span>
                  </button>

                  {currUser?.role === 'admin' && (
                    <button
                      onClick={() => { setCurrTab('admin'); setSidebarOpen(false); }}
                      className={`w-full px-3 py-2 rounded-xl text-left font-bold flex items-center space-x-2.5 transition-all ${currTab === 'admin' ? 'bg-red-500/10 text-red-400 border-l-2 border-red-400' : 'text-red-400/80 hover:bg-slate-900/60'}`}
                      id="trigger-admin"
                    >
                      <Shield className="w-4 h-4 animate-pulse text-red-500" />
                      <span>Admin Civic HQ</span>
                    </button>
                  )}
                </div>
              </div>
            </nav>

            <div className="p-4 bg-slate-950 border-t border-slate-900/95 flex items-center justify-between">
              <div className="flex items-center space-x-2.5 truncate">
                <img src={currUser?.avatar} alt="Me" referrerPolicy="no-referrer" className="w-9 h-9 rounded-xl border border-slate-800 object-cover shrink-0" />
                <div className="truncate text-left">
                  <h4 className="text-xs font-black text-slate-200 truncate">{currUser?.username}</h4>
                  <span className="text-[9px] text-emerald-400 font-mono font-bold tracking-tight block">KHI CORE NODE</span>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-slate-900 rounded-xl text-slate-550 hover:text-rose-400 transition cursor-pointer"
                title="Disconnect Gateway"
                id="btn-logout"
              >
                <LogOut className="w-4.5 h-4.5" />
              </button>
            </div>
          </aside>

          {/* MAIN CHAT LOBBIES PLATFORM VIEWPORT */}
          <main className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden relative">
            <header className="bg-slate-950 border-b border-slate-900 px-5 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 truncate">
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-1 px-2 hover:bg-slate-900 rounded md:hidden border border-slate-800 text-slate-350"
                  id="open-sidebar-mobile"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="text-left truncate">
                  <h2 className="text-sm font-black text-slate-100 tracking-wide flex items-center gap-1.5 truncate">
                    {currTab === 'public' && (
                      <>
                        <span className="text-emerald-400 font-bold font-mono">#</span>
                        <span className="truncate">{activeRoomName}</span>
                      </>
                    )}
                    {currTab === 'private' && activeDmUser && (
                      <>
                        <span className={`w-2 h-2 rounded-full ${activeDmUser.status === 'online' ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                        <span className="truncate">Direct DM: {activeDmUser.username}</span>
                      </>
                    )}
                    {currTab === 'stranger' && <span>Stranger Matching Roulette</span>}
                    {currTab === 'settings' && <span>System Account settings</span>}
                    {currTab === 'admin' && <span className="text-red-405 font-bold">Admin Civic HQ Panel</span>}
                  </h2>
                  <p className="text-[10px] text-slate-500 truncate">
                    {currTab === 'public' && 'Lobby Public Chat Board'}
                    {currTab === 'private' && 'Encrypted Private Conversation Node'}
                    {currTab === 'stranger' && 'Omegle matching module'}
                    {currTab === 'settings' && 'Personal credentials sync board'}
                    {currTab === 'admin' && 'Access limits database and logs'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <div className="hidden sm:flex items-center space-x-1 px-3 py-1 bg-slate-900/60 border border-slate-800 rounded-full font-mono text-[9px] text-slate-400">
                  <MapPin className="w-3 h-3 text-emerald-400" />
                  <span className="uppercase text-[8px] font-bold">IP LOC:</span>
                  <span className="text-slate-200"> Karachi Node</span>
                </div>
              </div>
            </header>

            <div className="flex-1 overflow-hidden relative">
              {currTab === 'public' || currTab === 'private' ? (
                <div className="absolute inset-0 flex flex-col">
                  <div className="flex-grow overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-slate-800 space-y-4" style={{ contentVisibility: 'auto' }}>
                    {messages.map((m) => {
                      const isMe = m.senderId === currUser?.id;
                      return (
                        <div key={m.id} className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse text-right' : 'text-left animate-fade-in'}`}>
                          <img src={m.senderAvatar} alt={m.senderName} referrerPolicy="no-referrer" className="w-8.5 h-8.5 rounded-xl border border-slate-850 bg-slate-900 object-cover mt-0.5 select-none" />
                          <div className={`space-y-1.5 max-w-[80vw] md:max-w-xl p-3.5 rounded-2xl relative ${isMe ? 'bg-emerald-500 text-slate-950 rounded-tr-none font-sans font-medium' : 'bg-slate-900 text-slate-200 border border-slate-850/80 rounded-tl-none'}`}>
                            <div className="flex items-center gap-2 justify-between">
                              <span className="text-[10px] font-black tracking-wide opacity-85 select-none font-sans">{m.senderName}</span>
                            </div>
                            <p className="text-xs break-words leading-relaxed selection:bg-indigo-500">{m.message}</p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messageEndRef} />
                  </div>

                  <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-900 shrink-0">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={handleInputTyping}
                        placeholder="Type your message..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/50"
                      />
                      <button type="submit" className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl transition">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </div>
              ) : currTab === 'stranger' ? (
                <StrangerTab token={token} currUser={currUser} socket={socket} />
              ) : currTab === 'settings' ? (
                <ProfileSettings token={token} currUser={currUser} onUserUpdate={setCurrUser} />
              ) : currTab === 'admin' ? (
                <AdminDashboard token={token} />
              ) : null}
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
