import React, { useState } from 'react';
import { User, KeyRound, Image, CheckCircle, RefreshCw, Layers } from 'lucide-react';
import { User as UserType } from '../types';

interface ProfileSettingsProps {
  token: string;
  currUser: UserType;
  onUpdateUser: (newUser: any) => void;
  onShowNotice: (msg: string) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1527983359383-4758693f760c?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&h=120&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=120&h=120&q=80',
];

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ token, currUser, onUpdateUser, onShowNotice }) => {
  const [username, setUsername] = useState(currUser.username);
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(currUser.avatar);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);
    try {
      const body: any = { username, avatar: selectedAvatar };
      if (password) body.password = password;

      const res = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess(true);
        onUpdateUser(data.user);
        onShowNotice('Gup-shup account information updated successfully!');
        localStorage.setItem('khi_chat_user', JSON.stringify(data.user));
        setPassword('');
      } else {
        onShowNotice(data.error || 'Failed to apply profile changes');
      }
    } catch (err) {
      onShowNotice('Network timeout during sync');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 rounded-2xl border border-slate-800/80 overflow-hidden relative">
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between border-b border-slate-800/60">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-indigo-500 flex items-center justify-center text-slate-100 shadow-md">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200 font-sans">Saanp aur Sidhi Account Settings</h3>
            <p className="text-[10px] text-slate-400">Configure your nickname and secure credential layers</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-none">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-sm mx-auto pt-4" id="profile-settings-form">
          {/* User badge */}
          <div className="flex items-center space-x-4 p-4 bg-slate-900/40 border border-slate-850 rounded-xl">
            <img src={selectedAvatar} alt="preview" referrerPolicy="no-referrer" className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500/20" />
            <div>
              <span className="text-[10px] font-mono tracking-wider font-bold text-slate-500 uppercase">Current Badge</span>
              <h4 className="text-sm font-black text-slate-105">{username}</h4>
              <span className="text-[9px] font-mono text-slate-450 block">{currUser.email}</span>
            </div>
          </div>

          {/* Preset Avatars */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Select Karachi Portrait Graphic</label>
            <div className="grid grid-cols-6 gap-2">
              {PRESET_AVATARS.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedAvatar(url)}
                  className={`w-full aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-transform duration-200 active:scale-95 ${selectedAvatar === url ? 'border-emerald-400 scale-105' : 'border-slate-800 hover:border-slate-700'}`}
                >
                  <img src={url} alt="portrait" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Nickname input */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="prof-uname">Modifiable Nickname</label>
            <input
              id="prof-uname"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Clifton_King"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-all font-mono"
            />
          </div>

          {/* Secure password changes */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2" htmlFor="prof-pass">New Secure Password</label>
            <input
              id="prof-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty if unchanged"
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 transition-all font-mono"
            />
          </div>

          {/* Button indicators */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-indigo-500 hover:opacity-95 text-slate-950 font-bold py-3 px-4 rounded-xl shadow-lg transition-transform active:scale-98 text-xs flex items-center justify-center space-x-1.5 cursor-pointer"
              id="save-profile"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Applying Changes...' : 'Save Gup Shup Profile'}</span>
            </button>
          </div>

          {success && (
            <div className="flex items-center justify-center space-x-1.5 p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs font-mono font-bold animate-fade-in">
              <CheckCircle className="w-4 h-4" />
              <span>Account Credentials Synchronized!</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
