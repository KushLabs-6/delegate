import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  Users, CheckSquare, Calendar, ChevronRight, 
  PlusCircle, UserPlus, ClipboardList, Activity, ArrowUpRight,
  Clock, MapPin, AlertTriangle
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface DashboardStats {
  totalMembers: number;
  activeAssignments: number;
  pendingAssignments: number;
  completedAssignments: number;
  totalJobs: number;
  completedJobs: number;
  pendingJobs: number;
  activeJobs: number;
  recentActivity: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: string;
    user: { fullName: string; username: string };
  }>;
}

const Dashboard: React.FC = () => {
  const { currentBusiness, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [upcomingShifts, setUpcomingShifts] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const navigate = useNavigate();

  const fetchDashboardData = async () => {
    if (!currentBusiness) return;
    setLoading(true);
    try {
      const [statsRes, schedRes, jobsRes] = await Promise.all([
        api.get(`/businesses/${currentBusiness.id}/stats`),
        api.get('/my-schedule'),
        api.get(`/businesses/${currentBusiness.id}/jobs`),
      ]);
      setStats(statsRes.data);

      // Upcoming confirmed shifts (next 3)
      const scheduleJobs = (schedRes.data as any[])
        .filter((s: any) => s.job.startTime && new Date(s.job.startTime) > new Date())
        .sort((a: any, b: any) => new Date(a.job.startTime).getTime() - new Date(b.job.startTime).getTime())
        .slice(0, 3);
      setUpcomingShifts(scheduleJobs);

      // Count pending approvals (for managers)
      const total = (jobsRes.data as any[]).reduce((acc: number, j: any) =>
        acc + (j.signups || []).filter((s: any) => s.status === 'PENDING').length, 0
      );
      setPendingApprovals(total);

      try {
        const chartsRes = await api.get(`/businesses/${currentBusiness.id}/charts`);
        setChartData(chartsRes.data);
      } catch (err) {
        setChartData([
          { name: 'Mon', completed: 2, pending: 3, total: 5 },
          { name: 'Tue', completed: 4, pending: 2, total: 6 },
          { name: 'Wed', completed: 3, pending: 4, total: 7 },
          { name: 'Thu', completed: 6, pending: 1, total: 7 },
          { name: 'Fri', completed: 5, pending: 2, total: 7 },
          { name: 'Sat', completed: 2, pending: 0, total: 2 },
          { name: 'Sun', completed: 1, pending: 1, total: 2 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [currentBusiness]);

  if (!currentBusiness) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
        <Users className="h-16 w-16 text-zinc-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">No Active Business</h2>
        <p className="text-zinc-400 max-w-sm mb-6">
          To access the dashboard, you need to belong to a business. Create a business or accept an invitation to join.
        </p>
        <Link 
          to="/businesses" 
          className="px-6 py-3 bg-brand text-dark-900 rounded-inner font-bold hover:bg-brand-glow hover:shadow-neon transition-all"
        >
          Manage Businesses
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-panel rounded-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full filter blur-2xl"></div>
        <h2 className="text-xl font-bold text-white mb-1">
          Welcome back, {user?.fullName}!
        </h2>
        <p className="text-zinc-400 text-sm">
          Here is what's happening today at <span className="text-brand font-semibold">{currentBusiness.name}</span>.
        </p>
      </div>

      {/* Pending Approvals Alert (manager) */}
      {pendingApprovals > 0 && (
        <button
          id="pending-approvals-banner"
          onClick={() => navigate('/jobs')}
          className="w-full flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl hover:bg-amber-500/15 transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <AlertTriangle size={18} className="text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-300">{pendingApprovals} Pending Approval{pendingApprovals !== 1 ? 's' : ''}</p>
              <p className="text-xs text-amber-400/70">Team members are waiting — click to review</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
        </button>
      )}

      {/* Upcoming Shifts (member widget) */}
      {upcomingShifts.length > 0 && (
        <div className="glass-panel rounded-card p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-brand" />
              My Upcoming Shifts
            </span>
            <button onClick={() => navigate('/jobs')} className="text-[10px] text-brand hover:underline flex items-center gap-0.5">
              View All <ArrowUpRight className="h-3 w-3" />
            </button>
          </h3>
          <div className="space-y-3">
            {upcomingShifts.map((signup: any) => {
              const job = signup.job;
              const startDate = new Date(job.startTime);
              return (
                <div key={signup.id} className="flex items-center gap-4 p-3 bg-zinc-800/50 rounded-xl">
                  <div className="shrink-0 w-12 text-center bg-brand/10 border border-brand/20 rounded-xl py-1.5">
                    <p className="text-[10px] font-bold text-brand uppercase">{startDate.toLocaleDateString('en-US', { month: 'short' })}</p>
                    <p className="text-lg font-black text-white leading-none">{startDate.getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                    <div className="flex gap-3 mt-1 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Clock size={10} className="text-brand" />
                        {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {job.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={10} className="text-brand" />
                          {job.location}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold shrink-0">Confirmed</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Members */}
        <div className="glass-panel rounded-card p-4 flex flex-col justify-between h-28 relative">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold tracking-wider uppercase">Members</span>
            <Users className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{loading ? '...' : stats?.totalMembers || 0}</h3>
            <p className="text-zinc-500 text-[10px] mt-0.5">Active team members</p>
          </div>
        </div>

        {/* Active Assignments */}
        <div className="glass-panel rounded-card p-4 flex flex-col justify-between h-28 relative">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold tracking-wider uppercase">Active Tasks</span>
            <CheckSquare className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{loading ? '...' : stats?.activeAssignments || 0}</h3>
            <p className="text-zinc-500 text-[10px] mt-0.5">Assigned to your team</p>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="glass-panel rounded-card p-4 flex flex-col justify-between h-28 relative">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold tracking-wider uppercase">Completed</span>
            <ClipboardList className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{loading ? '...' : stats?.completedAssignments || 0}</h3>
            <p className="text-zinc-500 text-[10px] mt-0.5">Tasks fully resolved</p>
          </div>
        </div>

        {/* Total Jobs */}
        <div className="glass-panel rounded-card p-4 flex flex-col justify-between h-28 relative">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-xs font-semibold tracking-wider uppercase">Active Jobs</span>
            <Calendar className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white">{loading ? '...' : stats?.activeJobs || 0}</h3>
            <p className="text-zinc-500 text-[10px] mt-0.5">High-level work phases</p>
          </div>
        </div>
      </div>

      {/* Quick Actions (Yellow Focus) */}
      <div className="glass-panel rounded-card p-5">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <PlusCircle className="h-4.5 w-4.5 text-brand" />
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link 
            to="/jobs" 
            className="flex items-center gap-3 p-3.5 rounded-inner bg-brand/10 border border-brand/20 hover:border-brand/40 text-left transition group"
          >
            <div className="p-2 rounded-lg bg-brand text-dark-900 group-hover:scale-105 transition-all">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Create Job</div>
              <div className="text-[10px] text-zinc-500">Plan new campaign</div>
            </div>
          </Link>

          <Link 
            to="/businesses" 
            className="flex items-center gap-3 p-3.5 rounded-inner bg-brand/10 border border-brand/20 hover:border-brand/40 text-left transition group"
          >
            <div className="p-2 rounded-lg bg-brand text-dark-900 group-hover:scale-105 transition-all">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Invite User</div>
              <div className="text-[10px] text-zinc-500">Add to business</div>
            </div>
          </Link>

          <Link 
            to="/calendar" 
            className="flex items-center gap-3 p-3.5 rounded-inner bg-brand/10 border border-brand/20 hover:border-brand/40 text-left transition group"
          >
            <div className="p-2 rounded-lg bg-brand text-dark-900 group-hover:scale-105 transition-all">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Schedule</div>
              <div className="text-[10px] text-zinc-500">View upcoming jobs</div>
            </div>
          </Link>

          <Link 
            to="/chat" 
            className="flex items-center gap-3 p-3.5 rounded-inner bg-brand/10 border border-brand/20 hover:border-brand/40 text-left transition group"
          >
            <div className="p-2 rounded-lg bg-brand text-dark-900 group-hover:scale-105 transition-all">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Group Chat</div>
              <div className="text-[10px] text-zinc-500">Broadcast message</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Analytics Chart */}
      <div className="glass-panel rounded-card p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-white">Weekly Assignment Trends</h3>
            <p className="text-zinc-500 text-xs mt-0.5">Visual completed vs pending tasks ratio</p>
          </div>
          <div className="flex gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2.5 h-2.5 rounded bg-brand"></span>
              <span>Pending</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <span className="w-2.5 h-2.5 rounded bg-zinc-600"></span>
              <span>Completed</span>
            </div>
          </div>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                labelStyle={{ fontWeight: 'bold', color: '#fff' }}
              />
              <Bar dataKey="pending" fill="#FACC15" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={30} />
              <Bar dataKey="completed" fill="#52525b" radius={[4, 4, 0, 0]} stackId="a" maxBarSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid: Recent Logs & Active Members */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Activity Logs */}
        <div className="glass-panel rounded-card p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Activity className="h-4.5 w-4.5 text-brand" />
              Activity Feed
            </span>
            <Link to="/businesses" className="text-[10px] text-brand hover:underline flex items-center gap-0.5">
              View Audit <ArrowUpRight className="h-3 w-3" />
            </Link>
          </h3>
          <div className="space-y-4 max-h-72 overflow-y-auto no-scrollbar">
            {loading ? (
              <p className="text-zinc-500 text-sm py-4 text-center">Loading audit log...</p>
            ) : !stats?.recentActivity || stats.recentActivity.length === 0 ? (
              <p className="text-zinc-500 text-sm py-4 text-center">No recent activities logged.</p>
            ) : (
              stats.recentActivity.map((log) => (
                <div key={log.id} className="flex gap-3 text-xs leading-relaxed border-b border-zinc-900 pb-3 last:border-0 last:pb-0">
                  <div className="p-1.5 rounded-lg bg-zinc-800 text-brand shrink-0 h-7 w-7 flex items-center justify-center font-bold">
                    {log.user.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="text-zinc-300">
                      <span className="font-semibold text-white">{log.user.fullName}</span>: {log.details}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(log.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Member Activity Ranking */}
        <div className="glass-panel rounded-card p-5">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-brand" />
              Top Team Members
            </span>
          </h3>
          <div className="space-y-4">
            {loading ? (
              <p className="text-zinc-500 text-sm py-4 text-center">Loading members...</p>
            ) : (
              // Simple mock list or dynamic list based on stats
              <div className="space-y-3.5">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand text-dark-900 flex items-center justify-center font-black text-xs">
                      {user?.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{user?.fullName}</div>
                      <div className="text-[10px] text-zinc-500">System Admin</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">{stats?.completedAssignments || 0} Tasks</div>
                    <div className="text-[9px] text-brand">Top Performer</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
