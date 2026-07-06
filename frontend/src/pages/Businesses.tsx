import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Building2, PlusCircle, CheckCircle, Shield, Link, QRCode as QRVal, 
  MapPin, Globe, Phone, Mail, UserPlus, Clipboard, Check
} from 'lucide-react';

const Businesses: React.FC = () => {
  const { businesses, currentBusiness, selectBusiness, fetchBusinesses, user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  
  const [inviteCode, setInviteCode] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [inviteEmail, setInviteEmail] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  
  const [copiedLink, setCopiedLink] = useState('');
  const [showQR, setShowQR] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);

    try {
      await api.post('/businesses', {
        name,
        description,
        address,
        website,
        phone,
      });
      setName('');
      setDescription('');
      setAddress('');
      setWebsite('');
      setPhone('');
      setShowCreate(false);
      await fetchBusinesses();
    } catch (err) {
      console.error('Failed to create business', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode) return;
    setJoinError('');
    setJoinSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/groups/join', { inviteCode });
      setJoinSuccess(`Successfully joined group! ${res.data.group.name}`);
      setInviteCode('');
      await fetchBusinesses();
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Invalid or expired invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !currentBusiness) return;
    setLoading(true);
    setJoinError('');
    setJoinSuccess('');

    try {
      await api.post(`/businesses/${currentBusiness.id}/invite`, {
        emailOrUsername: inviteEmail,
        role: inviteRole,
      });
      setJoinSuccess(`Successfully invited ${inviteEmail}!`);
      setInviteEmail('');
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Failed to invite user. Make sure they are registered.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(''), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Businesses & Teams</h2>
          <p className="text-zinc-500 text-xs">Switch organizations or join a new workspace</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow transition-all text-xs shadow-neon"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          Create Business
        </button>
      </div>

      {/* Creation Modal / Form */}
      {showCreate && (
        <div className="glass-panel rounded-card p-6 border-brand/20 relative">
          <h3 className="text-lg font-bold text-white mb-4">Create New Business</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Business Name</label>
                <input
                  type="text"
                  required
                  placeholder="Brand Jamaica Co."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (876) 555-0199"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Description</label>
              <textarea
                rows={2}
                placeholder="Brief business description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Address</label>
                <input
                  type="text"
                  placeholder="Kingston, Jamaica"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Website</label>
                <input
                  type="url"
                  placeholder="https://brandjamaica.org"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2.5 px-4 text-white placeholder-zinc-600 focus:outline-none focus:border-brand"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-inner bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow text-xs"
              >
                {loading ? 'Creating...' : 'Create Workspace'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List & Codes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Your Organizations</h3>
          {businesses.length === 0 ? (
            <div className="glass-panel rounded-card p-8 text-center text-zinc-500">
              <Building2 className="h-10 w-10 mx-auto mb-2 text-zinc-600" />
              <p className="text-sm">You do not belong to any businesses yet.</p>
              <p className="text-xs mt-1">Create one or scan an invite link to start scheduling.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {businesses.map((biz) => {
                const isActive = currentBusiness?.id === biz.id;
                return (
                  <div
                    key={biz.id}
                    className={`glass-panel rounded-card p-5 flex items-center justify-between cursor-pointer transition-all border ${
                      isActive ? 'border-brand/40 shadow-neon bg-brand/5' : 'hover:border-zinc-700 bg-zinc-900/40'
                    }`}
                    onClick={() => selectBusiness(biz)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-inner flex items-center justify-center font-bold border ${
                        isActive ? 'bg-brand text-dark-900 border-brand' : 'bg-zinc-800 text-white border-zinc-700'
                      }`}>
                        {biz.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
                          {biz.name}
                          {isActive && <CheckCircle className="h-4.5 w-4.5 text-brand shrink-0" />}
                        </h4>
                        <p className="text-zinc-500 text-xs mt-0.5">{biz.description || 'No description'}</p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-800 text-[10px] font-bold tracking-wider text-brand border border-zinc-700">
                        <Shield className="h-3 w-3" />
                        {biz.userRole}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Join/Invite Panel */}
        <div className="space-y-6">
          {/* Join Form */}
          <div className="glass-panel rounded-card p-5">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Link className="h-4 w-4 text-brand" />
              Join Group/Team
            </h3>
            
            {joinError && <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/20 p-2.5 rounded-inner mb-3">{joinError}</p>}
            {joinSuccess && <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 p-2.5 rounded-inner mb-3">{joinSuccess}</p>}

            <form onSubmit={handleJoin} className="space-y-3.5">
              <div>
                <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">Invite/Scan Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5f7d2a"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2 px-3 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-brand font-mono text-center uppercase tracking-widest"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow text-xs"
              >
                Join Team Group
              </button>
            </form>
          </div>

          {/* Invite Members Form (Only for Owner/Admin/Manager) */}
          {currentBusiness && ['OWNER', 'ADMIN', 'MANAGER'].includes(currentBusiness.userRole) && (
            <div className="glass-panel rounded-card p-5">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <UserPlus className="h-4.5 w-4.5 text-brand" />
                Add Members
              </h3>
              
              <form onSubmit={handleInviteMember} className="space-y-3.5">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">Email / Username</label>
                  <input
                    type="text"
                    required
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2 px-3 text-zinc-200 placeholder-zinc-700 text-xs focus:outline-none focus:border-brand"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] font-semibold uppercase mb-1">Assign Business Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-inner py-2 px-3 text-zinc-300 text-xs focus:outline-none focus:border-brand"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Administrator</option>
                    <option value="GUEST">Guest</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-inner bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs border border-zinc-700"
                >
                  Send Invitation
                </button>
              </form>
            </div>
          )}

          {/* Quick QR Card */}
          {currentBusiness && (
            <div className="glass-panel rounded-card p-5 flex flex-col items-center text-center">
              <h4 className="font-bold text-white text-xs mb-1">Share QR Code invite</h4>
              <p className="text-zinc-500 text-[10px] mb-4">Anyone can scan this to join your business</p>
              
              <div className="bg-white p-3.5 rounded-card shadow-inner mb-4">
                <QRCodeSVG value={`http://localhost:5173/join/${currentBusiness.id}`} size={120} />
              </div>

              <div className="flex gap-2 w-full">
                <button
                  onClick={() => copyToClipboard(`http://localhost:5173/join/${currentBusiness.id}`, 'biz')}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-inner text-[10px] font-bold text-white border border-zinc-700 flex items-center justify-center gap-1"
                >
                  {copiedLink === 'biz' ? <Check className="h-3 w-3 text-brand" /> : <Clipboard className="h-3 w-3" />}
                  {copiedLink === 'biz' ? 'Copied' : 'Copy Link'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Businesses;
