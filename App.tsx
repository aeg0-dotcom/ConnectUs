import React, { useState, useEffect, useRef } from 'react';
import { Peer, DataConnection } from 'peerjs';
import { db, resetDatabase } from './services/db'; // Restore DB import
import { Lobby } from './components/Lobby';
import { ChatArea } from './components/ChatArea';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { AVATAR_COLORS, PEER_CONFIG } from './constants';
import { Message, MessageType, NetworkPacket, User, Channel } from './types';
import { Hash, Copy, LogOut, Check, Menu, X, Plus, Lock, Bot, Ban, Settings, Palette, Sun, Moon, CloudRain, Trees, Sunset, Waves, Sparkles } from 'lucide-react';

type ViewState = 'lobby' | 'chat';
type ThemeOption = 'dark' | 'light' | 'midnight' | 'forest' | 'sunset' | 'ocean' | 'nebula';

function App() {
  const [view, setView] = useState<ViewState>('lobby');
  
  // State
  const [me, setMe] = useState<User | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [peers, setPeers] = useState<User[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // UI State for Connection
  const [isLoading, setIsLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Theme State
  const [theme, setTheme] = useState<ThemeOption>(() => {
    const saved = localStorage.getItem('nexus-theme') as ThemeOption;
    if (saved) return saved;
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });
  const [showSettings, setShowSettings] = useState(false);

  // Channel State
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [unlockedChannels, setUnlockedChannels] = useState<Set<string>>(new Set(['general']));
  
  // Modal State
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelPassword, setNewChannelPassword] = useState('');
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);

  // Refs
  const peerRef = useRef<Peer | null>(null);
  const connectionsRef = useRef<Map<string, DataConnection>>(new Map());
  
  // State Refs
  const messagesRef = useRef<Message[]>([]);
  const channelsRef = useRef<Channel[]>([]);
  const activeChannelIdRef = useRef<string>('general');
  const peerIdRef = useRef<string | null>(null); 

  // Sync State to Refs
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);
  useEffect(() => { activeChannelIdRef.current = activeChannelId; }, [activeChannelId]);
  useEffect(() => { if (me) peerIdRef.current = me.peerId; }, [me]);

  // Apply Theme Effect
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Change Theme
  const changeTheme = (newTheme: ThemeOption) => {
    setTheme(newTheme);
    localStorage.setItem('nexus-theme', newTheme);
  };

  // --- AUTO-WIPE & HOST GUARD ---
  
  // 1. Clear database on mount (Start Fresh)
  useEffect(() => {
      resetDatabase();
  }, []);

  // 2. Host protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (me?.isHost && peers.length > 0) {
        e.preventDefault();
        e.returnValue = "You are the host. If you leave, the server will close for everyone. Are you sure?";
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [me?.isHost, peers.length]);

  // --- Initialization Logic ---

  const initializeHost = async (name: string) => {
    console.log("Initializing Host...");
    setIsLoading(true);
    setInitError(null);
    
    // Safety Timeout: If PeerJS cloud doesn't respond in 15s, reset.
    const connectionTimeout = setTimeout(() => {
        if (peerRef.current && !peerRef.current.destroyed) {
            console.error("Initialization timed out.");
            peerRef.current.destroy();
            setInitError("Connection timed out. Server unresponsive.");
            setIsLoading(false);
        }
    }, 15000);

    try {
        const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        const newPeer = new Peer('', PEER_CONFIG);

        newPeer.on('open', (id) => {
          clearTimeout(connectionTimeout);
          console.log(`HOST STARTED | ID: ${id}`);
          const user: User = { peerId: id, name, color, isHost: true };
          setMe(user);
          setRoomId(id);
          setPeers([]);
          
          // Default Channel
          const defaultChannel: Channel = { id: 'general', name: 'general', isLocked: false, createdAt: Date.now() };
          setChannels([defaultChannel]);
          setActiveChannelId('general');
          
          setIsLoading(false);
          setView('chat');
          // Fix: Persist room info temporarily
          db.rooms.put({ id, name: 'General', createdAt: Date.now() });
        });

        newPeer.on('connection', (conn) => {
            console.log(`Incoming connection from: ${conn.peer}`);
            handleHostConnection(conn);
        });

        newPeer.on('disconnected', () => {
            console.log("Signaling server connection lost. Closing session...");
            handleLeave(false);
        });
        
        newPeer.on('error', (err) => {
            clearTimeout(connectionTimeout);
            setIsLoading(false);
            if (err.type === 'network' || err.type === 'peer-unavailable' || err.message.includes('Lost connection')) {
                console.log("Connection lost (Network/Server). Closing session.");
                setInitError(`Network Error: ${err.message}`);
                // Only destroy if we are not already in chat view
                if (view === 'lobby') {
                    newPeer.destroy();
                } else {
                    handleLeave(false);
                }
                return;
            }
            console.error("PeerJS Error:", err);
            setInitError(`Error: ${err.type || err.message}`);
        });

        peerRef.current = newPeer;
    } catch (err: any) {
        clearTimeout(connectionTimeout);
        setIsLoading(false);
        setInitError(`Failed to initialize: ${err.message}`);
    }
  };

  const joinRoom = async (name: string, hostId: string) => {
    console.log(`Attempting to join room: ${hostId}`);
    setIsLoading(true);
    setInitError(null);

    const connectionTimeout = setTimeout(() => {
        if (peerRef.current && !peerRef.current.destroyed) {
             console.error("Join timed out.");
             peerRef.current.destroy();
             setInitError("Connection timed out. Host may be offline.");
             setIsLoading(false);
        }
    }, 15000);

    try {
        const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
        const newPeer = new Peer('', PEER_CONFIG);

        newPeer.on('open', (id) => {
            console.log(`PEER STARTED | ID: ${id}`);
            const user: User = { peerId: id, name, color, isHost: false };
            setMe(user);
            setRoomId(hostId);
            
            console.log("Connecting to host...");
            const conn = newPeer.connect(hostId);
            
            conn.on('open', () => {
               clearTimeout(connectionTimeout);
               console.log("Connected to Host!");
               sendPacket(conn, { type: 'USER_JOINED', payload: user });
               connectionsRef.current.set(hostId, conn);
               setIsLoading(false);
               setView('chat');
            });

            conn.on('close', () => {
                console.log("Connection to host closed.");
                handleLeave(false);
            });

            conn.on('error', (err) => {
                 console.error("Connection Error:", err);
                 // If connection fails but peer is open, we need to show error
                 if (view === 'lobby') {
                    clearTimeout(connectionTimeout);
                    setIsLoading(false);
                    setInitError("Could not connect to host. Check ID.");
                 }
            });

            conn.on('data', (data) => handleGuestData(data, hostId));
        });

        newPeer.on('disconnected', () => {
            console.log("Signaling server connection lost. Closing session...");
            handleLeave(false);
        });

        newPeer.on('error', (err) => {
            clearTimeout(connectionTimeout);
            setIsLoading(false);
            if (err.type === 'network' || err.message.includes('Lost connection')) {
                console.log("Connection lost (Network/Server). Closing session.");
                setInitError("Network error. Check your connection.");
                handleLeave(false);
                return;
            }
            if (err.type === 'peer-unavailable') {
                setInitError("Host not found. Check the Invite Code.");
                newPeer.destroy();
                return;
            }
            console.error("PeerJS Error:", err);
            setInitError(`Error: ${err.message}`);
        });

        peerRef.current = newPeer;
    } catch (err: any) {
        clearTimeout(connectionTimeout);
        setIsLoading(false);
        setInitError(`Failed to join: ${err.message}`);
    }
  };

  const handleLeave = async (manual: boolean = true) => {
      if (manual && me?.isHost && peers.length > 0) {
          if (!window.confirm("You are the HOST. Closing the session will disconnect everyone. Continue?")) {
              return;
          }
      }

      console.log("Leaving room / Destroying session...");
      
      connectionsRef.current.forEach(conn => {
          conn.close();
      });
      connectionsRef.current.clear();

      if (peerRef.current) {
          peerRef.current.off('error');
          peerRef.current.off('disconnected');
          peerRef.current.destroy();
          peerRef.current = null;
      }

      // Wipe local data on exit
      await resetDatabase();

      setMe(null);
      setRoomId(null);
      setMessages([]);
      setPeers([]);
      setChannels([]);
      setActiveChannelId('general');
      setUnlockedChannels(new Set(['general']));
      setCopied(false);
      setMobileMenuOpen(false);
      setIsLoading(false);
      setInitError(null);
      setView('lobby');
      
      console.log("Session reset complete.");
  };

  const kickUser = (peerId: string, userName: string) => {
      if (!me?.isHost) return;
      if (!window.confirm(`Are you sure you want to KICK ${userName}?`)) return;

      const conn = connectionsRef.current.get(peerId);
      if (conn) {
          sendPacket(conn, { type: 'KICK_USER', payload: 'You have been kicked by the host.' });
          setTimeout(() => {
              conn.close();
          }, 500);
      }
  };

  // --- Channel Logic ---

  const createChannel = () => {
      if (!me?.isHost || !newChannelName.trim()) return;
      
      const channelId = newChannelName.toLowerCase().replace(/\s+/g, '-');
      if (channels.some(c => c.id === channelId)) {
          alert("Channel already exists!");
          return;
      }

      const newChannel: Channel = {
          id: channelId,
          name: newChannelName.trim(),
          isLocked: isPrivateChannel,
          password: isPrivateChannel ? newChannelPassword : undefined,
          createdAt: Date.now()
      };

      setChannels(prev => [...prev, newChannel]);
      setUnlockedChannels(prev => new Set(prev).add(channelId));
      broadcast({ type: 'CHANNEL_CREATE', payload: newChannel });
      
      setShowCreateChannel(false);
      setNewChannelName('');
      setNewChannelPassword('');
      setIsPrivateChannel(false);
  };

  const handleChannelSwitch = (channel: Channel) => {
      if (channel.id === activeChannelId) {
          setMobileMenuOpen(false);
          return;
      }

      if (channel.isLocked && !unlockedChannels.has(channel.id)) {
          const input = prompt(`Enter password for #${channel.name}`);
          if (input === channel.password) {
              setUnlockedChannels(prev => new Set(prev).add(channel.id));
              setActiveChannelId(channel.id);
          } else {
              alert("Incorrect password");
          }
      } else {
          setActiveChannelId(channel.id);
      }
      setMobileMenuOpen(false);
  };

  // --- Core P2P Logic ---

  const handleHostConnection = (conn: DataConnection) => {
      connectionsRef.current.set(conn.peer, conn);
      
      conn.on('data', (data: any) => {
          const packet = data as NetworkPacket;
          
          if (packet.type === 'USER_JOINED') {
              const newUser = packet.payload as User;
              console.log(`User joined: ${newUser.name}`);
              
              setPeers(prev => {
                  const exists = prev.find(p => p.peerId === newUser.peerId);
                  if (exists) return prev;
                  const newPeers = [...prev, newUser];
                  // IMPORTANT: Use refs to send the CURRENT state, not the state when this closure was created
                  broadcast({ type: 'USER_LIST', payload: [me, ...newPeers] });
                  return newPeers;
              });
              
              // Sync Data to new User using REFS to avoid stale state
              conn.send({ type: 'CHANNEL_LIST', payload: channelsRef.current });
              conn.send({ type: 'SYNC_HISTORY', payload: messagesRef.current });
              
              const sysMsg: Message = createMessage(newUser.peerId, 'System', '#000', `${newUser.name} joined.`, MessageType.SYSTEM, 'general');
              handleNewMessage(sysMsg);
          }
          
          if (packet.type === 'MESSAGE') handleNewMessage(packet.payload as Message);
      });

      conn.on('close', () => {
          console.log(`Peer disconnected: ${conn.peer}`);
          connectionsRef.current.delete(conn.peer);
          setPeers(prev => {
              const leavingUser = prev.find(p => p.peerId === conn.peer);
              const newPeers = prev.filter(p => p.peerId !== conn.peer);
              
              if (leavingUser) {
                  broadcast({ type: 'USER_LIST', payload: [me, ...newPeers] });
                  const sysMsg: Message = createMessage('system', 'System', '#000', `${leavingUser.name} left.`, MessageType.SYSTEM, 'general');
                  handleNewMessage(sysMsg);
              }
              return newPeers;
          });
      });
  };

  const handleGuestData = (data: any, hostId: string) => {
      const packet = data as NetworkPacket;
      if (packet.type === 'USER_LIST') {
          const userList = packet.payload as User[];
          // Use Ref to filter self out safely
          setPeers(userList.filter(u => u.peerId !== peerIdRef.current));
      }
      if (packet.type === 'CHANNEL_LIST') setChannels(packet.payload);
      if (packet.type === 'CHANNEL_CREATE') setChannels(prev => [...prev, packet.payload]);
      
      if (packet.type === 'MESSAGE') setMessages(prev => [...prev, packet.payload]);
      if (packet.type === 'SYNC_HISTORY') setMessages(packet.payload);
      
      if (packet.type === 'KICK_USER') {
          alert(packet.payload);
          handleLeave(false);
      }
  };

  const createMessage = (senderId: string, senderName: string, senderColor: string, content: string, type: MessageType, channelId: string, file?: File): Message => {
     // Use crypto.randomUUID if available, else fallback to a simple random string for compatibility
     const id = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
     
     return {
         id, roomId: roomId!, channelId, senderId, senderName, senderColor, content, type, timestamp: Date.now(), fileName: file?.name, fileType: file?.type
     };
  };

  const onSendMessage = async (content: string, type: MessageType, file?: File) => {
      if (!me) return;
      let processedContent = content;
      if (file) {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          await new Promise<void>(resolve => { reader.onload = () => { processedContent = reader.result as string; resolve(); }});
      }
      const msg = createMessage(me.peerId, me.name, me.color, processedContent, type, activeChannelId, file);
      
      if (me.isHost) {
          handleNewMessage(msg);
      } else {
          const hostConn = connectionsRef.current.get(roomId!);
          if (hostConn) {
              sendPacket(hostConn, { type: 'MESSAGE', payload: msg });
              setMessages(prev => [...prev, msg]);
              // Fix: Save to local DB as sender 
              db.messages.add(msg).catch(console.error);
          }
      }
  };

  const handleNewMessage = (msg: Message) => {
      setMessages(prev => [...prev, msg]);
      // Fix: Save to DB during session
      db.messages.add(msg).catch(console.error);
      
      if (me?.isHost) {
          connectionsRef.current.forEach((conn, peerId) => {
              if (peerId !== msg.senderId) sendPacket(conn, { type: 'MESSAGE', payload: msg });
          });
      }
  };

  const broadcast = (packet: NetworkPacket) => connectionsRef.current.forEach(conn => sendPacket(conn, packet));
  const sendPacket = (conn: DataConnection, packet: NetworkPacket) => conn.open && conn.send(packet);

  const copyRoomId = () => {
      if (roomId) {
          navigator.clipboard.writeText(roomId);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  };

  if (view === 'lobby') {
      return (
          <div className="w-full h-full">
            <Lobby 
                onJoin={(name, id) => id ? joinRoom(name, id) : initializeHost(name)} 
                isLoading={isLoading}
                error={initError}
            />
          </div>
      );
  }

  const currentChannelMessages = messages.filter(m => 
      (m.type === MessageType.SYSTEM && m.channelId === 'general') || m.channelId === activeChannelId
  );

  const activeChannel = channels.find(c => c.id === activeChannelId);

  // --- RENDER LAYOUT ---
  return (
    <div className="flex flex-col h-full w-full bg-nexus-700 text-gray-100 font-sans overflow-hidden transition-colors duration-200">
      
      <div className="pt-[env(safe-area-inset-top)] bg-nexus-900 w-full shrink-0"></div>

      {/* Mobile Header */}
      <div className="md:hidden h-14 bg-nexus-900 border-b border-nexus-800 flex items-center justify-between px-4 shrink-0 z-50">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-300 p-2 -ml-2">
             {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span className="font-bold text-gray-100 truncate px-2 text-sm">ConnectUs</span>
          <div className="w-8"></div>
      </div>

      <div className="flex-1 flex min-h-0 relative">
          
          {/* Navigation Sidebar */}
          <div className={`
             absolute md:relative z-40 h-full
             ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
             transition-transform duration-200 ease-in-out
             flex shrink-0
          `}>
              
              {/* Channels Panel */}
              <div className="w-60 bg-nexus-800 flex flex-col border-r border-nexus-900 h-full">
                  <div className="h-12 px-4 flex items-center shadow-sm border-b border-nexus-900 shrink-0">
                      <div className="w-8 h-8 mr-3 rounded-lg bg-nexus-accent flex items-center justify-center text-white shrink-0">
                          <Bot size={20} />
                      </div>
                      <h1 className="font-bold truncate text-base text-gray-100 tracking-wide">ConnectUs</h1>
                  </div>
                  
                  {/* Channel List */}
                  <div className="flex-1 p-2 overflow-y-auto">
                       <div className="flex items-center justify-between px-2 mb-2 mt-2 group">
                           <div className="text-xs font-bold text-gray-500 uppercase">Text Channels</div>
                           {me?.isHost && (
                               <button 
                                 onClick={() => setShowCreateChannel(true)}
                                 className="text-gray-400 hover:text-gray-200 transition-colors"
                                 title="Create Channel"
                               >
                                   <Plus size={14} />
                               </button>
                           )}
                       </div>
                       
                       <div className="space-y-0.5">
                           {channels.map(channel => (
                               <div
                                   key={channel.id}
                                   className={`group relative flex items-center w-full px-2 py-1.5 rounded transition-colors ${
                                       activeChannelId === channel.id
                                       ? 'bg-nexus-600/60 text-gray-100' 
                                       : 'text-gray-400 hover:bg-nexus-700/40 hover:text-gray-300'
                                   }`}
                               >
                                   <button 
                                      className="flex-1 flex items-center gap-2 min-w-0"
                                      onClick={() => handleChannelSwitch(channel)}
                                   >
                                       {channel.isLocked ? <Lock size={16} /> : <Hash size={18} />}
                                       <span className="font-medium text-sm truncate">
                                           {channel.name}
                                       </span>
                                   </button>
                               </div>
                           ))}
                       </div>
                  </div>

                  {/* User Footer */}
                  <div className="bg-nexus-900/80 p-3 flex items-center gap-2 shrink-0 pb-[calc(12px+env(safe-area-inset-bottom))] border-t border-nexus-900">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: me?.color }}>
                          {me?.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                          <div className="text-sm font-bold truncate text-gray-100">{me?.name}</div>
                          {/* ID Removed per user request */}
                      </div>
                      <button 
                        onClick={() => setShowSettings(true)}
                        className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-nexus-700 rounded transition-colors"
                        title="Appearance Settings"
                      >
                          <Settings size={18} />
                      </button>
                      <button 
                        onClick={() => handleLeave(true)} 
                        className="p-1.5 text-gray-400 hover:text-nexus-red hover:bg-nexus-700 rounded transition-colors"
                        title="Disconnect & Leave"
                      >
                          <LogOut size={18} />
                      </button>
                  </div>
              </div>
          </div>

          {/* Settings Modal */}
          {showSettings && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-nexus-800 p-6 rounded-lg w-full max-w-sm shadow-2xl border border-nexus-700 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[85vh]">
                      <div className="flex items-center justify-between mb-4">
                          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                             <Palette size={20} className="text-nexus-accent" /> Appearance
                          </h2>
                          <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-200">
                              <X size={24} />
                          </button>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-4">Choose a theme that fits your vibe. Changes apply only to you.</p>

                      <div className="grid grid-cols-2 gap-3">
                          {/* Dark */}
                          <button 
                             onClick={() => changeTheme('dark')}
                             className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all bg-[#313338] ${theme === 'dark' ? 'border-nexus-accent ring-1 ring-nexus-accent' : 'border-gray-700 hover:border-gray-600'}`}
                          >
                             <div className="w-8 h-8 rounded-full bg-[#1e1f22] border border-gray-600 flex items-center justify-center text-white">
                                 <Moon size={16} />
                             </div>
                             <span className="text-sm font-medium text-white">Dark</span>
                          </button>

                          {/* Light */}
                          <button 
                             onClick={() => changeTheme('light')}
                             className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all bg-white ${theme === 'light' ? 'border-nexus-accent ring-1 ring-nexus-accent' : 'border-gray-300 hover:border-gray-400'}`}
                          >
                             <div className="w-8 h-8 rounded-full bg-[#f2f3f5] border border-gray-300 flex items-center justify-center text-gray-800">
                                 <Sun size={16} />
                             </div>
                             <span className="text-sm font-medium text-gray-900">Light</span>
                          </button>

                          {/* Midnight */}
                          <button 
                             onClick={() => changeTheme('midnight')}
                             className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all bg-[#0f172a] ${theme === 'midnight' ? 'border-sky-500 ring-1 ring-sky-500' : 'border-[#1e3a8a] hover:border-sky-900'}`}
                          >
                             <div className="w-8 h-8 rounded-full bg-[#1e3a8a] border border-sky-900 flex items-center justify-center text-sky-200">
                                 <CloudRain size={16} />
                             </div>
                             <span className="text-sm font-medium text-sky-100">Midnight</span>
                          </button>

                          {/* Forest */}
                          <button 
                             onClick={() => changeTheme('forest')}
                             className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all bg-[#1a2e1a] ${theme === 'forest' ? 'border-green-500 ring-1 ring-green-500' : 'border-[#14532d] hover:border-green-900'}`}
                          >
                             <div className="w-8 h-8 rounded-full bg-[#14532d] border border-green-900 flex items-center justify-center text-green-200">
                                 <Trees size={16} />
                             </div>
                             <span className="text-sm font-medium text-green-100">Forest</span>
                          </button>
                          
                          {/* Sunset */}
                          <button 
                             onClick={() => changeTheme('sunset')}
                             className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all bg-[#2a1b2e] ${theme === 'sunset' ? 'border-orange-500 ring-1 ring-orange-500' : 'border-[#56243d] hover:border-orange-900'}`}
                          >
                             <div className="w-8 h-8 rounded-full bg-[#56243d] border border-orange-500 flex items-center justify-center text-orange-200">
                                 <Sunset size={16} />
                             </div>
                             <span className="text-sm font-medium text-orange-200">Sunset</span>
                          </button>

                          {/* Ocean */}
                          <button 
                             onClick={() => changeTheme('ocean')}
                             className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all bg-[#162a2b] ${theme === 'ocean' ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-[#1c4b4d] hover:border-cyan-900'}`}
                          >
                             <div className="w-8 h-8 rounded-full bg-[#1c4b4d] border border-cyan-500 flex items-center justify-center text-cyan-200">
                                 <Waves size={16} />
                             </div>
                             <span className="text-sm font-medium text-cyan-200">Ocean</span>
                          </button>

                          {/* Nebula */}
                          <button 
                             onClick={() => changeTheme('nebula')}
                             className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all bg-[#231b2e] ${theme === 'nebula' ? 'border-fuchsia-500 ring-1 ring-fuchsia-500' : 'border-[#512242] hover:border-fuchsia-900'}`}
                          >
                             <div className="w-8 h-8 rounded-full bg-[#512242] border border-fuchsia-500 flex items-center justify-center text-fuchsia-200">
                                 <Sparkles size={16} />
                             </div>
                             <span className="text-sm font-medium text-fuchsia-200">Nebula</span>
                          </button>
                      </div>

                      <div className="mt-6 flex justify-end">
                          <Button onClick={() => setShowSettings(false)}>Done</Button>
                      </div>
                  </div>
              </div>
          )}

          {/* Create Channel Modal */}
          {showCreateChannel && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                  <div className="bg-nexus-800 p-6 rounded-lg w-full max-w-sm shadow-2xl border border-nexus-700">
                      <h2 className="text-xl font-bold text-gray-100 mb-4">Create Text Channel</h2>
                      <div className="space-y-4">
                          <Input 
                              label="Channel Name" 
                              placeholder="new-channel" 
                              value={newChannelName}
                              onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                              autoFocus
                          />
                          <div className="flex items-center gap-3 mt-4 mb-2">
                             <button 
                                onClick={() => setIsPrivateChannel(!isPrivateChannel)}
                                className={`w-10 h-6 rounded-full p-1 transition-colors ${isPrivateChannel ? 'bg-nexus-accent' : 'bg-nexus-600'}`}
                             >
                                 <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${isPrivateChannel ? 'translate-x-4' : 'translate-x-0'}`} />
                             </button>
                             <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                 {isPrivateChannel ? <Lock size={14} /> : <Hash size={14} />} 
                                 Private Channel
                             </span>
                          </div>
                          {isPrivateChannel && (
                              <Input 
                                  label="Password" 
                                  type="password"
                                  placeholder="Enter channel password" 
                                  value={newChannelPassword}
                                  onChange={(e) => setNewChannelPassword(e.target.value)}
                              />
                          )}
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                          <button 
                             onClick={() => setShowCreateChannel(false)}
                             className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:underline"
                          >
                              Cancel
                          </button>
                          <Button 
                             onClick={createChannel}
                             disabled={!newChannelName.trim() || (isPrivateChannel && !newChannelPassword)}
                          >
                              Create Channel
                          </Button>
                      </div>
                  </div>
              </div>
          )}

          {mobileMenuOpen && (
              <div 
                  className="absolute inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
                  onClick={() => setMobileMenuOpen(false)}
              ></div>
          )}

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 bg-nexus-700 relative z-0 h-full">
              {/* Chat Header */}
              <div className="h-12 px-4 flex items-center justify-between border-b border-nexus-900 bg-nexus-700 shrink-0 shadow-sm">
                  <div className="flex items-center gap-2 min-w-0">
                      {activeChannel?.isLocked ? <Lock size={20} className="text-gray-400 shrink-0" /> : <Hash size={20} className="text-gray-400 shrink-0" />}
                      <span className="font-bold text-gray-100 truncate">{activeChannel?.name || 'general'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                      <button onClick={copyRoomId} className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition-all ${copied ? 'bg-green-600 text-white' : 'bg-nexus-accent text-white'}`}>
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                          <span className="hidden sm:inline">{copied ? 'COPIED' : 'INVITE CODE'}</span>
                      </button>
                  </div>
              </div>

              {/* Messages & Input */}
              <div className="flex-1 min-h-0 relative flex flex-col pb-[env(safe-area-inset-bottom)]">
                  <ChatArea messages={currentChannelMessages} currentUser={me!} onSendMessage={onSendMessage} />
              </div>
          </div>

          {/* Members Sidebar (Right - Desktop Only) */}
          <div className="hidden lg:flex w-60 bg-nexus-800 flex-col border-l border-nexus-900 shrink-0 h-full">
              <div className="p-4 overflow-y-auto flex-1">
                  <h2 className="text-xs font-bold text-gray-500 uppercase mb-4">Online — {peers.length + 1}</h2>
                  
                  {/* Self */}
                  <div className="flex items-center gap-3 mb-2 px-2 py-1.5 rounded bg-nexus-700/30">
                      <div className="relative">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: me?.color }}>
                              {me?.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-nexus-800 rounded-full flex items-center justify-center">
                              <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                          </div>
                      </div>
                      <div className="font-medium text-sm text-gray-100 truncate flex-1">{me?.name} (You)</div>
                      {me?.isHost && (
                          <div className="text-[10px] bg-nexus-accent/20 text-nexus-accent px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                              HOST
                          </div>
                      )}
                  </div>

                  {/* Peers */}
                  {peers.map(peer => (
                      <div key={peer.peerId} className="group flex items-center gap-3 px-2 py-1.5 rounded hover:bg-nexus-700/50 cursor-pointer opacity-80 hover:opacity-100">
                          <div className="relative">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: peer.color }}>
                                  {peer.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-nexus-800 rounded-full flex items-center justify-center">
                                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                              </div>
                          </div>
                          <div className="font-medium text-sm text-gray-300 truncate flex-1">{peer.name}</div>
                          
                          {/* KICK BUTTON (HOST ONLY) */}
                          {me?.isHost && (
                              <button 
                                  onClick={(e) => { e.stopPropagation(); kickUser(peer.peerId, peer.name); }}
                                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                                  title="Kick User"
                              >
                                  <Ban size={14} />
                              </button>
                          )}
                      </div>
                  ))}
              </div>
          </div>

      </div>
    </div>
  );
}

export default App;