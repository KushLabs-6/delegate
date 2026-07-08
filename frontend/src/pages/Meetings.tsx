import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { Calendar, Users, PlusCircle, Clock, Trash2, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Meetings: React.FC = () => {
  const { currentBusiness } = useAuth();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<any | null>(null);

  const [form, setForm] = useState({
    groupId: '',
    title: '',
    description: '',
    startTime: ''
  });

  const fetchMeetingsAndGroups = useCallback(async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const groupsRes = await api.get(`/businesses/${currentBusiness.id}/groups`);
      setGroups(groupsRes.data);

      let allMeetings: any[] = [];
      for (const g of groupsRes.data) {
        const meetRes = await api.get(`/groups/${g.id}/meetings`);
        allMeetings = [...allMeetings, ...meetRes.data];
      }
      
      // Sort by upcoming
      allMeetings.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      setMeetings(allMeetings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentBusiness]);

  useEffect(() => {
    fetchMeetingsAndGroups();
  }, [fetchMeetingsAndGroups]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.groupId || !form.title || !form.startTime) return;
    
    try {
      await api.post(`/groups/${form.groupId}/meetings`, form);
      setShowCreate(false);
      setForm({ groupId: '', title: '', description: '', startTime: '' });
      fetchMeetingsAndGroups();
    } catch (err) {
      alert('Failed to create meeting');
    }
  };

  const handleMarkAttendance = async (meetingId: string, userId: string, status: string) => {
    try {
      await api.post(`/meetings/${meetingId}/attendance`, { userId, status });
      // Update local state without full refetch for speed
      setMeetings(prev => prev.map(m => {
        if (m.id === meetingId) {
          const newAtt = m.attendance.filter((a: any) => a.userId !== userId);
          newAtt.push({ userId, status, user: currentBusiness?.members?.find(mem => mem.userId === userId)?.user });
          return { ...m, attendance: newAtt };
        }
        return m;
      }));
    } catch (err) {
      alert('Failed to mark attendance');
    }
  };

  const handleDelete = async (meetingId: string) => {
    if (!confirm('Delete this meeting?')) return;
    try {
      await api.delete(`/meetings/${meetingId}`);
      if (selectedMeeting?.id === meetingId) setSelectedMeeting(null);
      fetchMeetingsAndGroups();
    } catch (err) {
      alert('Failed to delete meeting');
    }
  };

  if (!currentBusiness) return null;
  const isManager = ['OWNER', 'ADMIN', 'MANAGER'].includes(currentBusiness.userRole);

  return (
    <div className="space-y-4 pt-6 border-t border-zinc-800/50">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Team Meetings & Attendance</h4>
        {isManager && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-dark-900 font-bold hover:bg-brand-glow text-xs"
          >
            <PlusCircle size={14} />
            Schedule Meeting
          </button>
        )}
      </div>

      {showCreate && (
        <div className="glass-panel p-4 rounded-xl border border-brand/20 space-y-3 mb-6">
          <h5 className="font-bold text-white text-sm">Schedule a new meeting</h5>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1 font-bold">Select Group *</label>
              <select required className="w-full bg-dark-900 border border-zinc-700 rounded-lg p-2 text-white text-xs" value={form.groupId} onChange={e => setForm({...form, groupId: e.target.value})}>
                <option value="">-- Select Group --</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1 font-bold">Meeting Title *</label>
              <input required type="text" className="w-full bg-dark-900 border border-zinc-700 rounded-lg p-2 text-white text-xs" placeholder="Weekly Sync" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1 font-bold">Description</label>
              <input type="text" className="w-full bg-dark-900 border border-zinc-700 rounded-lg p-2 text-white text-xs" placeholder="Discussing Q3 goals..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 mb-1 font-bold">Date & Time *</label>
              <input required type="datetime-local" className="w-full bg-dark-900 border border-zinc-700 rounded-lg p-2 text-white text-xs" value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-zinc-800 rounded-lg text-xs font-bold text-zinc-300">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-brand text-dark-900 rounded-lg text-xs font-bold">Schedule</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="animate-spin text-brand" size={20}/></div>
      ) : meetings.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-zinc-800 rounded-xl">
          <Calendar className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
          <p className="text-zinc-500 text-xs">No upcoming meetings scheduled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {meetings.map((m) => {
            const date = new Date(m.startTime);
            const isPast = date.getTime() < Date.now();
            return (
              <div key={m.id} className="p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all flex flex-col justify-between cursor-pointer" onClick={() => setSelectedMeeting(m.id === selectedMeeting?.id ? null : m)}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h5 className="font-bold text-white text-sm">{m.title}</h5>
                    <p className="text-[10px] text-zinc-500">{groups.find(g=>g.id === m.groupId)?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPast ? 'bg-zinc-800 text-zinc-400' : 'bg-brand/10 text-brand'}`}>
                      {isPast ? 'PAST' : 'UPCOMING'}
                    </p>
                  </div>
                </div>
                {m.description && <p className="text-xs text-zinc-400 mb-3">{m.description}</p>}
                
                <div className="flex justify-between items-center pt-2 border-t border-zinc-800/60 mt-2">
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Clock size={12} className="text-brand"/> {date.toLocaleString()}</span>
                  <span className="text-[11px] text-zinc-400 flex items-center gap-1"><Users size={12} className="text-brand"/> {m.attendance?.length || 0} Attended</span>
                </div>

                {/* Attendance Panel Expand */}
                {selectedMeeting?.id === m.id && (
                  <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center">
                      <h6 className="text-xs font-bold text-white">Attendance Roll Call</h6>
                      {isManager && <button onClick={() => handleDelete(m.id)} className="text-red-400 hover:text-red-300 text-[10px]"><Trash2 size={12}/></button>}
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {currentBusiness.members?.map((mem: any) => {
                        const att = m.attendance?.find((a:any) => a.userId === mem.userId);
                        return (
                          <div key={mem.userId} className="flex justify-between items-center bg-zinc-800/40 p-2 rounded-lg">
                            <span className="text-xs text-zinc-300">{mem.user.fullName}</span>
                            <div className="flex gap-1">
                              <button onClick={() => handleMarkAttendance(m.id, mem.userId, 'PRESENT')} className={`text-[10px] px-2 py-1 rounded ${att?.status === 'PRESENT' ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-emerald-500/20'}`}>Present</button>
                              <button onClick={() => handleMarkAttendance(m.id, mem.userId, 'LATE')} className={`text-[10px] px-2 py-1 rounded ${att?.status === 'LATE' ? 'bg-amber-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-amber-500/20'}`}>Late</button>
                              <button onClick={() => handleMarkAttendance(m.id, mem.userId, 'ABSENT')} className={`text-[10px] px-2 py-1 rounded ${att?.status === 'ABSENT' ? 'bg-red-500 text-white' : 'bg-zinc-700 text-zinc-400 hover:bg-red-500/20'}`}>Absent</button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};

export default Meetings;
