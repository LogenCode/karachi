import React, { useState, useEffect } from 'react';
import { ShieldCheck, MapPin, AlertTriangle, RefreshCw, Radio, UserCheck } from 'lucide-react';

interface GatewayProps {
  onPassed: (passed: boolean) => void;
  bypass: boolean;
}

export const KarachiGateway: React.FC<GatewayProps> = ({ onPassed, bypass }) => {
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<{
    detectedIp: string;
    simulated: boolean;
    isWithinKarachi: boolean;
    city: string;
    country: string;
  } | null>(null);

  const [simIp, setSimIp] = useState('39.40.120.32'); // standard Karachi IP
  const [simKarachi, setSimKarachi] = useState(true);

  const fetchStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch('/api/location/status');
      const data = await res.json();
      setStatus(data);
      if (data.isWithinKarachi || bypass) {
        onPassed(true);
      } else {
        onPassed(false);
      }
    } catch (e) {
      console.error('Failed to resolve Karachi gateway status', e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSimulate = async () => {
    setChecking(true);
    try {
      await fetch('/api/location/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enableSim: true,
          simulatedIp: simIp,
          isWithinKarachi: simKarachi
        })
      });
      await fetchStatus();
    } catch (e) {
      console.error(e);
      setChecking(false);
    }
  };

  const handleClearSimulation = async () => {
    setChecking(true);
    try {
      await fetch('/api/location/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enableSim: false })
      });
      await fetchStatus();
    } catch (e) {
      console.error(e);
      setChecking(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-4 text-gray-100">
      <div className="w-full max-w-xl bg-slate-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Karachi Custom Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 p-6 border-b border-emerald-500/25 relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 font-black text-6xl select-none text-emerald-300">
            KHI
          </div>
          <div className="flex items-center space-x-3">
            <Radio className="w-6 h-6 text-emerald-400 animate-pulse" />
            <div>
              <h2 className="text-xl font-bold text-emerald-100 tracking-wide font-sans">Karachi Public Chat</h2>
              <p className="text-xs text-emerald-400/80">IP Geo-Restriction & Quality Control</p>
            </div>
          </div>
        </div>

        {/* Status Body */}
        <div className="p-6 space-y-6">
          {checking ? (
            <div className="flex flex-col items-center py-10 space-y-4">
              <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin" />
              <p className="text-sm text-slate-400">Verifying Karachi gateway subnet credentials...</p>
            </div>
          ) : (
            <>
              {/* Geolocation Verdict Card */}
              <div className={`p-5 rounded-xl border ${status?.isWithinKarachi ? 'bg-emerald-950/40 border-emerald-500/30' : 'bg-amber-950/30 border-amber-500/35'} space-y-3`}>
                <div className="flex items-start space-x-4">
                  {status?.isWithinKarachi ? (
                    <ShieldCheck className="w-12 h-12 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-12 h-12 text-amber-400 flex-shrink-0 animate-bounce" />
                  )}
                  <div>
                    <h3 className="text-lg font-bold">
                      {status?.isWithinKarachi ? 'Khush Amdeed — Gate Open ✅' : 'Out-of-Region Access Blocked 🚫'}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      {status?.isWithinKarachi 
                        ? 'Your connection belongs to the Karachi metropolitan subnet registry. Access is authorized.' 
                        : 'Karachi Public Chat restricts participation to locals to keep conversations highly relevant, regional, and safe.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-800 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-500 uppercase font-mono tracking-wider">Detected IP</span>
                    <p className="font-mono mt-1 font-semibold text-slate-100">{status?.detectedIp}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 uppercase font-mono tracking-wider">Estimated Region</span>
                    <p className="font-mono mt-1 font-semibold text-slate-100">{status?.city}, {status?.country}</p>
                  </div>
                </div>
              </div>

              {/* Developer Location Simulator Box */}
              <div className="p-5 bg-slate-950 rounded-xl border border-dashed border-slate-700/60 text-slate-300 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-200">Dev Preview Location Simulator</h4>
                    <p className="text-[11px] text-slate-500">Enable tests from non-Karachi containers instantly</p>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-950 border border-indigo-500/40 text-indigo-300 text-[10px] font-bold rounded-full font-mono uppercase">
                    Sandbox Tool
                  </span>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center space-x-3">
                    <label className="text-xs text-slate-400 w-24">Simulation state:</label>
                    <div className="flex items-center space-x-4">
                      <button 
                        onClick={() => setSimKarachi(true)}
                        className={`px-3 py-1 text-xs rounded-full font-semibold transition-all ${simKarachi ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}
                        id="loc-sim-karachi"
                      >
                        Inside Karachi
                      </button>
                      <button 
                        onClick={() => setSimKarachi(false)}
                        className={`px-3 py-1 text-xs rounded-full font-semibold transition-all ${!simKarachi ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}
                        id="loc-sim-lahore"
                      >
                        Outside Karachi
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <label className="text-xs text-slate-400 w-24" htmlFor="simIp">IP to Inject:</label>
                    <input 
                      id="simIp"
                      type="text" 
                      value={simIp} 
                      onChange={(e) => setSimIp(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-slate-200 w-44 focus:outline-none focus:border-indigo-500" 
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <button
                      onClick={handleSimulate}
                      className="flex-1 py-1.5 px-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:opacity-90 active:scale-98 transition text-xs text-slate-950 font-bold rounded-lg shadow-md"
                      id="sim-apply-btn"
                    >
                      Inject Simulated Geolocation
                    </button>
                    
                    {status?.simulated && (
                      <button
                        onClick={handleClearSimulation}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 rounded-lg border border-slate-600"
                        id="sim-clear-btn"
                      >
                        Reset Real IP
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Outside region instructions */}
              {!status?.isWithinKarachi && (
                <div className="text-center p-2 bg-rose-950/10 border border-rose-900/30 rounded-xl">
                  <p className="text-xs text-rose-300">
                     Are you visiting from outside Sindh/Karachi? Toggle **"Inside Karachi"** above and tap **"Inject Simulated Geolocation"** to instantly enter the chat lobbies!
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
