import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Shuffle, LogOut, ArrowRight, Sparkles, Send, Ban, Flag, ShieldAlert, AlertCircle, Volume2 } from 'lucide-react';
import { Message } from '../types';

interface StrangerTabProps {
  socket: Socket | null;
  currUser: any;
  onShowNotice: (msg: string) => void;
}

export const StrangerTab: React.FC<StrangerTabProps> = ({ socket, currUser, onShowNotice }) => {
  const [matchState, setMatchState] = useState<'idle' | 'searching' | 'matched'>('idle');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [partnerId, setPartnerId] = useState('');
  const [partnerName, setPartnerName] = useState('Anonymous Stranger');
  const [partnerIsAnon, setPartnerIsAnon] = useState(true);
  const [roomId, setRoomId] = useState('');
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);

  // Modals
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Abusive/Insensitive Language');
  
  const listRef = useRef<HTMLDivElement>(null);
  const partnerTypingTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('random:match', (data: { roomId: string; partyId: string; partyName: string; partyIsAnon: boolean }) => {
      setRoomId(data.roomId);
      setPartnerId(data.partyId);
      setPartnerName(data.partyName);
      setPartnerIsAnon(data.partyIsAnon);
      setMatchState('matched');
      setMessages([]);
      setPartnerTyping(false);
      // Play system notice sound
      try {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1487/1487-84.wav');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {}
    });

    socket.on('random:disconnected', (data: { message: string }) => {
      setMatchState('idle');
      setPartnerTyping(false);
      onShowNotice(data.message || 'Stranger left. Tap search to find another Karachi stranger.');
    });

    socket.on('chat:message', (msg: Message) => {
      if (msg.roomId === roomId || msg.msgType === 'random') {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        
        // Sound notice
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2357/2357-84.wav');
          audio.volume = 0.35;
          audio.play().catch(() => {});
        } catch (e) {}
      }
    });

    socket.on('chat:typing', (data: { roomId: string; username: string; isTyping: boolean }) => {
      if (data.roomId === roomId) {
        setPartnerTyping(data.isTyping);
      }
    });

    return () => {
      socket.off('random:match');
      socket.off('random:disconnected');
      socket.off('chat:message');
      socket.off('chat:typing');
    };
  }, [socket, roomId]);

  // Scroll handler
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, partnerTyping]);

  const handleStartSearch = () => {
    if (!socket) return;
    setMatchState('searching');
    socket.emit('random:join', { isAnonymous });
  };

  const handleStopSearch = () => {
    if (!socket) return;
    setMatchState('idle');
    socket.emit('random:leave');
  };

  const handleDisconnect = () => {
    if (!socket) return;
    socket.emit('random:leave');
    setMatchState('idle');
  };

  const handleNextStranger = () => {
    if (!socket) return;
    socket.emit('random:leave');
    setMatchState('searching');
    socket.emit('random:join', { isAnonymous });
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !socket || matchState !== 'matched') return;

    socket.emit('chat:message', {
      roomId,
      message: inputValue.trim(),
      type: 'text',
      msgType: 'random'
    });

    // Add locally immediately (Optimistic Update)
    const localMsg: Message = {
      id: 'local-' + Math.random().toString(),
      senderId: currUser?.id || 'me',
      senderName: isAnonymous ? 'You' : (currUser?.username || 'You'),
      senderAvatar: currUser?.avatar || '',
      roomId,
      message: inputValue.trim(),
      createdAt: new Date().toISOString(),
      type: 'text',
      msgType: 'random'
    };

    setMessages(prev => [...prev, localMsg]);
    setInputValue('');
    
    // Stop typing state
    socket.emit('chat:typing', { roomId, username: currUser?.username, isTyping: false });
    setIsTyping(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    
    if (!socket || matchState !== 'matched') return;

    if (!isTyping) {
      setIsTyping(true);
      socket.emit('chat:typing', { roomId, username: currUser?.username, isTyping: true });
    }

    // Reset typing timeout
    if (partnerTypingTimeout.current) clearTimeout(partnerTypingTimeout.current);
    partnerTypingTimeout.current = setTimeout(() => {
      socket.emit('chat:typing', { roomId, username: currUser?.username, isTyping: false });
      setIsTyping(false);
    }, 2000);
  };

  const handleReportSubmit = () => {
    if (!socket || !partnerId) return;
    const evidenceLogs = messages.slice(-5).map(m => `${m.senderName}: ${m.message}`).join('\n');
    socket.emit('user:report', {
      targetId: partnerId,
      reason: reportReason,
      chatType: 'random',
      evidence: evidenceLogs
    });
    setShowReportModal(false);
    onShowNotice('Stranger has been reported. Admin moderators will review this chat session.');
  };

  const handleBlockPartner = () => {
    if (!socket || !partnerId) return;
    socket.emit('user:block', { targetId: partnerId });
    handleDisconnect();
    onShowNotice('Stranger has been blocked. You will not be matched with them again.');
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden relative">
      {/* Tab Header bar */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-rose-950/20">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-slate-100 shadow-md">
            <Shuffle className="w-5 h-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">Karachi Stranger Roulette (Omegle mode)</h3>
            <p className="text-[10px] text-slate-400">Match raw text chats with online local strangers anonymous</p>
          </div>
        </div>

        {matchState === 'matched' && (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="p-2 bg-slate-800/60 hover:bg-rose-950/40 text-rose-400 rounded-lg transition-all focus:outline-none"
              title="Report Stranger"
              id="stranger-report"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              onClick={handleBlockPartner}
              className="p-2 bg-slate-800/60 hover:bg-slate-700 hover:text-slate-200 text-slate-400 rounded-lg transition-all focus:outline-none"
              title="Block Stranger"
              id="stranger-block"
            >
              <Ban className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Sandbox Frame */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800" ref={listRef}>
        
        {matchState === 'idle' && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center">
              <Sparkles className="w-9 h-9 text-indigo-400" />
            </div>
            
            <div className="max-w-xs space-y-2">
              <h4 className="text-base font-bold text-slate-250">Find a Karachi Stranger</h4>
              <p className="text-xs text-slate-400 font-sans tracking-wide leading-relaxed">
                Connect dynamically with random verified online Karachiites. No phone number, no profile required, purely text safety.
              </p>
            </div>

            {/* Anonymous mode selector */}
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex items-center justify-between w-full max-w-sm">
              <div className="text-left">
                <span className="text-xs font-bold block text-slate-300">Set Anonymous Mode</span>
                <span className="text-[10px] text-slate-400">Conceal your nickname as "Anonymous Stranger"</span>
              </div>
              <button
                onClick={() => setIsAnonymous(!isAnonymous)}
                className={`w-12 h-6 rounded-full p-1 transition-all ${isAnonymous ? 'bg-indigo-500' : 'bg-slate-700'}`}
                id="toggle-anonymous"
              >
                <div className={`w-4 h-4 rounded-full bg-slate-950 transition-transform ${isAnonymous ? 'translate-x-6' : 'translate-x-0'}`}></div>
              </button>
            </div>

            <button
              onClick={handleStartSearch}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-rose-500 hover:opacity-95 text-slate-950 hover:scale-[1.02] active:scale-98 text-sm font-black rounded-xl shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
              id="search-stranger"
            >
              <span>Match Stranger Now</span>
              <Shuffle className="w-4 h-4" />
            </button>
          </div>
        )}

        {matchState === 'searching' && (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center animate-ping absolute top-0 left-0"></div>
              <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center relative z-10">
                <Shuffle className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            </div>

            <div className="max-w-xs space-y-1">
              <h4 className="text-sm font-bold text-slate-200">Searching and Pairing...</h4>
              <p className="text-xs text-slate-400/90 font-mono">Matched by city-node subnets. Waiting for stranger connection.</p>
            </div>

            <button
              onClick={handleStopSearch}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-850 text-slate-400 text-xs rounded-lg border border-slate-800 transition"
              id="cancel-searching"
            >
              Cancel Match
            </button>
          </div>
        )}

        {matchState === 'matched' && (
          <div className="space-y-4">
            {/* Disclaimer notice */}
            <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl leading-relaxed text-[11px] text-indigo-300 flex items-start gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
              <span>
                Connected! Say Salaam to start. Always practice civility. You can quickly double tap **Next Stranger** or report harassment if you encounter abusers.
              </span>
            </div>

            {/* Converations flow */}
            {messages.map((m) => {
              const isMe = m.senderId === currUser?.id || m.senderId === 'me';
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80vw] sm:max-w-md p-3.5 rounded-2xl relative ${isMe ? 'bg-indigo-600 text-slate-950 rounded-tr-none' : 'bg-slate-900 text-slate-200 rounded-tl-none border border-slate-850'}`}>
                    <span className="text-[10px] block opacity-85 select-none font-bold mb-1">
                      {isMe ? 'You' : m.senderName}
                    </span>
                    <p className="text-sm font-sans tracking-wide leading-relaxed break-words">{m.message}</p>
                    <span className="text-[9px] block opacity-50 text-right mt-1 font-mono">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Partner Typing status bubble */}
            {partnerTyping && (
              <div className="flex justify-start">
                <div className="bg-slate-900 p-3 rounded-2xl rounded-tl-none border border-slate-850 flex items-center space-x-1.5 animate-pulse">
                  <span className="text-xs text-slate-400 font-mono">{partnerName} is typing...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MATCHED CONTROL FOOTEER */}
      {matchState === 'matched' && (
        <div className="bg-slate-900/90 border-t border-slate-800/80 p-4 shrink-0 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="flex gap-2 flex-grow-0">
            <button
              onClick={handleDisconnect}
              className="py-3 px-4 bg-red-950/20 hover:bg-red-950/40 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold transition flex items-center justify-center space-x-1.5 focus:outline-none"
              title="Stop Match"
              id="disconnect-stranger"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Stop</span>
            </button>
            <button
              onClick={handleNextStranger}
              className="py-3 px-4 bg-slate-850 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-200 text-xs font-bold transition flex items-center justify-center space-x-1.5 focus:outline-none cursor-pointer"
              title="Next Match Room"
              id="next-stranger"
            >
              <Shuffle className="w-4 h-4 text-emerald-400" />
              <span>Next</span>
            </button>
          </div>

          <form onSubmit={handleSend} className="flex-1 flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Aa, likhiya yaar karachi ki gupshup..."
              className="flex-1 bg-slate-950 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all font-sans"
              id="stranger-chat-input"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-4.5 bg-indigo-500 hover:opacity-95 text-slate-950 font-bold rounded-xl transition-all shadow-md flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              id="stranger-chat-submit"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* REPORT POPUP MODAL */}
      {showReportModal && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/20 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-400">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <h4 className="font-bold text-slate-100">Report Karachi Stranger</h4>
            </div>

            <p className="text-xs text-slate-300 font-sans tracking-wide leading-relaxed">
              Moderators take reports seriously. The system will log a snapshot of the last few chat messages for admin authentication.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 block" htmlFor="report-reason-select">Reason for Report:</label>
              <select
                id="report-reason-select"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-rose-500"
              >
                <option value="Abusive/Insensitive Language">Abusive/Insensitive Language</option>
                <option value="Promotional spam/Scammer node">Promotional spam/Scammer node</option>
                <option value="Inappropriate explicit topics">Inappropriate explicit topics</option>
                <option value="Impersonation / Cyber Bullying">Impersonation / Cyber Bullying</option>
                <option value="Out of Region Bypass Hack">Out of Region Bypass Hack</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-xs text-slate-300 rounded-lg"
                id="report-cancel-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleReportSubmit}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold text-xs rounded-lg"
                id="report-submit-btn"
              >
                File Abuse Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
