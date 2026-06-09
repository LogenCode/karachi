import React, { useState, useEffect } from 'react';
import { ShieldCheck, Users, Signal, Ban, Flag, MessageSquare, Trash, Lock, Unlock, Eye, Sparkles, RefreshCw, VolumeX } from 'lucide-react';
import { User, Report, BanRecord, AppStats } from '../types';

interface AdminDashboardProps {
  token: string;
  onRefreshStats: () => void;
  onShowNotice: (msg: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onRefreshStats, onShowNotice }) => {
  const [subTab, setSubTab] = useState<'kpi' | 'users' | 'reports'>('kpi');
  const [stats, setStats] = useState<AppStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetIdForBan, setTargetIdForBan] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('Spam/Harassment behaviour');
  const [banDuration, setBanDuration] = useState('24'); // hours
  const [searchQuery, setSearchQuery] = useState('');

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadReports = async () => {
    try {
      const res = await fetch('/api/admin/reports', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const reloadAll = async () => {
    setLoading(true);
    await Promise.all([loadStats(), loadUsers(), loadReports()]);
    setLoading(false);
  };

  useEffect(() => {
    reloadAll();
  }, [subTab]);

  const handleBanUser = async () => {
    if (!targetIdForBan) return;
    try {
      const res = await fetch(`/api/admin/users/${targetIdForBan}/ban`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reason: banReason, duration: banDuration })
      });
      if (res.ok) {
        onShowNotice('User banned successfully');
        setTargetIdForBan(null);
        reloadAll();
        onRefreshStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLiftBan = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/unban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onShowNotice('User ban lifted');
        reloadAll();
        onRefreshStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMuteUser = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/users/${id}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ durationMinutes: 15 })
      });
      if (res.ok) {
        onShowNotice('User muted from public chats for 15 minutes');
        reloadAll();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        onShowNotice('Abuse Report dissolved.');
        loadReports();
        loadStats();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.ipAddress.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-red-500/25 overflow-hidden">
      {/* Control Banner */}
      <div className="bg-gradient-to-r from-red-950/40 via-slate-900 to-slate-900 px-6 py-4 flex items-center justify-between border-b border-rose-500/15">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-slate-100 shadow-md">
            <Lock className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-300 flex items-center gap-1.5">
              <span>Karachi Civic HQ</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </h3>
            <p className="text-[10px] text-slate-400">Moderator Analytics and Ban Panel</p>
          </div>
        </div>

        <button 
          onClick={reloadAll}
          className="p-2 hover:bg-slate-800 rounded-lg text-slate-450 transition"
          title="Reload system feeds"
          id="admin-reload"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Sub Tabs control bar */}
      <div className="bg-slate-900/40 flex border-b border-slate-850">
        <button
          onClick={() => setSubTab('kpi')}
          className={`flex-1 py-3 text-xs font-bold tracking-wide transition-all ${subTab === 'kpi' ? 'text-red-400 border-b-2 border-red-400 bg-red-950/10' : 'text-slate-400 hover:text-slate-200'}`}
          id="subtab-kpi"
        >
          Analytics Dashboard
        </button>
        <button
          onClick={() => setSubTab('users')}
          className={`flex-1 py-3 text-xs font-bold tracking-wide transition-all ${subTab === 'users' ? 'text-red-400 border-b-2 border-red-400 bg-red-950/10' : 'text-slate-400 hover:text-slate-200'}`}
          id="subtab-users"
        >
          Directory & Ban controls
        </button>
        <button
          onClick={() => setSubTab('reports')}
          className={`flex-1 py-3 text-xs font-bold tracking-wide transition-all ${subTab === 'reports' ? 'text-red-400 border-b-2 border-red-400 bg-red-950/10' : 'text-slate-400 hover:text-slate-200'}`}
          id="subtab-reports"
        >
          Abuse Reports ({reports.length})
        </button>
      </div>

      {/* Frame body */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-800 relative">
        {subTab === 'kpi' && stats && (
          <div className="space-y-6">
            {/* Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Total Registrations</span>
                <span className="text-2xl font-mono text-slate-100 font-bold">{stats.totalUsers}</span>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <Signal className="w-5 h-5 text-emerald-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Active Online</span>
                <span className="text-2xl font-mono text-slate-100 font-bold">{stats.onlineUsers}</span>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <MessageSquare className="w-5 h-5 text-blue-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Private Link Rooms</span>
                <span className="text-2xl font-mono text-slate-100 font-bold">{stats.activeDMsCount}</span>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <Flag className="w-5 h-5 text-amber-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Active Complaints</span>
                <span className="text-2xl font-mono text-slate-100 font-bold">{stats.reportsCount}</span>
              </div>

              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2 col-span-2 md:col-span-1">
                <Ban className="w-5 h-5 text-red-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Total Bans Tracked</span>
                <span className="text-2xl font-mono text-slate-100 font-bold">{stats.bannedUsersCount}</span>
              </div>
            </div>

            {/* Simulated Server Info */}
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
              <span className="text-[10px] uppercase font-bold tracking-wider text-red-400 block">Civic Engine Console</span>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono text-slate-350">
                <div>
                  <span className="text-slate-500">DATABASE STATUS:</span> <span className="text-emerald-400 font-bold">ONLINE (SQL-File cache)</span>
                </div>
                <div>
                  <span className="text-slate-500">PEER NETWORK:</span> <span className="text-indigo-400 font-bold">SOCKET-IO SERVER V4</span>
                </div>
                <div>
                  <span className="text-slate-500">FLOOD CONTROLLERS:</span> <span className="text-slate-200">ACTIVE (3msg/1.5s Rate limit)</span>
                </div>
                <div>
                  <span className="text-slate-500">MUTING TRIGGERS:</span> <span className="text-slate-200">15m Global timeout</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {subTab === 'users' && (
          <div className="space-y-4">
            {/* Search inputs */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by Username, Email or IP Subnet..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-red-500"
              id="admin-search-users"
            />

            {/* List */}
            <div className="space-y-3">
              {filteredUsers.map(u => (
                <div key={u.id} className="p-4 bg-slate-900 rounded-xl border border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3">
                    <img src={u.avatar} alt={u.username} referrerPolicy="no-referrer" className="w-10 h-10 rounded-xl border border-slate-800 object-cover" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-100">{u.username}</span>
                        {u.role === 'admin' && (
                          <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-500/30 text-[9px] font-bold rounded-full">Admin</span>
                        )}
                        {u.isBanned && (
                          <span className="px-2 py-0.5 bg-rose-950 text-rose-300 border border-rose-500/20 text-[9px] font-bold rounded-full">Banned</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">{u.email}</span>
                      <span className="text-[9px] text-slate-550 block font-mono">IP: {u.ipAddress} | {u.device.substring(0, 20)}</span>
                    </div>
                  </div>

                  {u.role !== 'admin' && (
                    <div className="flex gap-2 justify-end">
                      {u.isBanned ? (
                        <button
                          onClick={() => handleLiftBan(u.id)}
                          className="px-3 py-1.5 bg-emerald-500 hover:opacity-95 text-slate-950 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                          id={`unban-${u.id}`}
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Lift Ban</span>
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleMuteUser(u.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                            id={`mute-${u.id}`}
                          >
                            <VolumeX className="w-3.5 h-3.5 text-amber-400" />
                            <span>Mute (15m)</span>
                          </button>
                          
                          <button
                            onClick={() => setTargetIdForBan(u.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-slate-950 font-bold text-[10px] rounded-lg transition flex items-center gap-1 cursor-pointer"
                            id={`ban-trigger-${u.id}`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Ban Out</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {subTab === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs font-mono">
                ✅ Clean sheet! No active complaints lodged by users.
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map(r => (
                  <div key={r.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                      <div>
                        <span className="text-[10px] text-slate-450 font-mono">CLIENT COMPLAINT ID: {r.id}</span>
                        <div className="text-xs text-slate-200 mt-0.5">
                          Reporter: <span className="text-slate-100 font-bold">{r.reporterUsername}</span> ➡️ Accused: <span className="text-red-400 font-bold">{r.reportedUsername}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteReport(r.id)}
                        className="p-1 px-2.5 bg-slate-800 hover:bg-rose-950/20 text-slate-400 hover:text-rose-400 rounded text-[10px] border border-slate-750 font-medium transition"
                        id={`dismiss-rep-${r.id}`}
                      >
                        Dismiss
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">LODGED COMPLAINT REASON:</span>
                      <p className="text-xs text-amber-300 font-sans">{r.reason}</p>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850">
                      <span className="text-[9px] text-slate-500 font-mono block mb-1">EVIDENCE LOG SNAPSHOT:</span>
                      <pre className="text-[10px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">{r.evidence}</pre>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => {
                          setTargetIdForBan(r.reportedUserId);
                          setBanReason(`Abuse complaint lodged: ${r.reason}`);
                        }}
                        className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-slate-950 font-bold text-[10px] rounded-lg transition"
                        id={`ban-accused-${r.id}`}
                      >
                        Ban accused stranger instantly
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* BAN CONFIRM MODAL DIALOG */}
      {targetIdForBan && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-red-500/20 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h4 className="font-bold text-slate-100 flex items-center gap-2 text-sm text-red-400">
              <Ban className="w-4 h-4 animate-bounce" />
              <span>Conclude Ban Prosecution</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1" htmlFor="ban-reason-input">Reason of Ban:</label>
                <input
                  id="ban-reason-input"
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Banning Duration:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setBanDuration('2')}
                    className={`py-1 text-[10px] font-bold border rounded ${banDuration === '2' ? 'bg-red-950/40 text-red-400 border-red-500/30' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    2 Hours
                  </button>
                  <button
                    onClick={() => setBanDuration('24')}
                    className={`py-1 text-[10px] font-bold border rounded ${banDuration === '24' ? 'bg-red-950/40 text-red-400 border-red-500/30' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    24 Hours
                  </button>
                  <button
                    onClick={() => setBanDuration('permanent')}
                    className={`py-1 text-[10px] font-bold border rounded ${banDuration === 'permanent' ? 'bg-red-950/40 text-red-400 border-red-500/30' : 'bg-slate-950 border-slate-800 text-slate-400'}`}
                  >
                    Permanent
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-850">
              <button
                onClick={() => setTargetIdForBan(null)}
                className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-750 text-xs text-slate-350 rounded-lg"
                id="ban-modal-cancel"
              >
                Abstain
              </button>
              <button
                onClick={handleBanUser}
                className="flex-1 py-1.5 bg-red-600 hover:bg-red-500 text-slate-950 font-bold text-xs rounded-lg"
                id="ban-modal-commit"
              >
                Execute Ban Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
