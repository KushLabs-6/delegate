import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, MapPin, Clock, Users, ChevronDown, ChevronUp,
  CheckCircle, XCircle, Loader2, Calendar, AlertCircle,
  Briefcase, ClipboardList, Star, X, MessageSquare,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────
interface JobSignup {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  message?: string;
  createdAt: string;
  user: { id: string; fullName: string; username: string; profileImage?: string; phone?: string };
}

interface Job {
  id: string;
  title: string;
  description?: string;
  priority: string;
  location?: string;
  status: string;
  startTime?: string;
  endTime?: string;
  spotsAvailable?: number;
  notes?: string;
  createdAt: string;
  creatorId: string;
  creator: { id: string; fullName: string; username: string };
  signups: JobSignup[];
  mySignup?: JobSignup | null;
  approvedCount: number;
  signupCount: number;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const formatShiftDate = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const formatShiftTime = (iso?: string) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const isUpcoming = (iso?: string) => {
  if (!iso) return true;
  return new Date(iso) > new Date();
};

const statusColors: Record<string, string> = {
  OPEN: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  FULL: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  CLOSED: 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/30',
  CANCELLED: 'bg-red-500/15 text-red-400 border border-red-500/30',
  COMPLETED: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
};

const signupStatusColors: Record<string, string> = {
  PENDING: 'bg-amber-500/15 text-amber-400',
  APPROVED: 'bg-emerald-500/15 text-emerald-400',
  REJECTED: 'bg-red-500/15 text-red-400',
  CANCELLED: 'bg-zinc-700/50 text-zinc-400',
};

// ─── Post Shift Modal ──────────────────────────────────────────────────────────
interface PostShiftModalProps {
  businessId: string;
  onClose: () => void;
  onCreated: () => void;
}

const PostShiftModal: React.FC<PostShiftModalProps> = ({ businessId, onClose, onCreated }) => {
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    startTime: '',
    endTime: '',
    spotsAvailable: '',
    notes: '',
    priority: 'MEDIUM',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { setError('Shift title is required'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post(`/businesses/${businessId}/jobs`, {
        ...form,
        spotsAvailable: form.spotsAvailable ? parseInt(form.spotsAvailable) : null,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to post shift');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-white">Post a New Shift</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-zinc-800">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Shift Title *</label>
            <input
              id="shift-title-input"
              type="text"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Saturday Evening Service"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="What does this shift involve?"
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Location</label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Main Hall, Store Front"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Start Time</label>
              <input
                type="datetime-local"
                value={form.startTime}
                onChange={e => set('startTime', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">End Time</label>
              <input
                type="datetime-local"
                value={form.endTime}
                onChange={e => set('endTime', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-brand transition-colors text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Spots Available</label>
              <input
                type="number"
                min="1"
                value={form.spotsAvailable}
                onChange={e => set('spotsAvailable', e.target.value)}
                placeholder="Unlimited"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Priority</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-brand transition-colors"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wide">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional details or instructions..."
              rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white placeholder-zinc-500 focus:outline-none focus:border-brand transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              id="post-shift-submit-btn"
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold hover:brightness-110 transition-all text-sm flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Post Shift
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Shift Card (Owner/Admin view) ─────────────────────────────────────────────
interface OwnerShiftCardProps {
  job: Job;
  onRefresh: () => void;
}

const OwnerShiftCard: React.FC<OwnerShiftCardProps> = ({ job, onRefresh }) => {
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleApprove = async (signupId: string) => {
    setActionLoading(signupId + '-approve');
    try {
      await api.put(`/signups/${signupId}/approve`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (signupId: string) => {
    setActionLoading(signupId + '-reject');
    try {
      await api.put(`/signups/${signupId}/reject`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingSignups = job.signups.filter(s => s.status === 'PENDING');
  const approvedSignups = job.signups.filter(s => s.status === 'APPROVED');
  const filledPct = job.spotsAvailable
    ? Math.min(100, Math.round((job.approvedCount / job.spotsAvailable) * 100))
    : null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-200">
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColors[job.status] || statusColors.OPEN}`}>
                {job.status}
              </span>
              {pendingSignups.length > 0 && (
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                  {pendingSignups.length} Pending
                </span>
              )}
            </div>
            <h3 className="font-bold text-white text-lg leading-tight truncate">{job.title}</h3>
            {job.description && (
              <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{job.description}</p>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-zinc-400">
          {job.startTime && (
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-brand" />
              <span>{formatShiftDate(job.startTime)}</span>
            </div>
          )}
          {job.startTime && (
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-brand" />
              <span>{formatShiftTime(job.startTime)}{job.endTime ? ` – ${formatShiftTime(job.endTime)}` : ''}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-brand" />
              <span className="truncate max-w-[150px]">{job.location}</span>
            </div>
          )}
        </div>

        {/* Spots progress */}
        {job.spotsAvailable && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
              <span className="flex items-center gap-1"><Users size={12} /> Spots</span>
              <span className="font-semibold text-zinc-300">{job.approvedCount} / {job.spotsAvailable} filled</span>
            </div>
            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${filledPct === 100 ? 'bg-amber-400' : 'bg-brand'}`}
                style={{ width: `${filledPct}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Toggle signups */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-3 bg-zinc-800/50 border-t border-zinc-800 text-sm text-zinc-400 hover:bg-zinc-800 transition-colors"
      >
        <span className="font-medium">
          {job.signups.filter(s => s.status !== 'CANCELLED').length} signup{job.signups.length !== 1 ? 's' : ''}
          {approvedSignups.length > 0 && ` · ${approvedSignups.length} approved`}
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {/* Signup list */}
      {expanded && (
        <div className="border-t border-zinc-800 divide-y divide-zinc-800/60">
          {job.signups.filter(s => s.status !== 'CANCELLED').length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-6">No signups yet</p>
          ) : (
            job.signups
              .filter(s => s.status !== 'CANCELLED')
              .sort((a, b) => {
                const order = { PENDING: 0, APPROVED: 1, REJECTED: 2 };
                return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
              })
              .map((signup) => (
                <div key={signup.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-bold text-brand shrink-0">
                    {signup.user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{signup.user.fullName}</p>
                    {signup.message && (
                      <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                        <MessageSquare size={10} /> {signup.message}
                      </p>
                    )}
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${signupStatusColors[signup.status]}`}>
                    {signup.status}
                  </span>
                  {signup.status === 'PENDING' && (
                    <div className="flex gap-1.5 ml-2">
                      <button
                        id={`approve-btn-${signup.id}`}
                        onClick={() => handleApprove(signup.id)}
                        disabled={actionLoading === signup.id + '-approve'}
                        className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Approve"
                      >
                        {actionLoading === signup.id + '-approve'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <CheckCircle size={14} />
                        }
                      </button>
                      <button
                        id={`reject-btn-${signup.id}`}
                        onClick={() => handleReject(signup.id)}
                        disabled={actionLoading === signup.id + '-reject'}
                        className="w-8 h-8 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/30 transition-colors flex items-center justify-center disabled:opacity-50"
                        title="Reject"
                      >
                        {actionLoading === signup.id + '-reject'
                          ? <Loader2 size={14} className="animate-spin" />
                          : <XCircle size={14} />
                        }
                      </button>
                    </div>
                  )}
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};

// ─── Member Shift Card ─────────────────────────────────────────────────────────
interface MemberShiftCardProps {
  job: Job;
  onRefresh: () => void;
}

const MemberShiftCard: React.FC<MemberShiftCardProps> = ({ job, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [showMsgInput, setShowMsgInput] = useState(false);

  const myStatus = job.mySignup?.status;
  const spotsLeft = job.spotsAvailable ? job.spotsAvailable - job.approvedCount : null;
  const isFull = spotsLeft !== null && spotsLeft <= 0;

  const handleSignup = async () => {
    setLoading(true);
    try {
      await api.post(`/jobs/${job.id}/signup`, { message: msgInput || null });
      setShowMsgInput(false);
      setMsgInput('');
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your signup request for this shift?')) return;
    setLoading(true);
    try {
      await api.delete(`/jobs/${job.id}/signup`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-all duration-200">
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusColors[job.status] || statusColors.OPEN}`}>
                {job.status}
              </span>
              {myStatus && myStatus !== 'CANCELLED' && (
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${signupStatusColors[myStatus]}`}>
                  {myStatus === 'APPROVED' ? '✓ You\'re in!' : myStatus === 'PENDING' ? '⏳ Pending' : '✗ Not approved'}
                </span>
              )}
            </div>
            <h3 className="font-bold text-white text-lg leading-tight">{job.title}</h3>
            {job.description && (
              <p className="text-zinc-400 text-sm mt-1 line-clamp-2">{job.description}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-3 text-sm text-zinc-400">
          {job.startTime && (
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-brand" />
              <span>{formatShiftDate(job.startTime)}</span>
            </div>
          )}
          {job.startTime && (
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-brand" />
              <span>{formatShiftTime(job.startTime)}{job.endTime ? ` – ${formatShiftTime(job.endTime)}` : ''}</span>
            </div>
          )}
          {job.location && (
            <div className="flex items-center gap-1.5">
              <MapPin size={13} className="text-brand" />
              <span>{job.location}</span>
            </div>
          )}
          {spotsLeft !== null && (
            <div className="flex items-center gap-1.5">
              <Users size={13} className={isFull ? 'text-red-400' : 'text-brand'} />
              <span className={isFull ? 'text-red-400' : ''}>{isFull ? 'Full' : `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left`}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="mt-4">
          {(!myStatus || myStatus === 'CANCELLED') && !isFull && job.status === 'OPEN' && (
            <div>
              {showMsgInput ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    placeholder="Add a note (optional)"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-brand text-sm"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowMsgInput(false)}
                      className="flex-1 py-2 rounded-xl border border-zinc-700 text-zinc-400 text-sm hover:bg-zinc-800 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      id={`confirm-signup-${job.id}`}
                      onClick={handleSignup}
                      disabled={loading}
                      className="flex-1 py-2 rounded-xl bg-brand text-zinc-900 font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-60 hover:brightness-110 transition-all"
                    >
                      {loading ? <Loader2 size={14} className="animate-spin" /> : '✋ I\'m Available!'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  id={`signup-btn-${job.id}`}
                  onClick={() => setShowMsgInput(true)}
                  className="w-full py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold text-sm hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  ✋ I'm Available
                </button>
              )}
            </div>
          )}
          {myStatus === 'PENDING' && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-400 font-medium">⏳ Waiting for approval...</p>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="text-xs text-zinc-500 hover:text-red-400 transition-colors underline"
              >
                Cancel request
              </button>
            </div>
          )}
          {myStatus === 'APPROVED' && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle size={15} /> You're confirmed for this shift!
              </p>
              {isUpcoming(job.startTime) && (
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="text-xs text-zinc-500 hover:text-red-400 transition-colors underline"
                >
                  Cancel
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── My Schedule Card ──────────────────────────────────────────────────────────
interface ScheduleCardProps {
  signup: any;
  onRefresh: () => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ signup, onRefresh }) => {
  const job = signup.job;
  const startDate = job.startTime ? new Date(job.startTime) : null;
  const [loading, setLoading] = useState(false);

  const handleCancel = async () => {
    if (!confirm('Cancel your approved shift signup?')) return;
    setLoading(true);
    try {
      await api.delete(`/jobs/${job.id}/signup`);
      onRefresh();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cancel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex items-start gap-4 hover:border-zinc-700 transition-all duration-200">
      {/* Date block */}
      {startDate ? (
        <div className="shrink-0 w-14 text-center bg-brand/10 border border-brand/20 rounded-xl py-2">
          <p className="text-xs font-bold text-brand uppercase">
            {startDate.toLocaleDateString('en-US', { month: 'short' })}
          </p>
          <p className="text-2xl font-black text-white leading-none">{startDate.getDate()}</p>
          <p className="text-xs text-zinc-400">{startDate.toLocaleDateString('en-US', { weekday: 'short' })}</p>
        </div>
      ) : (
        <div className="shrink-0 w-14 text-center bg-zinc-800 rounded-xl py-2">
          <ClipboardList size={20} className="text-zinc-500 mx-auto" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="font-bold text-white truncate">{job.title}</p>
        <p className="text-xs text-zinc-500 font-medium mt-0.5">{job.business?.name}</p>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-zinc-400">
          {job.startTime && (
            <span className="flex items-center gap-1">
              <Clock size={11} className="text-brand" />
              {formatShiftTime(job.startTime)}{job.endTime ? ` – ${formatShiftTime(job.endTime)}` : ''}
            </span>
          )}
          {job.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} className="text-brand" />
              {job.location}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400">
          Confirmed ✓
        </span>
        {isUpcoming(job.startTime) && (
          <button
            onClick={handleCancel}
            disabled={loading}
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
          >
            {loading ? <Loader2 size={12} className="animate-spin" /> : 'Cancel'}
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Main Jobs Page ────────────────────────────────────────────────────────────
const Jobs: React.FC = () => {
  const { currentBusiness, user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [mySchedule, setMySchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'board' | 'schedule'>('board');
  const [showPostModal, setShowPostModal] = useState(false);

  // Role detection
  const myMembership = (currentBusiness as any)?.members?.find((m: any) => m.userId === user?.id);
  const myRole = myMembership?.role ?? currentBusiness?.userRole ?? 'EMPLOYEE';
  const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(myRole);

  const fetchJobs = useCallback(async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const [jobsRes, schedRes] = await Promise.all([
        api.get(`/businesses/${currentBusiness.id}/jobs`),
        api.get('/my-schedule'),
      ]);
      setJobs(jobsRes.data);
      setMySchedule(schedRes.data.filter((s: any) => s.job.businessId === currentBusiness.id));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  if (!currentBusiness) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <Briefcase size={48} className="text-zinc-700 mb-4" />
        <h2 className="text-xl font-bold text-zinc-300 mb-2">No Team Selected</h2>
        <p className="text-zinc-500">Select a team from the header to view shifts.</p>
      </div>
    );
  }

  const availableShifts = jobs.filter(j =>
    j.status === 'OPEN' && (j.mySignup?.status !== 'APPROVED')
  );
  const pendingCount = jobs.reduce((acc, j) =>
    acc + j.signups.filter(s => s.status === 'PENDING').length, 0
  );

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white">Shifts</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{currentBusiness.name}</p>
        </div>
        {isManager && (
          <button
            id="post-shift-btn"
            onClick={() => setShowPostModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand text-zinc-900 font-semibold text-sm hover:brightness-110 transition-all shadow-lg shadow-brand/20"
          >
            <Plus size={16} />
            Post Shift
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl mb-6">
        <button
          id="tab-board"
          onClick={() => setTab('board')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'board' ? 'bg-brand text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Star size={14} />
          {isManager ? 'Shift Board' : 'Available Shifts'}
          {isManager && pendingCount > 0 && (
            <span className="bg-zinc-900 text-brand text-xs font-bold px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          id="tab-schedule"
          onClick={() => setTab('schedule')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'schedule' ? 'bg-brand text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calendar size={14} />
          My Schedule
          {mySchedule.length > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
              tab === 'schedule' ? 'bg-zinc-900 text-brand' : 'bg-zinc-700 text-zinc-300'
            }`}>
              {mySchedule.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-brand" size={32} />
        </div>
      ) : tab === 'board' ? (
        <div className="space-y-4">
          {jobs.length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList size={40} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No shifts posted yet</p>
              {isManager && (
                <p className="text-zinc-600 text-sm mt-1">Click "Post Shift" to create the first one.</p>
              )}
            </div>
          ) : isManager ? (
            jobs.map(job => (
              <OwnerShiftCard key={job.id} job={job} onRefresh={fetchJobs} />
            ))
          ) : (
            availableShifts.length === 0 ? (
              <div className="text-center py-16">
                <CheckCircle size={40} className="text-emerald-600/50 mx-auto mb-3" />
                <p className="text-zinc-400 font-medium">You're all caught up!</p>
                <p className="text-zinc-600 text-sm mt-1">No open shifts right now. Check "My Schedule" to see your upcoming confirmed shifts.</p>
              </div>
            ) : (
              availableShifts.map(job => (
                <MemberShiftCard key={job.id} job={job} onRefresh={fetchJobs} />
              ))
            )
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {mySchedule.length === 0 ? (
            <div className="text-center py-16">
              <Calendar size={40} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-zinc-400 font-medium">No confirmed shifts yet</p>
              <p className="text-zinc-600 text-sm mt-1">Sign up for available shifts to see them here once approved.</p>
            </div>
          ) : (
            mySchedule.map(signup => (
              <ScheduleCard key={signup.id} signup={signup} onRefresh={fetchJobs} />
            ))
          )}
        </div>
      )}

      {/* Post Shift Modal */}
      {showPostModal && (
        <PostShiftModal
          businessId={currentBusiness.id}
          onClose={() => setShowPostModal(false)}
          onCreated={fetchJobs}
        />
      )}
    </div>
  );
};

export default Jobs;
