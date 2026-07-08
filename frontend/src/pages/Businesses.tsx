import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import { QRCodeSVG } from 'qrcode.react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { 
  Building2, PlusCircle, CheckCircle, Shield, Link, 
  Check, Trash2, Calendar, 
  ListTodo, Clock, MapPin, Users, Loader2, Camera, Keyboard, QrCode, Copy, X, ArrowLeft, Edit
} from 'lucide-react';
import ChatHub from './ChatHub';
import Meetings from './Meetings';

const Businesses: React.FC = () => {
  const { businesses, currentBusiness, selectBusiness, fetchBusinesses } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  
  const [inviteCode, setInviteCode] = useState('');
  const [joinMode, setJoinMode] = useState<'type' | 'scan'>('type');
  
  const [copiedCode, setCopiedCode] = useState('');
  const [showQRBiz, setShowQRBiz] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteIdentifier, setInviteIdentifier] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [inviteError, setInviteError] = useState('');

  const handleDeleteBusiness = async () => {
    if (!currentBusiness) return;
    if (!window.confirm(`Are you sure you want to permanently delete "${currentBusiness.name}"? This action cannot be undone.`)) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/businesses/${currentBusiness.id}`);
      selectBusiness(null);
      await fetchBusinesses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete team');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Team Management State ---
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [showPostJobModal, setShowPostJobModal] = useState(false);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);

  // Job form state
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    spotsAvailable: '',
    priority: 'MEDIUM'
  });
  const [jobError, setJobError] = useState('');

  // Task form state
  const [taskForm, setTaskForm] = useState({
    jobId: '',
    title: '',
    description: '',
    userId: '',
    dueDate: '',
    priority: 'MEDIUM'
  });
  const [taskError, setTaskError] = useState('');

  const fetchTeamData = useCallback(async () => {
    if (!currentBusiness) return;
    setLoadingJobs(true);
    try {
      const res = await api.get(`/businesses/${currentBusiness.id}/jobs`);
      setJobs(res.data);
    } catch (err) {
      console.error('Failed to fetch team jobs/tasks', err);
    } finally {
      setLoadingJobs(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

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
      console.error('Failed to create team', err);
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
      const res = await api.post('/businesses/join', { codeOrId: inviteCode });
      setJoinSuccess(`Successfully joined team! ${res.data.business.name}`);
      setInviteCode('');
      await fetchBusinesses();
    } catch (err: any) {
      setJoinError(err.response?.data?.error || 'Invalid or expired invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (result: any) => {
    if (result && result.length > 0 && result[0].rawValue) {
      const code = result[0].rawValue;
      
      setInviteCode(code);
      setJoinMode('type');
      
      setJoinError('');
      setJoinSuccess('');
      setLoading(true);
      try {
        const res = await api.post('/businesses/join', { codeOrId: code });
        setJoinSuccess(`Successfully joined team! ${res.data.business.name}`);
        setInviteCode('');
        await fetchBusinesses();
      } catch (err: any) {
        setJoinError(err.response?.data?.error || 'Invalid or expired invite code');
      } finally {
        setLoading(false);
      }
    }
  };



  const handleUpdateRole = async (userId: string, role: string) => {
    if (!currentBusiness) return;
    try {
      await api.put(`/businesses/${currentBusiness.id}/role`, { userId, role });
      await fetchBusinesses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentBusiness) return;
    if (!window.confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      await api.delete(`/businesses/${currentBusiness.id}/members`, { data: { userId } });
      await fetchBusinesses();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness) return;
    setLoading(true);
    setInviteError('');
    try {
      await api.post(`/businesses/${currentBusiness.id}/invite`, {
        emailOrUsername: inviteIdentifier,
        role: inviteRole
      });
      setShowInviteModal(false);
      setInviteIdentifier('');
      await fetchBusinesses();
    } catch (err: any) {
      setInviteError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBusiness || !jobForm.title) return;
    setLoading(true);
    setJobError('');
    try {
      await api.post(`/businesses/${currentBusiness.id}/jobs`, {
        ...jobForm,
        spotsAvailable: jobForm.spotsAvailable ? parseInt(jobForm.spotsAvailable) : null,
        startTime: jobForm.startTime || null,
        endTime: jobForm.endTime || null,
      });
      setJobForm({
        title: '',
        description: '',
        location: '',
        startTime: '',
        endTime: '',
        spotsAvailable: '',
        priority: 'MEDIUM'
      });
      setShowPostJobModal(false);
      fetchTeamData();
    } catch (err: any) {
      setJobError(err.response?.data?.error || 'Failed to create job');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.jobId || !taskForm.title || !taskForm.userId) {
      setTaskError('Job, Title, and Assigned Member are required');
      return;
    }
    setLoading(true);
    setTaskError('');
    try {
      await api.post(`/jobs/${taskForm.jobId}/assignments`, {
        title: taskForm.title,
        description: taskForm.description,
        userId: taskForm.userId,
        dueDate: taskForm.dueDate || null,
        priority: taskForm.priority,
      });
      setTaskForm({
        jobId: '',
        title: '',
        description: '',
        userId: '',
        dueDate: '',
        priority: 'MEDIUM'
      });
      setShowCreateTaskModal(false);
      fetchTeamData();
    } catch (err: any) {
      setTaskError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };



  const [editingTask, setEditingTask] = useState<any | null>(null);

  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this task assignment?')) return;
    try {
      await api.delete(`/assignments/${assignmentId}`);
      fetchTeamData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete assignment');
    }
  };

  const handleUpdateAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editingTask.title) return;
    setLoading(true);
    try {
      await api.put(`/assignments/${editingTask.id}`, {
        title: editingTask.title,
        description: editingTask.description,
        userId: editingTask.userId,
        dueDate: editingTask.dueDate ? editingTask.dueDate.split('T')[0] : null,
        priority: editingTask.priority,
        status: editingTask.status,
      });
      setEditingTask(null);
      fetchTeamData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update task');
    } finally {
      setLoading(false);
    }
  };
  const allAssignments = jobs.flatMap(j => 
    (j.assignments || []).map((a: any) => ({ ...a, jobTitle: j.title }))
  );

  const isManager = currentBusiness && ['OWNER', 'ADMIN', 'MANAGER'].includes(currentBusiness.userRole);
  const isSupervisor = currentBusiness && ['OWNER', 'ADMIN', 'MANAGER', 'SUPERVISOR'].includes(currentBusiness.userRole);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Teams</h2>
          <p className="text-zinc-500 text-xs">Switch or join a team workspace</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow transition-all text-xs shadow-neon"
        >
          <PlusCircle className="h-4.5 w-4.5" />
          Create Team
        </button>
      </div>

      {/* Creation Modal / Form */}
      {showCreate && (
        <div className="glass-panel rounded-card p-6 border-brand/20 relative">
          <h3 className="text-lg font-bold text-white mb-4">Create New Team</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-400 text-xs font-semibold uppercase mb-1.5">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="Brand Jamaica Team"
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
                placeholder="Brief team description..."
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
                {loading ? 'Creating...' : 'Create Team'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main List & Codes Grid */}
      {!showCreate && !currentBusiness && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Your Teams</h3>
          {businesses.length === 0 ? (
            <div className="glass-panel rounded-card p-8 text-center text-zinc-500">
              <Building2 className="h-10 w-10 mx-auto mb-2 text-zinc-600" />
              <p className="text-sm">You do not belong to any teams yet.</p>
              <p className="text-xs mt-1">Create one or scan an invite link to start scheduling.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {businesses.map((biz) => {
                const isActive = false; // currentBusiness is null in list view
                
                return (
                  <div
                    key={biz.id}
                    className={`glass-panel rounded-card flex flex-col relative overflow-hidden transition-all border ${
                      isActive ? 'border-brand/40 shadow-neon bg-brand/5' : 'hover:border-zinc-700 bg-zinc-900/40'
                    }`}
                  >
                    {/* Background accent for active */}
                    {isActive && <div className="absolute top-0 right-0 w-24 h-24 bg-brand/10 rounded-full blur-2xl pointer-events-none" />}
                    
                    <div 
                      className="p-5 flex-1 cursor-pointer"
                      onClick={() => selectBusiness(biz)}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border shadow-inner ${
                          isActive ? 'bg-brand text-dark-900 border-brand/50' : 'bg-dark-900 text-white border-zinc-700'
                        }`}>
                          {biz.name.charAt(0).toUpperCase()}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider border ${
                          isActive ? 'bg-brand/20 text-brand border-brand/30' : 'bg-dark-900 text-zinc-400 border-zinc-800'
                        }`}>
                          <Shield className="h-3 w-3" />
                          {biz.userRole}
                        </span>
                      </div>
                      
                      <h4 className="font-bold text-white text-base flex items-center gap-1.5 mb-1 relative z-10">
                        {biz.name}
                        {isActive && <CheckCircle className="h-4.5 w-4.5 text-brand shrink-0" />}
                      </h4>
                      <p className="text-zinc-500 text-xs line-clamp-2 relative z-10">{biz.description || 'No description provided.'}</p>
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
          <div className="glass-panel rounded-card p-5 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-brand/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2 relative z-10">
              <div className="bg-brand/10 p-1.5 rounded-lg border border-brand/20">
                <Link className="h-4 w-4 text-brand" />
              </div>
              Join Team
            </h3>
            
            {joinError && <p className="text-xs text-red-400 bg-red-950/40 border border-red-500/20 p-2.5 rounded-inner mb-4 flex items-center gap-2 relative z-10"><span className="h-1.5 w-1.5 rounded-full bg-red-500 flex-shrink-0"></span>{joinError}</p>}
            {joinSuccess && <p className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 p-2.5 rounded-inner mb-4 flex items-center gap-2 relative z-10"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0"></span>{joinSuccess}</p>}

            <div className="bg-dark-900 border border-zinc-800 rounded-inner p-1 flex gap-1 mb-5 relative z-10">
              <button
                type="button"
                onClick={() => setJoinMode('type')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-inner text-xs font-bold transition-all ${
                  joinMode === 'type' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Keyboard className="h-3.5 w-3.5" />
                Type Code
              </button>
              <button
                type="button"
                onClick={() => setJoinMode('scan')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-inner text-xs font-bold transition-all ${
                  joinMode === 'scan' ? 'bg-zinc-800 text-brand shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Camera className="h-3.5 w-3.5" />
                Scan QR
              </button>
            </div>

            {joinMode === 'type' ? (
              <form onSubmit={handleJoin} className="space-y-4 relative z-10">
                <div>
                  <div className="relative">
                    <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                    <input
                      type="text"
                      required
                      placeholder="Enter invite code (e.g. 5F7D2A)"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className="w-full bg-dark-900/50 border border-zinc-800 rounded-inner py-2.5 pl-10 pr-3 text-white placeholder-zinc-700 text-sm focus:outline-none focus:border-brand font-mono uppercase tracking-widest transition-all"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading || !inviteCode.trim()}
                  className="w-full py-2.5 rounded-inner bg-brand text-dark-900 font-bold hover:bg-brand-glow hover:shadow-[0_0_15px_rgba(255,191,0,0.3)] transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Team'}
                </button>
              </form>
            ) : (
              <div className="space-y-3 relative z-10">
                <div className="aspect-square w-full max-w-[240px] mx-auto rounded-xl overflow-hidden border border-zinc-800 bg-black relative shadow-inner">
                  <Scanner 
                    onScan={handleScan}
                    styles={{ container: { width: '100%', height: '100%' } }}
                  />
                  {loading && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center backdrop-blur-sm z-10">
                      <Loader2 className="h-6 w-6 text-brand animate-spin" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 text-center uppercase tracking-wider font-semibold">
                  Point your camera at a Team QR Code
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
      )}

      {/* QR Code Modal */}
      {showQRBiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-dark-900 border border-zinc-800 rounded-xl max-w-sm w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowQRBiz(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white bg-zinc-800/50 hover:bg-zinc-800 p-1.5 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="text-center mb-6 mt-2">
              <h3 className="text-lg font-bold text-white mb-1">Scan to Join</h3>
              <p className="text-zinc-400 text-sm">Join <span className="text-brand font-semibold">{showQRBiz.name}</span></p>
            </div>

            <div className="bg-white p-6 rounded-xl mx-auto w-max mb-6">
              <QRCodeSVG 
                value={showQRBiz.inviteCode || ''}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- Team Workspace Details Panels --- */}
      {!showCreate && currentBusiness && (
        <div className="space-y-6 animate-fade-in">
          <button
            onClick={() => selectBusiness(null)}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider w-max"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Teams
          </button>
          
          <div className="glass-panel rounded-card p-6 border-brand/10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-zinc-800 pb-4 gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="text-brand h-5 w-5" />
                {currentBusiness.name} Workspace
              </h3>
              <p className="text-zinc-500 text-xs">Manage members, post jobs, and assign tasks</p>
            </div>

              {/* Header Actions */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto mt-2 md:mt-0">
                {currentBusiness.inviteCode && (
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Invite Code:</span>
                    <span className="font-mono text-white text-xs tracking-widest">{currentBusiness.inviteCode.toUpperCase()}</span>
                    <button
                      onClick={() => {
                        if (currentBusiness?.inviteCode) {
                          navigator.clipboard.writeText(currentBusiness.inviteCode.toUpperCase());
                          setCopiedCode(currentBusiness.id);
                          setTimeout(() => setCopiedCode(''), 2000);
                        }
                      }}
                      className="ml-1 p-1 hover:text-white text-zinc-400 transition-colors"
                      title="Copy Code"
                    >
                      {copiedCode === currentBusiness.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                )}
                <button
                  onClick={() => setShowQRBiz(currentBusiness)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-brand/10 hover:bg-brand/20 text-brand border border-brand/20 rounded-xl transition-colors text-xs font-bold w-full sm:w-auto"
                >
                  <QrCode className="h-4 w-4" />
                  Show QR
                </button>
                {['OWNER', 'ADMIN', 'MANAGER'].includes(currentBusiness.userRole) && (
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-brand hover:bg-brand-glow text-dark-900 rounded-xl transition-colors text-xs font-bold w-full sm:w-auto"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Add Member
                  </button>
                )}
                {/* Delete Button for Owner */}
                {currentBusiness.userRole === 'OWNER' && (
                  <button
                    onClick={handleDeleteBusiness}
                    disabled={isDeleting}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl transition-colors text-xs font-bold w-full sm:w-auto"
                  >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete Team
                  </button>
                )}
              </div>
          </div>

          {/* SECTION 1: MEMBERS */}
          <div className="pt-4 border-t border-zinc-800/50">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Team Roster</h4>
              </div>
              <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/20">
                {currentBusiness.members?.map((member) => {
                  const isOwner = member.role === 'OWNER';
                  const currentRole = currentBusiness.userRole;
                  const canManage = (currentRole === 'OWNER' || currentRole === 'ADMIN') && !isOwner;

                  return (
                    <div key={member.id} className="flex items-center justify-between p-4 hover:bg-zinc-800/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-bold text-brand">
                          {member.user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{member.user.fullName}</p>
                          <p className="text-zinc-500 text-xs">@{member.user.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {canManage ? (
                          <select
                            value={member.role}
                            onChange={(e) => handleUpdateRole(member.userId, e.target.value)}
                            className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                          >
                            <option value="EMPLOYEE">Employee</option>
                            <option value="SUPERVISOR">Supervisor</option>
                            <option value="MANAGER">Manager</option>
                            <option value="ADMIN">Administrator</option>
                            <option value="GUEST">Guest</option>
                          </select>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 font-semibold uppercase tracking-wide border border-zinc-700">
                            {member.role}
                          </span>
                        )}

                        {canManage && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1.5 rounded-lg hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition-colors"
                            title="Remove from Team"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 2: JOBS / SHIFTS */}
          <div className="pt-6 border-t border-zinc-800/50">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Jobs & Schedules</h4>
                {isManager && (
                  <button
                    onClick={() => setShowPostJobModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-dark-900 font-bold hover:bg-brand-glow text-xs"
                  >
                    <PlusCircle size={14} />
                    Post Job
                  </button>
                )}
              </div>

              {loadingJobs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-brand" size={24} />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                  <Calendar className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-xs">No jobs posted for this team yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20 uppercase">
                            {job.priority}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-zinc-500 text-[10px]">
                              {job.status}
                            </span>
                            {isManager && (
                              <button
                                onClick={async () => {
                                  if (!confirm(`Delete "${job.title}"? This cannot be undone.`)) return;
                                  try {
                                    await api.delete(`/jobs/${job.id}`);
                                    fetchTeamData();
                                  } catch (err: any) {
                                    alert(err.response?.data?.error || 'Failed to delete');
                                  }
                                }}
                                className="p-1 rounded hover:bg-red-950/40 text-zinc-500 hover:text-red-400 transition-colors"
                                title="Delete Job"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <h5 className="font-bold text-white text-sm">{job.title}</h5>
                        {job.description && (
                          <p className="text-zinc-400 text-xs mt-1 line-clamp-2">{job.description}</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-4 pt-3 border-t border-zinc-800/60">
                        {job.startTime && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} className="text-brand shrink-0" />
                            {new Date(job.startTime).toLocaleDateString()}
                          </span>
                        )}
                        {job.location && (
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            <MapPin size={11} className="text-brand shrink-0" />
                            {job.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={11} className="text-brand shrink-0" />
                          {job.spotsAvailable ? `${job.spotsAvailable} spots` : 'Unlimited'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: TASKS / ASSIGNMENTS */}
          <div className="pt-6 border-t border-zinc-800/50">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Tasks & Assignments</h4>
                {isSupervisor && jobs.length > 0 && (
                  <button
                    onClick={() => setShowCreateTaskModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-dark-900 font-bold hover:bg-brand-glow text-xs"
                  >
                    <PlusCircle size={14} />
                    Assign Task
                  </button>
                )}
              </div>

              {loadingJobs ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="animate-spin text-brand" size={24} />
                </div>
              ) : allAssignments.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-zinc-800 rounded-xl">
                  <ListTodo className="h-8 w-8 text-zinc-700 mx-auto mb-2" />
                  <p className="text-zinc-500 text-xs">No active tasks assigned in this team.</p>
                  {isSupervisor && jobs.length === 0 && (
                    <p className="text-zinc-600 text-[10px] mt-1">Note: You need to create at least one Job/Shift before assigning tasks.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {allAssignments.map((task) => (
                    <div key={task.id} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            task.priority === 'URGENT' ? 'bg-red-500/10 text-red-400' : 'bg-brand/10 text-brand'
                          } uppercase`}>
                            {task.priority}
                          </span>
                          <span className="text-zinc-500 text-[10px]">
                            Under Job: <span className="text-zinc-300 font-medium">{task.jobTitle}</span>
                          </span>
                        </div>
                        <h5 className="font-bold text-white text-sm">{task.title}</h5>
                        {task.description && (
                          <p className="text-zinc-400 text-xs">{task.description}</p>
                        )}
                        {task.dueDate && (
                          <p className="text-zinc-500 text-[10px] flex items-center gap-1 mt-1">
                            <Calendar size={10} className="text-brand" />
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-xs text-zinc-300 font-bold">{task.user?.fullName}</p>
                            <p className="text-[10px] text-zinc-500">Assigned Member</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-xs text-brand border border-zinc-700">
                            {task.user?.fullName?.charAt(0).toUpperCase()}
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          task.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {task.status}
                        </span>

                        {isSupervisor && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => setEditingTask({
                                id: task.id,
                                title: task.title,
                                description: task.description || '',
                                userId: task.userId,
                                dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
                                priority: task.priority,
                                status: task.status,
                              })}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                              title="Edit Task"
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(task.id)}
                              className="p-1 rounded hover:bg-red-950/45 text-zinc-450 hover:text-red-400 transition-colors"
                              title="Delete Task"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 4: MEETINGS & ATTENDANCE */}
          <Meetings />

          {/* SECTION 5: TEAM CHAT */}
          <div className="pt-6 border-t border-zinc-800/50">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">Team Chat & Comms</h4>
            </div>
            <ChatHub />
          </div>
        </div>
      </div>
    )}

      {/* --- ADD MEMBER MODAL --- */}
      {showInviteModal && currentBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setShowInviteModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="text-brand h-5 w-5" />
                Add Member to Team
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            {inviteError && <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded">{inviteError}</p>}

            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Email or Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. john@example.com or johndoe"
                  value={inviteIdentifier}
                  onChange={e => setInviteIdentifier(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Role *</label>
                <select
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value)}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                >
                  <option value="EMPLOYEE">Employee</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !inviteIdentifier}
                  className="flex-1 py-2 bg-brand text-dark-900 text-xs font-bold rounded-lg hover:bg-brand-glow"
                >
                  {loading ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- POST JOB MODAL --- */}
      {showPostJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setShowPostJobModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="text-brand h-5 w-5" />
                Post Team Job / Shift
              </h3>
              <button onClick={() => setShowPostJobModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            {jobError && <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded">{jobError}</p>}

            <form onSubmit={handleCreateJob} className="space-y-3.5">
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Job Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Host Coordinator"
                  value={jobForm.title}
                  onChange={e => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Description</label>
                <textarea
                  placeholder="e.g. Managing VIP welcoming..."
                  value={jobForm.description}
                  onChange={e => setJobForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand resize-none"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    value={jobForm.startTime}
                    onChange={e => setJobForm(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    value={jobForm.endTime}
                    onChange={e => setJobForm(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Spots / Capacity</label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={jobForm.spotsAvailable}
                    onChange={e => setJobForm(prev => ({ ...prev, spotsAvailable: e.target.value }))}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Priority</label>
                  <select
                    value={jobForm.priority}
                    onChange={e => setJobForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Kingston Office"
                  value={jobForm.location}
                  onChange={e => setJobForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPostJobModal(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-brand text-dark-900 text-xs font-bold rounded-lg hover:bg-brand-glow"
                >
                  {loading ? 'Creating...' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CREATE TASK / ASSIGNMENT MODAL --- */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setShowCreateTaskModal(false)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ListTodo className="text-brand h-5 w-5" />
                Assign Team Task / Assignment
              </h3>
              <button onClick={() => setShowCreateTaskModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            {taskError && <p className="text-xs text-red-400 bg-red-950/40 p-2 rounded">{taskError}</p>}

            <form onSubmit={handleCreateTask} className="space-y-3.5">
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Select Parent Job *</label>
                <select
                  required
                  value={taskForm.jobId}
                  onChange={e => setTaskForm(prev => ({ ...prev, jobId: e.target.value }))}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                >
                  <option value="">-- Choose Job --</option>
                  {jobs.map(j => (
                    <option key={j.id} value={j.id}>{j.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Set up banner stands"
                  value={taskForm.title}
                  onChange={e => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Description</label>
                <textarea
                  placeholder="e.g. Place stands at the East entrance..."
                  value={taskForm.description}
                  onChange={e => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Assign to Member *</label>
                <select
                  required
                  value={taskForm.userId}
                  onChange={e => setTaskForm(prev => ({ ...prev, userId: e.target.value }))}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                >
                  <option value="">-- Select Member --</option>
                  {currentBusiness?.members?.map(m => (
                    <option key={m.userId} value={m.userId}>{m.user.fullName} (@{m.user.username})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={e => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Priority</label>
                  <select
                    value={taskForm.priority}
                    onChange={e => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTaskModal(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-brand text-dark-900 text-xs font-bold rounded-lg hover:bg-brand-glow"
                >
                  {loading ? 'Assigning...' : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT TASK / ASSIGNMENT MODAL --- */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={() => setEditingTask(null)}>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ListTodo className="text-brand h-5 w-5" />
                Edit Team Task / Assignment
              </h3>
              <button onClick={() => setEditingTask(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleUpdateAssignmentSubmit} className="space-y-3.5">
              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Set up banner stands"
                  value={editingTask.title}
                  onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Description</label>
                <textarea
                  placeholder="e.g. Place stands at the East entrance..."
                  value={editingTask.description}
                  onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-brand resize-none"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Assign to Member *</label>
                <select
                  required
                  value={editingTask.userId}
                  onChange={e => setEditingTask({ ...editingTask, userId: e.target.value })}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                >
                  <option value="">-- Select Member --</option>
                  {currentBusiness?.members?.map(m => (
                    <option key={m.userId} value={m.userId}>{m.user.fullName} (@{m.user.username})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editingTask.dueDate}
                    onChange={e => setEditingTask({ ...editingTask, dueDate: e.target.value })}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Priority</label>
                  <select
                    value={editingTask.priority}
                    onChange={e => setEditingTask({ ...editingTask, priority: e.target.value })}
                    className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] font-bold uppercase mb-1">Status</label>
                <select
                  value={editingTask.status}
                  onChange={e => setEditingTask({ ...editingTask, status: e.target.value })}
                  className="w-full bg-dark-900 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-300 focus:outline-none focus:border-brand"
                >
                  <option value="PENDING">Pending</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-brand text-dark-900 text-xs font-bold rounded-lg hover:bg-brand-glow"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Businesses;
