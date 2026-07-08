import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import { 
  MessageSquare, User, Send, Paperclip, 
  PlusCircle, Users, ArrowLeft, Loader2, Trash2
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  description?: string;
  inviteCode: string;
}

interface Member {
  user: {
    id: string;
    fullName: string;
    username: string;
    profileImage?: string;
  };
  role: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  type: string; // "TEXT", "IMAGE", "VOICE", "FILE"
  createdAt: string;
  isPinned: boolean;
  reactions?: string; // stringified JSON
  sender: { fullName: string; id: string; profileImage?: string };
}

const ChatHub: React.FC = () => {
  const { currentBusiness, user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  // Active Chats
  const [activeType, setActiveType] = useState<'group' | 'private' | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [activeMember, setActiveMember] = useState<{ id: string; fullName: string } | null>(null);

  // Message Send
  const [messageText, setMessageText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Group Creation
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);

  // Poll Interval Reference
  const pollRef = useRef<number | null>(null);

  const fetchChatMetadata = async () => {
    if (!currentBusiness) return;
    try {
      const groupsRes = await api.get(`/businesses/${currentBusiness.id}/groups`);
      setGroups(groupsRes.data);

      const membersRes = await api.get(`/businesses/${currentBusiness.id}`);
      setMembers(membersRes.data.members || []);
    } catch (err) {
      console.error('Error fetching chat data', err);
    }
  };

  useEffect(() => {
    if (currentBusiness) {
      fetchChatMetadata();
    }
    return () => stopPolling();
  }, [currentBusiness]);

  const startPolling = (groupId: string | null, memberId: string | null) => {
    stopPolling();
    fetchMessages(groupId, memberId); // initial load
    
    pollRef.current = window.setInterval(() => {
      fetchMessages(groupId, memberId);
    }, 3000); // Poll every 3 seconds
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const fetchMessages = async (groupId: string | null, memberId: string | null) => {
    try {
      let url = '/messages';
      if (groupId) {
        url += `?groupId=${groupId}`;
      } else if (memberId) {
        url += `?recipientId=${memberId}`;
      } else {
        return;
      }
      const res = await api.get(url);
      setMessages(res.data);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const handleSelectGroup = (g: Group) => {
    setActiveType('group');
    setActiveGroupId(g.id);
    setActiveMember(null);
    setMessages([]);
    startPolling(g.id, null);
  };

  const handleSelectMember = (m: Member) => {
    setActiveType('private');
    setActiveMember({ id: m.user.id, fullName: m.user.fullName });
    setActiveGroupId(null);
    setMessages([]);
    startPolling(null, m.user.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !user) return;

    const payload = {
      content: messageText,
      recipientId: activeMember?.id || undefined,
      groupId: activeGroupId || undefined,
      type: 'TEXT',
    };

    try {
      setMessageText('');
      const res = await api.post('/messages', payload);
      setMessages(prev => [...prev, res.data]);
      scrollToBottom();
    } catch (err) {
      console.error('Error sending message', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { fileUrl, mimeType } = uploadRes.data;
      const isImg = mimeType.startsWith('image/');
      
      const payload = {
        content: fileUrl,
        recipientId: activeMember?.id || undefined,
        groupId: activeGroupId || undefined,
        type: isImg ? 'IMAGE' : 'FILE',
      };

      const msgRes = await api.post('/messages', payload);
      setMessages(prev => [...prev, msgRes.data]);
      scrollToBottom();
    } catch (err) {
      console.error('File upload failed', err);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName || !currentBusiness) return;

    try {
      await api.post(`/businesses/${currentBusiness.id}/groups`, {
        name: newGroupName,
        description: newGroupDesc,
        isPrivate: newGroupPrivate,
      });
      setNewGroupName('');
      setNewGroupDesc('');
      setNewGroupPrivate(false);
      setShowCreateGroup(false);
      await fetchChatMetadata();
    } catch (err) {
      console.error('Failed to create group', err);
    }
  };

  const handleClearChat = async () => {
    if (!activeGroupId) return;
    if (!confirm('Are you sure you want to permanently clear all messages in this group channel?')) return;
    try {
      await api.delete(`/groups/${activeGroupId}/messages/clear`);
      setMessages([]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to clear chat');
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      const res = await api.post(`/messages/react/${messageId}`, { emoji });
      setMessages(messages.map(m => m.id === messageId ? { ...m, reactions: res.data.reactions } : m));
    } catch (err) {
      console.error('Failed to react to message', err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="h-[75vh] flex rounded-card overflow-hidden border border-zinc-800/80 relative">
      {/* Side Pane */}
      <div className={`w-full md:w-80 bg-zinc-900/40 border-r border-zinc-800 flex flex-col ${
        activeType !== null ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Selector Header */}
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/60">
          <h3 className="font-bold text-white text-sm">Communications</h3>
          <button 
            onClick={() => setShowCreateGroup(true)}
            className="p-1 rounded-full text-brand hover:bg-zinc-800"
          >
            <PlusCircle className="h-5 w-5" />
          </button>
        </div>

        {/* Channels/Members Scroller */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-4">
          {/* Groups list */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-2">
              <Users className="h-3 w-3" />
              <span>Channels</span>
            </div>
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => handleSelectGroup(g)}
                className={`w-full text-left p-2.5 rounded-inner text-xs transition-all flex items-center gap-2 ${
                  activeGroupId === g.id ? 'bg-brand/10 text-brand font-bold' : 'text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <span className="font-black">#</span>
                {g.name}
              </button>
            ))}
          </div>

          {/* Members list */}
          <div className="space-y-1.5 pt-3">
            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-2">
              <User className="h-3 w-3" />
              <span>Team Members</span>
            </div>
            {members.filter(m => m.user.id !== user?.id).map((m) => (
              <button
                key={m.user.id}
                onClick={() => handleSelectMember(m)}
                className={`w-full text-left p-2.5 rounded-inner text-xs transition-all flex items-center justify-between ${
                  activeMember?.id === m.user.id ? 'bg-brand/10 text-brand font-bold' : 'text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-zinc-800 text-[10px] text-white flex items-center justify-center font-bold uppercase">
                    {m.user.fullName.charAt(0)}
                  </div>
                  <span>{m.user.fullName}</span>
                </div>
                <span className="text-[8px] text-zinc-500">{m.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className={`flex-1 flex flex-col bg-dark-900/60 ${
        activeType === null ? 'hidden md:flex items-center justify-center text-zinc-500' : 'flex'
      }`}>
        {activeType === null ? (
          <div className="text-center p-6 space-y-2">
            <MessageSquare className="h-12 w-12 text-zinc-700 mx-auto" />
            <h4 className="font-bold text-zinc-400">Your Communication Hub</h4>
            <p className="text-xs text-zinc-650 max-w-xs">Select a channel group or a team member on the left panel to begin discussing assignments.</p>
          </div>
        ) : (
          /* Active Chat Conversation */
          <>
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setActiveType(null);
                    stopPolling();
                  }}
                  className="p-1 text-zinc-400 hover:text-white md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {activeType === 'group' ? `# ${groups.find(g => g.id === activeGroupId)?.name}` : activeMember?.fullName}
                  </h4>
                  <p className="text-[10px] text-zinc-500">
                    {activeType === 'group' 
                      ? 'Team Group Channel' 
                      : 'Private conversation • Online'
                    }
                  </p>
                </div>
              </div>

              {activeType === 'group' && currentBusiness && ['OWNER', 'ADMIN', 'MANAGER'].includes(currentBusiness.userRole) && (
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 text-xs font-bold transition-all"
                  title="Clear all messages in this group channel"
                >
                  <Trash2 size={13} />
                  Clear Chat
                </button>
              )}
            </div>

            {/* Message Feed Scroller */}
            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div 
                    key={msg.id}
                    className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}
                  >
                    {/* User Avatar */}
                    <div className="w-8 h-8 rounded-full bg-zinc-800 text-xs text-white font-bold flex items-center justify-center shrink-0 uppercase">
                      {msg.sender.fullName.charAt(0)}
                    </div>
                    
                    {/* Message Bubble */}
                    <div className="space-y-1.5">
                      <div className={`text-[10px] text-zinc-500 ${isMe ? 'text-right' : ''}`}>
                        {msg.sender.fullName} • {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      
                      <div className={`p-3 rounded-inner text-xs leading-relaxed border ${
                        isMe 
                          ? 'bg-brand/10 border-brand/20 text-white rounded-tr-none' 
                          : 'bg-zinc-800/40 border-zinc-700/30 text-zinc-200 rounded-tl-none'
                      }`}>
                        {msg.type === 'IMAGE' ? (
                          <img 
                            src={msg.content.startsWith('/') ? `http://localhost:5000${msg.content}` : msg.content} 
                            alt="uploaded image" 
                            className="max-w-xs rounded-inner object-cover border border-zinc-800" 
                          />
                        ) : msg.type === 'FILE' ? (
                          <a 
                            href={msg.content.startsWith('/') ? `http://localhost:5000${msg.content}` : msg.content} 
                            download 
                            className="flex items-center gap-2 text-brand hover:underline font-semibold"
                          >
                            <Paperclip className="h-4 w-4" />
                            Download Attachment
                          </a>
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>

                      {/* Reactions Overlay */}
                      <div className={`flex gap-1.5 mt-1 ${isMe ? 'justify-end' : ''}`}>
                        <button 
                          onClick={() => handleReactToMessage(msg.id, '👍')}
                          className="px-1.5 py-0.5 rounded bg-zinc-850 hover:bg-zinc-800 text-[10px] border border-zinc-800"
                        >
                          👍
                        </button>
                        <button 
                          onClick={() => handleReactToMessage(msg.id, '❤️')}
                          className="px-1.5 py-0.5 rounded bg-zinc-850 hover:bg-zinc-800 text-[10px] border border-zinc-800"
                        >
                          ❤️
                        </button>
                        {msg.reactions && (
                          <div className="flex gap-1 text-[8px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-1 rounded flex-wrap">
                            {Object.entries(JSON.parse(msg.reactions)).map(([emoji, users]) => (
                              <span key={emoji}>{emoji} {(users as any[]).length}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messageEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3.5 border-t border-zinc-800 bg-zinc-900/40">
              <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileUpload}
                />
                
                <button
                  type="button"
                  disabled={uploadingFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-inner"
                >
                  {uploadingFile ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-brand" />
                  ) : (
                    <Paperclip className="h-4.5 w-4.5" />
                  )}
                </button>
                
                <input
                  type="text"
                  required
                  placeholder="Type your message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="flex-1 bg-dark-900 border border-zinc-800 rounded-inner py-2.5 px-4 text-xs text-white placeholder-zinc-700 focus:outline-none focus:border-brand"
                />
                
                <button
                  type="submit"
                  className="p-2.5 bg-brand text-dark-900 font-bold rounded-inner hover:bg-brand-glow transition-all"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* ==================== CREATE TEAM GROUP MODAL ==================== */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel rounded-card p-6 border-brand/20 w-full max-w-sm">
            <h3 className="text-lg font-bold text-white mb-4">Create Team Group</h3>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Group Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marketing, Drivers, Logistics"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2 px-3 text-white focus:outline-none focus:border-brand text-sm"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Description</label>
                <textarea
                  rows={2}
                  placeholder="Purpose of this chat channel..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2 px-3 text-white focus:outline-none focus:border-brand text-sm resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newGroupPrivate}
                  onChange={() => setNewGroupPrivate(!newGroupPrivate)}
                  className="accent-brand border-zinc-700 bg-zinc-950 rounded h-4 w-4"
                />
                <span>Private Group (Invite Link only)</span>
              </label>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateGroup(false)}
                  className="px-4 py-2 rounded-inner bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow text-xs"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHub;
