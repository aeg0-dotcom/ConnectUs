import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Server, Users, Info, X, Shield, Database, Cpu, Globe, Loader2, AlertCircle } from 'lucide-react';

interface LobbyProps {
  onJoin: (name: string, roomId: string | null) => void;
  isLoading?: boolean;
  error?: string | null;
}

export const Lobby: React.FC<LobbyProps> = ({ onJoin, isLoading = false, error = null }) => {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [showInfo, setShowInfo] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (mode === 'join' && !roomId.trim()) return;
    onJoin(name, mode === 'join' ? roomId : null);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-black flex items-center justify-center p-4 overflow-hidden">
      {/* Background Effect - Subtle Radial Gradient instead of Image for "Pitch Black" feel */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle at 50% 50%, #1e1f22 0%, #000000 100%)' }}
      ></div>
      
      <div className="relative z-10 w-full max-w-md bg-[#1e1f22] p-8 rounded-xl shadow-2xl border border-[#2b2d31]">
        
        {/* Info Button */}
        <button 
          onClick={() => setShowInfo(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-nexus-accent transition-colors"
          title="Privacy & Architecture Info"
        >
          <Info size={20} />
        </button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">ConnectUs</h1>
          <p className="text-gray-400">Serverless, Local-Host Chat.</p>
        </div>

        {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-200 text-sm">
                <AlertCircle size={18} className="shrink-0 text-red-400" />
                <span>{error}</span>
            </div>
        )}

        <div className="flex bg-[#111214] p-1 rounded-lg mb-6">
          <button
            onClick={() => setMode('create')}
            disabled={isLoading}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'create' ? 'bg-[#35373c] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Create
          </button>
          <button
            onClick={() => setMode('join')}
            disabled={isLoading}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'join' ? 'bg-[#35373c] text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Join
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Display Name"
            placeholder="Enter your username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            disabled={isLoading}
            className="!bg-[#111214] !text-white disabled:opacity-50"
          />

          {mode === 'join' && (
            <Input
              label="Invite Code"
              placeholder="Paste the Invite Code here"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              disabled={isLoading}
              className="!bg-[#111214] !text-white disabled:opacity-50"
            />
          )}

          <div className="pt-2">
            <Button fullWidth type="submit" disabled={isLoading || !name.trim() || (mode === 'join' && !roomId.trim())}>
              {isLoading ? (
                  <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Connecting...
                  </>
              ) : mode === 'create' ? (
                <>
                  <Server className="w-4 h-4" /> Initialize Host
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" /> Connect to Peer
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Privacy & Info Modal */}
      {showInfo && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#1e1f22] rounded-xl max-w-lg w-full shadow-2xl border border-[#2b2d31] flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-[#2b2d31] bg-[#1e1f22] rounded-t-xl shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="text-green-500" /> Privacy & Security
              </h2>
              <button onClick={() => setShowInfo(false)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
              
              <div className="flex gap-4">
                <div className="bg-[#2b2d31] p-3 rounded-lg h-fit">
                  <Database className="text-indigo-400" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">No Data Collection</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    ConnectUs operates without a central database. We do not (and cannot) store your messages, media, or personal information. 
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-[#2b2d31] p-3 rounded-lg h-fit">
                  <Cpu className="text-orange-500" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">RAM Storage Only</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Data is kept in your device's memory while the tab is open. Once you close the tab or browser, all messages and history are instantly deleted.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="bg-[#2b2d31] p-3 rounded-lg h-fit">
                  <Globe className="text-cyan-500" size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Peer-to-Peer (P2P)</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Data travels directly between users via WebRTC. The signalling server only helps establish the initial handshake and does not process or see your content.
                  </p>
                </div>
              </div>

              <div className="bg-[#2b2d31]/50 p-4 rounded-lg border border-[#2b2d31]/50">
                <p className="text-xs text-center text-gray-500">
                  ConnectUs is an open-source demonstration of serverless communication technology.
                </p>
              </div>

            </div>

            <div className="p-6 border-t border-[#2b2d31] bg-[#1e1f22] rounded-b-xl shrink-0">
               <Button fullWidth onClick={() => setShowInfo(false)}>I Understand</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};