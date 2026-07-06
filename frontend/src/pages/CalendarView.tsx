import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.js';
import api from '../services/api.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface EventItem {
  id: string;
  title: string;
  type: 'job' | 'assignment';
  date: Date;
  priority: string;
  status: string;
}

const CalendarView: React.FC = () => {
  const { currentBusiness } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState<EventItem[]>([]);
  const [selectedDayString, setSelectedDayString] = useState<string | null>(null);

  const fetchEvents = async () => {
    if (!currentBusiness) return;
    try {
      const jobsRes = await api.get(`/businesses/${currentBusiness.id}/jobs`);
      
      const mappedEvents: EventItem[] = [];

      jobsRes.data.forEach((job: any) => {
        if (job.deadline) {
          mappedEvents.push({
            id: job.id,
            title: `Job: ${job.title}`,
            type: 'job',
            date: new Date(job.deadline),
            priority: job.priority,
            status: job.status,
          });
        }

        if (job.assignments) {
          job.assignments.forEach((assign: any) => {
            if (assign.dueDate) {
              mappedEvents.push({
                id: assign.id,
                title: `Task: ${assign.title}`,
                type: 'assignment',
                date: new Date(assign.dueDate),
                priority: assign.priority,
                status: assign.status,
              });
            }
          });
        }
      });

      setEvents(mappedEvents);

      // Set initial selection to today
      const todayStr = new Date().toDateString();
      setSelectedDayString(todayStr);
      const todays = mappedEvents.filter(e => e.date.toDateString() === todayStr);
      setSelectedDayEvents(todays);
    } catch (err) {
      console.error('Error fetching calendar events', err);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentBusiness]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Create blanks for days of previous month
  const prevMonthBlanks = Array(firstDayIndex).fill(null);
  
  // Create day numbers for current month
  const monthDays = Array.from({ length: daysInMonth }, (_, idx) => idx + 1);

  const calendarDays = [...prevMonthBlanks, ...monthDays];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDaySelect = (dayNum: number | null) => {
    if (!dayNum) return;
    const targetDate = new Date(year, month, dayNum);
    const dateStr = targetDate.toDateString();
    setSelectedDayString(dateStr);
    
    const dayEvents = events.filter(event => event.date.toDateString() === dateStr);
    setSelectedDayEvents(dayEvents);
  };

  const isToday = (dayNum: number | null) => {
    if (!dayNum) return false;
    const checkDate = new Date(year, month, dayNum);
    return checkDate.toDateString() === new Date().toDateString();
  };

  const getEventsForDay = (dayNum: number | null) => {
    if (!dayNum) return [];
    const checkDate = new Date(year, month, dayNum);
    const dateStr = checkDate.toDateString();
    return events.filter(e => e.date.toDateString() === dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Calendar Schedule</h2>
          <p className="text-zinc-500 text-xs">Track deadlines and phase due dates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid Container */}
        <div className="lg:col-span-2 glass-panel rounded-card p-5 space-y-4">
          {/* Calendar Controller */}
          <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <h3 className="font-bold text-white text-base">
              {monthNames[month]} {year}
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={handlePrevMonth}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-inner text-zinc-400 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={handleNextMonth}
                className="p-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-inner text-zinc-400 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Day Labels */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-zinc-500 uppercase tracking-widest">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((dayNum, index) => {
              const dayEvents = getEventsForDay(dayNum);
              const hasEvents = dayEvents.length > 0;
              const isSelected = dayNum && new Date(year, month, dayNum).toDateString() === selectedDayString;
              const today = isToday(dayNum);

              return (
                <div
                  key={index}
                  onClick={() => handleDaySelect(dayNum)}
                  className={`aspect-square p-1 rounded-inner border cursor-pointer flex flex-col justify-between transition-all relative ${
                    !dayNum ? 'pointer-events-none border-transparent opacity-0' :
                    isSelected ? 'border-brand bg-brand/5 shadow-neon' :
                    today ? 'border-brand/40 bg-zinc-900/60 font-bold' :
                    'border-zinc-800/40 bg-zinc-900/20 hover:border-zinc-700'
                  }`}
                >
                  <span className={`text-xs ${today ? 'text-brand font-bold' : 'text-zinc-400'}`}>
                    {dayNum}
                  </span>
                  
                  {/* Event indicator dot or tiny tag */}
                  {hasEvents && (
                    <div className="flex gap-0.5 justify-center mt-1">
                      {dayEvents.slice(0, 3).map((e, idx) => (
                        <span 
                          key={idx} 
                          className={`w-1.5 h-1.5 rounded-full ${
                            e.priority === 'URGENT' ? 'bg-red-500' :
                            e.priority === 'HIGH' ? 'bg-amber-500' :
                            'bg-brand'
                          }`}
                        ></span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Day Agenda */}
        <div className="glass-panel rounded-card p-5 space-y-4 flex flex-col justify-between min-h-[300px]">
          <div>
            <div className="border-b border-zinc-850 pb-3 mb-4">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Scheduled Tasks</h4>
              <p className="text-zinc-500 text-[10px] mt-0.5">{selectedDayString || 'Select a day to view agenda'}</p>
            </div>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto no-scrollbar">
              {selectedDayEvents.length === 0 ? (
                <p className="text-zinc-600 text-xs py-10 text-center">No assignments or deadlines scheduled on this day.</p>
              ) : (
                selectedDayEvents.map((e) => (
                  <div 
                    key={e.id}
                    className="p-3 bg-zinc-900/80 border border-zinc-800/60 rounded-inner flex flex-col gap-1.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                        e.type === 'job' ? 'bg-brand/10 text-brand' : 'bg-zinc-800 text-zinc-300'
                      }`}>
                        {e.type}
                      </span>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        e.priority === 'URGENT' ? 'bg-red-500' : 'bg-brand'
                      }`}></span>
                    </div>
                    <h5 className="font-bold text-white text-xs line-clamp-1">{e.title}</h5>
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Status: {e.status}</span>
                      <span>Priority: {e.priority}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Link 
            to="/jobs"
            className="w-full py-2.5 rounded-inner bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-semibold text-center text-xs block transition-all"
          >
            Manage Job Timelines
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
