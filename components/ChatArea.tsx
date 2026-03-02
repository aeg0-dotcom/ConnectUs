import React, { useEffect, useRef, useState } from 'react';
import { Message, MessageType, User } from '../types';
import { Paperclip, Send, Download, Image as ImageIcon, Smile } from 'lucide-react';
import { GiphyPicker } from './GiphyPicker';

interface ChatAreaProps {
  messages: Message[];
  currentUser: User;
  onSendMessage: (content: string, type: MessageType, file?: File) => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ messages, currentUser, onSendMessage }) => {
  const [inputText, setInputText] = useState('');
  const [showGiphy, setShowGiphy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText, MessageType.TEXT);
    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const type = file.type.startsWith('image/') ? MessageType.IMAGE : MessageType.FILE;
      // For simplicity in this demo, we send the file name as content, 
      // but in the App.tsx we will handle the actual blob transmission logic
      onSendMessage(file.name, type, file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGifSelect = (url: string, title: string) => {
      onSendMessage(url, MessageType.GIF);
      setShowGiphy(false);
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-nexus-700 relative">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" onClick={() => setShowGiphy(false)}>
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === currentUser.peerId;
          const showHeader = idx === 0 || messages[idx - 1].senderId !== msg.senderId || (msg.timestamp - messages[idx - 1].timestamp > 60000);

          if (msg.type === MessageType.SYSTEM) {
             return (
                 <div key={msg.id} className="flex justify-center my-2">
                     <span className="bg-nexus-800 text-gray-400 text-xs px-3 py-1 rounded-full border border-nexus-600">
                         {msg.content}
                     </span>
                 </div>
             )
          }

          return (
            <div key={msg.id} className={`group flex ${showHeader ? 'mt-4' : 'mt-0.5'} px-2 hover:bg-nexus-600/30 rounded py-0.5 -mx-2`}>
              {showHeader ? (
                <>
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 mr-4 mt-0.5"
                    style={{ backgroundColor: msg.senderColor }}
                  >
                    {msg.senderName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-white hover:underline cursor-pointer">
                        {msg.senderName}
                      </span>
                      <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div className="text-gray-200 break-words whitespace-pre-wrap">
                      <MessageContent msg={msg} />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 mr-4 text-xs text-gray-500 opacity-0 group-hover:opacity-100 text-right select-none self-center">
                    {formatTime(msg.timestamp)}
                  </div>
                  <div className="flex-1 min-w-0 text-gray-200 break-words whitespace-pre-wrap">
                    <MessageContent msg={msg} />
                  </div>
                </>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Giphy Picker Popup */}
      {showGiphy && (
          <GiphyPicker onSelect={handleGifSelect} onClose={() => setShowGiphy(false)} />
      )}

      {/* Input Area */}
      <div className="p-4 bg-nexus-700">
        <div className="bg-nexus-600 rounded-lg p-2.5 flex items-end gap-2 shadow-sm relative">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors rounded-full hover:bg-nexus-700 h-10 w-10 flex items-center justify-center shrink-0"
            title="Upload File"
          >
            <Paperclip size={20} />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileSelect} 
          />

          <button
             onClick={() => setShowGiphy(!showGiphy)}
             className={`p-2 transition-colors rounded-full hover:bg-nexus-700 h-10 w-10 flex items-center justify-center shrink-0 ${showGiphy ? 'text-nexus-accent' : 'text-gray-400 hover:text-gray-200'}`}
             title="Send GIF"
          >
              <Smile size={20} />
          </button>
          
          <div className="flex-1 py-2">
             <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message #${messages.length > 0 ? 'general' : 'welcome'}`}
                className="w-full bg-transparent border-none text-gray-100 placeholder-gray-400 focus:ring-0 resize-none max-h-40 overflow-y-auto outline-none h-6 custom-scrollbar"
                rows={1}
                style={{ height: 'auto', minHeight: '24px' }}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${Math.min(target.scrollHeight, 160)}px`;
                }}
             />
          </div>

          <button 
             onClick={handleSend}
             className={`p-2 rounded-full transition-colors h-10 w-10 flex items-center justify-center shrink-0 ${inputText.trim() ? 'text-nexus-accent hover:bg-nexus-700' : 'text-gray-500 cursor-not-allowed'}`}
             disabled={!inputText.trim()}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const MessageContent: React.FC<{ msg: Message }> = ({ msg }) => {
    if (msg.type === MessageType.TEXT) {
        return <>{msg.content}</>;
    }
    
    if (msg.type === MessageType.IMAGE) {
        return (
            <div className="mt-2 max-w-sm">
                 <img src={msg.content} alt={msg.fileName} className="rounded-lg shadow-md border border-nexus-800 max-h-64 object-contain" />
            </div>
        );
    }

    if (msg.type === MessageType.GIF) {
        return (
            <div className="mt-2 max-w-sm">
                 <img src={msg.content} alt="GIF" className="rounded-lg shadow-md border border-nexus-800 max-h-64 object-contain" />
            </div>
        );
    }

    if (msg.type === MessageType.FILE) {
        return (
            <div className="mt-2 flex items-center gap-3 bg-nexus-800 p-3 rounded border border-nexus-600 max-w-xs">
                <div className="bg-nexus-700 p-2 rounded">
                    <Download className="w-6 h-6 text-nexus-accent" />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-nexus-accent truncate">{msg.fileName || 'Unknown File'}</p>
                    <p className="text-xs text-gray-400">{(msg.fileType || 'binary').split('/')[1]?.toUpperCase() || 'FILE'}</p>
                </div>
                <a 
                    href={msg.content} 
                    download={msg.fileName}
                    className="p-2 hover:bg-nexus-700 rounded text-gray-300 hover:text-white"
                >
                    <Download size={16} />
                </a>
            </div>
        )
    }

    return null;
}