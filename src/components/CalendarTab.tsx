import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Edit3, Check, X, Calendar, Target, Award, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { Trade, Account } from '../types';
import { formatCurrency, formatNumberAbbreviated } from '../utils';

interface CalendarTabProps {
  accounts: Account[];
  activeAccountId: string;
  calendarDate: Date;
  setCalendarDate: (date: Date) => void;
  selectedCalendarDay: string | null;
  setSelectedCalendarDay: (day: string | null) => void;
  activeAccountTrades: Trade[];
}

export default function CalendarTab({
  accounts,
  activeAccountId,
  calendarDate,
  setCalendarDate,
  selectedCalendarDay,
  setSelectedCalendarDay,
  activeAccountTrades
}: CalendarTabProps) {
  const currentAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];
  const currentCurrency = currentAccount?.currency || 'USD';

  // State to toggle primary view mode: 'week' | 'month' | 'year' | 'all'
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'year' | 'all'>('month');

  // Goals key structure based on selected periods (Weeks, Months, Years, Lifetime)
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  // --- CALENDAR DATE / MONTH CONFIGURATION ---
  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
    setSelectedCalendarDay(null);
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
    setSelectedCalendarDay(null);
  };

  // --- YEAR VIEW CONFIGURATION ---
  const [selectedYear, setSelectedYear] = useState(() => calendarDate.getFullYear());
  const handlePrevYear = () => {
    setSelectedYear(prev => prev - 1);
  };
  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

  // --- WEEK VIEW CONFIGURATION ---
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Get Monday of current week
    return new Date(d.setDate(diff));
  });

  const handlePrevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const handleNextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const weekStartStr = useMemo(() => {
    const padD = weekStart.getDate() < 10 ? '0' + weekStart.getDate() : weekStart.getDate();
    const padM = weekStart.getMonth() + 1 < 10 ? '0' + (weekStart.getMonth() + 1) : weekStart.getMonth() + 1;
    return `${weekStart.getFullYear()}-${padM}-${padD}`;
  }, [weekStart]);

  const goalKeys = useMemo(() => {
    return {
      week: `goal_weekly_${activeAccountId}_${weekStartStr}`,
      month: `goal_monthly_${activeAccountId}_${year}_${month}`,
      year: `goal_yearly_${activeAccountId}_${selectedYear}`,
      all: `goal_all_${activeAccountId}`
    };
  }, [activeAccountId, weekStartStr, year, month, selectedYear]);

  const [goalsRevision, setGoalsRevision] = useState(0);

  const activeGoal = useMemo(() => {
    const key = viewMode === 'week' ? goalKeys.week
              : viewMode === 'month' ? goalKeys.month
              : viewMode === 'year' ? goalKeys.year
              : goalKeys.all;

    const defaultVal = viewMode === 'week' ? 500
                     : viewMode === 'month' ? 3000
                     : viewMode === 'year' ? 10000
                     : 50000;

    const saved = localStorage.getItem(key);
    return saved ? Number(saved) : defaultVal;
  }, [viewMode, goalKeys, goalsRevision]);

  // Track if we are editing the goal
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoalValue, setTempGoalValue] = useState('');

  // Update goals state when active account changes
  useEffect(() => {
    setIsEditingGoal(false);
  }, [activeAccountId, viewMode, calendarDate, selectedYear, weekStart]);

  // Activate edit mode
  const handleStartEditGoal = () => {
    setTempGoalValue(activeGoal.toString());
    setIsEditingGoal(true);
  };

  // Save the goal to state and local storage
  const handleSaveGoal = () => {
    const num = parseFloat(tempGoalValue);
    if (!isNaN(num) && num >= 0) {
      const key = viewMode === 'week' ? goalKeys.week
                : viewMode === 'month' ? goalKeys.month
                : viewMode === 'year' ? goalKeys.year
                : goalKeys.all;
      localStorage.setItem(key, num.toString());
      setGoalsRevision(prev => prev + 1);
    }
    setIsEditingGoal(false);
  };

  const weekDays = useMemo(() => {
    const list = [];
    for (let i = 0; i < 7; i++) {
      const nextD = new Date(weekStart);
      nextD.setDate(weekStart.getDate() + i);
      const padD = nextD.getDate() < 10 ? '0' + nextD.getDate() : nextD.getDate();
      const padM = nextD.getMonth() + 1 < 10 ? '0' + (nextD.getMonth() + 1) : nextD.getMonth() + 1;
      const dateStr = `${nextD.getFullYear()}-${padM}-${padD}`;
      list.push({
        date: nextD,
        dateStr,
        dayName: nextD.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: nextD.getDate()
      });
    }
    return list;
  }, [weekStart]);

  const monthNamesEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to fetch day trades + net profit or loss
  const getDayTradesAndPnl = (dateStr: string) => {
    const dayTrades = activeAccountTrades.filter(t => t.entryDate.substring(0, 10) === dateStr);
    const totalPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);
    return {
      trades: dayTrades,
      pnl: totalPnl,
      count: dayTrades.length
    };
  };

  // --- TIME-BASED METRIC CALCULATIONS ---

  // Current Month P&L
  const currentMonthPnl = useMemo(() => {
    const formatMonthStr = `${year}-${(month + 1) < 10 ? '0' + (month + 1) : (month + 1)}`;
    const monthTrades = activeAccountTrades.filter(t => t.entryDate.substring(0, 7) === formatMonthStr);
    return monthTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [activeAccountTrades, year, month]);

  // Current Year P&L
  const currentYearPnl = useMemo(() => {
    const yearStr = `${selectedYear}`;
    const yearTrades = activeAccountTrades.filter(t => t.entryDate.substring(0, 4) === yearStr);
    return yearTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [activeAccountTrades, selectedYear]);

  // Current Week P&L
  const currentWeekPnl = useMemo(() => {
    const weekDateStrings = weekDays.map(d => d.dateStr);
    const weekTrades = activeAccountTrades.filter(t => weekDateStrings.includes(t.entryDate.substring(0, 10)));
    return weekTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [activeAccountTrades, weekDays]);

  // All Time P&L
  const allTimePnl = useMemo(() => {
    return activeAccountTrades.reduce((sum, t) => sum + t.pnl, 0);
  }, [activeAccountTrades]);

  // Determine ACTIVE PnL & active Goal based on viewMode
  const activePnl = viewMode === 'week' ? currentWeekPnl
                  : viewMode === 'month' ? currentMonthPnl
                  : viewMode === 'year' ? currentYearPnl
                  : allTimePnl;

  const goalTitle = viewMode === 'week' ? 'Weekly Target'
                  : viewMode === 'month' ? 'Monthly Target'
                  : viewMode === 'year' ? 'Yearly Target'
                  : 'Lifetime Target';

  const progressPercent = activeGoal > 0 ? Math.min(100, Math.max(0, (activePnl / activeGoal) * 100)) : 0;

  // Selected Day detailed trades list (applicable to Month & Week view)
  const selectedTradesList = selectedCalendarDay
    ? activeAccountTrades.filter(t => t.entryDate.substring(0, 10) === selectedCalendarDay)
    : [];

  // Generate GitHub style micro contribution grid for Year View (per month card)
  const renderMonthContributionGrid = (mIdx: number) => {
    const daysInM = new Date(selectedYear, mIdx + 1, 0).getDate();
    const firstDay = new Date(selectedYear, mIdx, 1).getDay();
    // Align Monday as the first column (0=Mon, 1=Tue... 6=Sun)
    const offset = firstDay === 0 ? 6 : firstDay - 1;

    const cells: Array<{ dateStr: string | null; isTradeDay: boolean; isProfit: boolean }> = [];
    
    // Fill offset with empty padding cells
    for (let i = 0; i < offset; i++) {
        cells.push({ dateStr: null, isTradeDay: false, isProfit: false });
    }
    
    // Fill each day of that month
    for (let d = 1; d <= daysInM; d++) {
      const padD = d < 10 ? '0' + d : d;
      const padM = mIdx + 1 < 10 ? '0' + (mIdx + 1) : mIdx + 1;
      const dStr = `${selectedYear}-${padM}-${padD}`;
      const dayTrades = activeAccountTrades.filter(t => t.entryDate.substring(0, 10) === dStr);
      const dayPnl = dayTrades.reduce((sum, t) => sum + t.pnl, 0);

      cells.push({
        dateStr: dStr,
        isTradeDay: dayTrades.length > 0,
        isProfit: dayPnl >= 0.01
      });
    }

    return (
      <div className="grid grid-cols-7 gap-[2px] mt-2 p-1.5 bg-cat-base border border-cat-surface0 rounded-lg max-w-[124px] mx-auto select-none">
        {cells.map((cell, idx) => {
          if (!cell.dateStr) {
            return <div key={`pad-${idx}`} className="w-1.5 h-1.5 bg-transparent" />;
          }
          return (
            <div
              key={cell.dateStr}
              className={`w-1.5 h-1.5 rounded-[1px] transition-all ${
                cell.isTradeDay
                  ? cell.isProfit
                    ? 'bg-cat-green shadow-[0_0_4px_rgba(34,197,94,0.4)]'
                    : 'bg-cat-red shadow-[0_0_4px_rgba(239,68,68,0.4)]'
                  : 'bg-cat-surface0/40'
              }`}
              title={cell.dateStr}
            />
          );
        })}
      </div>
    );
  };

  // Month days builder for Month View - Monday through Friday only (5 columns)
  const monthGridDays = useMemo(() => {
    // Find the first day of the month
    const firstDay = new Date(year, month, 1);
    const dayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Monday of the week containing the first day
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startDate = new Date(year, month, 1 - daysToSubtract);
    const lastDay = new Date(year, month + 1, 0);

    const weeksList: Array<Array<{ dateStr: string | null; dayNum: number | null }>> = [];
    const currentWeekStart = new Date(startDate);

    while (currentWeekStart <= lastDay) {
      const weekCells = [];
      for (let i = 0; i < 5; i++) { // Only Monday to Friday
        const currentDate = new Date(currentWeekStart);
        currentDate.setDate(currentWeekStart.getDate() + i);

        if (currentDate.getMonth() === month && currentDate.getFullYear() === year) {
          const padD = currentDate.getDate() < 10 ? '0' + currentDate.getDate() : currentDate.getDate();
          const padM = month + 1 < 10 ? '0' + (month + 1) : month + 1;
          const dateStr = `${year}-${padM}-${padD}`;
          weekCells.push({ dateStr, dayNum: currentDate.getDate() });
        } else {
          weekCells.push({ dateStr: null, dayNum: null });
        }
      }
      weeksList.push(weekCells);

      // Move to the next week (next Monday)
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    }

    return weeksList.flat();
  }, [year, month]);

  return (
    <div className="space-y-4 pb-6">
      {/* 4-Pill View Mode Selector (Week, Month, Year, All Time) */}
      <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-1 flex select-none">
        {(['week', 'month', 'year', 'all'] as const).map((mode) => (
          <button
            key={mode}
            onClick={() => {
              setViewMode(mode);
              setSelectedCalendarDay(null);
            }}
            className={`flex-1 py-1.5 text-2xs font-extrabold uppercase tracking-wider rounded-xl transition-all text-center cursor-pointer ${
              viewMode === mode
                ? 'bg-cat-green text-cat-base border border-cat-surface0 font-black shadow-[2px_2px_0px_rgba(0,0,0,1)]'
                : 'text-cat-subtext hover:text-cat-text hover:bg-cat-surface0/30'
            }`}
          >
            {mode === 'all' ? 'All time' : mode}
          </button>
        ))}
      </div>

      {/* Dynamic Date switcher header */}
      <div className="flex items-center justify-between bg-cat-mantle border-2 border-cat-surface0 px-4 py-2.5 rounded-2xl select-none brut-shadow-sm">
        {viewMode !== 'all' ? (
          <>
            <button
              onClick={() => {
                if (viewMode === 'week') handlePrevWeek();
                else if (viewMode === 'month') handlePrevMonth();
                else handlePrevYear();
              }}
              className="p-1 hover:bg-cat-surface0 rounded-lg text-cat-subtext hover:text-cat-text transition cursor-pointer"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            
            <h4 className="font-extrabold text-[10px] text-cat-lavender uppercase tracking-widest font-mono">
              {viewMode === 'week' && `Week: ${weekDays[0].dayNum} ${monthNamesEn[weekDays[0].date.getMonth()]} - ${weekDays[6].dayNum} ${monthNamesEn[weekDays[6].date.getMonth()]} ${weekDays[6].date.getFullYear()}`}
              {viewMode === 'month' && `${monthNamesEn[month]} ${year}`}
              {viewMode === 'year' && `Year ${selectedYear}`}
            </h4>

            <button
              onClick={() => {
                if (viewMode === 'week') handleNextWeek();
                else if (viewMode === 'month') handleNextMonth();
                else handleNextYear();
              }}
              className="p-1 hover:bg-cat-surface0 rounded-lg text-cat-subtext hover:text-cat-text transition cursor-pointer"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </>
        ) : (
          <div className="text-center w-full py-0.5">
            <h4 className="font-extrabold text-[10px] text-cat-lavender uppercase tracking-widest block font-mono">
              JOURNAL ALL-TIME HISTORY
            </h4>
          </div>
        )}
      </div>

      {/* Two Stats Cards: Total P&L & Goal Progress */}
      <div className="grid grid-cols-2 gap-3 select-none">
        {/* Total P&L Card */}
        <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 flex flex-col justify-between min-h-[96px] brut-shadow-sm">
          <span className="text-[9px] text-cat-text font-black uppercase tracking-wider block">Net Profit & Loss</span>
          <h2 className={`text-sm lg:text-base font-black font-mono tracking-tight my-1.5 block leading-none ${activePnl >= 0.01 ? 'text-cat-green' : activePnl <= -0.01 ? 'text-cat-red' : 'text-cat-subtext'}`}>
            {activePnl >= 0.01 ? '+' : ''}{formatCurrency(activePnl, currentCurrency)}
          </h2>
          <span className="text-[8px] text-cat-subtext font-bold uppercase tracking-wide block">
            {viewMode === 'week' && `This Week`}
            {viewMode === 'month' && `In ${monthNamesEn[month]} ${year}`}
            {viewMode === 'year' && `In ${selectedYear}`}
            {viewMode === 'all' && `All-time historical`}
          </span>
        </div>

        {/* Dynamic Goal Card */}
        <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 flex flex-col justify-between min-h-[96px] brut-shadow-sm">
          {isEditingGoal ? (
            <div className="flex flex-col h-full justify-between">
              <span className="text-[9px] text-cat-peach font-black uppercase tracking-wider block">Target ({currentCurrency})</span>
              <div className="flex items-center gap-1.5 mt-1.5">
                <input
                  type="number"
                  value={tempGoalValue}
                  onChange={(e) => setTempGoalValue(e.target.value)}
                  className="px-2 py-1.5 text-xs font-mono w-full min-w-0"
                  placeholder="3000"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveGoal();
                    if (e.key === 'Escape') setIsEditingGoal(false);
                  }}
                  autoFocus
                />
                <button 
                  onClick={handleSaveGoal}
                  className="bg-cat-green text-cat-base p-1.5 rounded-lg hover:bg-cat-green/95 transition cursor-pointer shrink-0 border border-cat-surface0"
                >
                  <Check className="h-3.5 w-3.5 font-bold" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-cat-text font-black uppercase tracking-wider">{goalTitle}</span>
                <button 
                  onClick={handleStartEditGoal}
                  className="text-cat-lavender hover:text-cat-mauve transition p-0.5 cursor-pointer"
                  title="Edit Target"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                </button>
              </div>
              
              <div className="mt-2 text-left">
                {/* Visual Progress Bar */}
                <div className="h-1.5 w-full bg-cat-surface0 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-cat-green rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                
                {/* Values Label */}
                <div className="flex justify-between items-center mt-1.5 font-mono text-[8px] font-black">
                  <span className="text-cat-green">{formatCurrency(activePnl > 0 ? activePnl : 0, currentCurrency)}</span>
                  <span className="text-cat-subtext">/ {formatCurrency(activeGoal, currentCurrency)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- RENDER VIEW CONTENT --- */}
      <AnimatePresence mode="wait">
        {/* --- WEEK VIEW RENDER --- */}
        {viewMode === 'week' && (
          <motion.div
            key="week-view"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {weekDays.map(({ date, dateStr, dayName, dayNum }) => {
                const { pnl, count } = getDayTradesAndPnl(dateStr);
                const isSelected = selectedCalendarDay === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => {
                      if (count > 0) {
                        setSelectedCalendarDay(isSelected ? null : dateStr);
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all flex flex-col justify-between relative cursor-pointer ${
                      isSelected
                        ? 'border-cat-lavender bg-cat-lavender/10 shadow-lg'
                        : count > 0
                        ? pnl >= 0.01
                          ? 'border-cat-green bg-[#16a34a]/10 text-cat-green hover:bg-[#16a34a]/20'
                          : 'border-cat-red bg-[#dc2626]/10 text-cat-red hover:bg-[#dc2626]/20'
                        : 'border-transparent bg-cat-mantle/40 text-cat-text/30 hover:border-cat-surface0'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 opacity-60" />
                        <span className="text-2xs font-extrabold uppercase tracking-wider">{dayName}, {dayNum}</span>
                      </div>
                      
                      {count > 0 ? (
                        <span className="text-[9px] font-black bg-cat-base/80 px-2 py-0.5 rounded-md text-cat-text border border-cat-surface0">
                          {count} {count === 1 ? 'trade' : 'trades'}
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold opacity-30">—</span>
                      )}
                    </div>

                    {count > 0 && (
                      <div className="mt-2.5 text-right">
                        <span className="text-xs font-mono font-black block">
                          {pnl >= 0.01 ? '+' : ''}{formatCurrency(pnl, currentCurrency)}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* --- MONTH VIEW RENDER --- */}
        {viewMode === 'month' && (
          <motion.div
            key="month-view"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-4"
          >
            {/* Calendar Grid Container */}
            <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 brut-shadow-sm">
              {/* Day headers */}
              <div className="grid grid-cols-5 gap-1.5 text-center font-black text-[8px] text-cat-text mb-3 tracking-widest uppercase">
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
              </div>

              {/* Grid Cells */}
              <div className="grid grid-cols-5 gap-1.5">
                {monthGridDays.map((day, idx) => {
                  if (!day.dayNum || !day.dateStr) {
                    return <div key={`empty-${idx}`} className="aspect-square bg-transparent rounded-xl" />;
                  }

                  const { pnl, count } = getDayTradesAndPnl(day.dateStr);
                  const isSelected = selectedCalendarDay === day.dateStr;

                  return (
                    <button
                      key={day.dateStr}
                      onClick={() => setSelectedCalendarDay(isSelected ? null : day.dateStr)}
                      className={`aspect-square rounded-xl flex flex-col justify-between p-2 relative transition-all border-2 cursor-pointer select-none ${
                        isSelected
                          ? 'border-cat-lavender bg-cat-lavender/10'
                          : count > 0
                          ? pnl >= 0.01
                            ? 'border-cat-green bg-cat-green/10 text-cat-green hover:bg-cat-green/20'
                            : 'border-cat-red bg-cat-red/10 text-cat-red hover:bg-cat-red/20'
                          : 'border-transparent bg-cat-mantle/50 text-cat-subtext/40 hover:border-cat-surface0/60'
                      }`}
                    >
                      {/* Day Number and Mini Indicator */}
                      <div className="flex items-center gap-0.5 justify-start">
                        {count > 0 && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 animate-pulse" />}
                        <span className={`text-[9px] font-black ${isSelected ? 'text-cat-lavender font-extrabold' : ''}`}>
                          {day.dayNum}
                        </span>
                      </div>

                      {/* Display P&L or dash separator */}
                      <div className="w-full text-center">
                        {count > 0 ? (
                          <span className="text-[8px] font-mono font-black tracking-tighter block leading-none truncate">
                            {pnl >= 0.01 ? '+' : ''}{formatNumberAbbreviated(pnl, currentCurrency, false)}
                          </span>
                        ) : (
                          <span className="text-[8px] opacity-10 block leading-none font-black">—</span>
                        )}
                      </div>

                      {/* Small counter label */}
                      <div className="w-full text-right leading-none h-1 flex justify-end">
                        {count > 0 && (
                          <span className="text-[7px] font-black opacity-70 leading-none">
                            {count}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* --- YEAR VIEW RENDER --- */}
        {viewMode === 'year' && (
          <motion.div
            key="year-view"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-3"
          >
            {monthNamesEn.map((mName, mIdx) => {
              // Calculate P&L for this specific month of the selected year
              const mStr = `${selectedYear}-${(mIdx + 1) < 10 ? '0' + (mIdx + 1) : (mIdx + 1)}`;
              const monthTrades = activeAccountTrades.filter(t => t.entryDate.substring(0, 7) === mStr);
              const monthPnl = monthTrades.reduce((sum, t) => sum + t.pnl, 0);

              return (
                <div
                  key={mIdx}
                  onClick={() => {
                    setCalendarDate(new Date(selectedYear, mIdx, 1));
                    setViewMode('month');
                  }}
                  className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-3 flex flex-col justify-between hover:border-cat-lavender hover:bg-cat-mantle/90 transition-all cursor-pointer group brut-shadow-sm"
                >
                  <span className="text-[10px] font-black text-cat-text group-hover:text-cat-lavender transition uppercase tracking-wider text-center">
                    {mName}
                  </span>
                  
                  {renderMonthContributionGrid(mIdx)}

                  <div className="text-center mt-2.5 font-mono text-[9px] font-black block leading-none select-none">
                    <span className={monthPnl >= 0.01 ? 'text-cat-green' : monthPnl <= -0.01 ? 'text-cat-red' : 'text-cat-subtext/40'}>
                      {monthPnl >= 0.01 ? '+' : ''}{formatCurrency(monthPnl, currentCurrency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* --- ALL TIME VIEW RENDER --- */}
        {viewMode === 'all' && (
          <motion.div
            key="all-view"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="space-y-3.5"
          >
            {/* List years dynamically based on trades */}
            <div className="grid grid-cols-1 gap-2.5">
              {(() => {
                const years = Array.from(new Set(activeAccountTrades.map(t => new Date(t.entryDate).getFullYear())));
                if (years.length === 0) {
                  years.push(new Date().getFullYear());
                }
                years.sort((a, b) => b - a);

                return years.map(y => {
                  const yearTrades = activeAccountTrades.filter(t => new Date(t.entryDate).getFullYear() === y);
                  const yearPnl = yearTrades.reduce((sum, t) => sum + t.pnl, 0);
                  const yearWinRate = yearTrades.length > 0 
                    ? (yearTrades.filter(t => t.pnl >= 0.01).length / yearTrades.length) * 100 
                    : 0;

                  return (
                    <div
                      key={y}
                      onClick={() => {
                        setSelectedYear(y);
                        setViewMode('year');
                      }}
                      className="bg-cat-mantle border-2 border-cat-surface0 p-4 rounded-2xl flex items-center justify-between hover:border-cat-green transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-cat-base border border-cat-surface0 text-cat-green shadow-inner">
                          <Award className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-0.5">
                           <h4 className="text-xs font-black text-cat-text font-mono">Year {y}</h4>
                           <span className="text-[9px] text-cat-subtext font-bold uppercase tracking-wider block">
                            {yearTrades.length} positions • WR {yearWinRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <strong className={`font-mono text-xs font-black ${yearPnl >= 0.01 ? 'text-cat-green' : yearPnl <= -0.01 ? 'text-cat-red' : 'text-cat-subtext'}`}>
                        {yearPnl >= 0.01 ? '+' : ''}{formatCurrency(yearPnl, currentCurrency)}
                      </strong>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- DETAILED SLIDE-UP LIST OF SELECTED DAY'S TRADES --- */}
      {(viewMode === 'month' || viewMode === 'week') && (
        <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 select-none brut-shadow-sm">
          <h4 className="text-2xs font-extrabold text-cat-text mb-3 uppercase tracking-wider block">
            📝 Trades List:{' '}
            <span className="text-cat-lavender font-extrabold font-mono text-[9px]">
              {selectedCalendarDay ? selectedCalendarDay.split('-').reverse().join('/') : '(Select Date)'}
            </span>
          </h4>

          {!selectedCalendarDay ? (
            <p className="text-[10px] text-cat-subtext font-bold leading-relaxed italic py-4 text-center">
              Select any trade date above to print individual positions below.
            </p>
          ) : selectedTradesList.length === 0 ? (
            <p className="text-[10px] text-cat-subtext font-bold leading-relaxed italic py-4 text-center">
              No positions registered today.
            </p>
          ) : (
            <div className="space-y-2.5">
              {/* Daily total header card */}
              <div className="flex justify-between items-center text-[10px] bg-cat-base p-2.5 rounded-xl border-2 border-cat-surface0 mb-1 select-none">
                <span className="font-black text-[9px] text-cat-subtext uppercase tracking-widest">NET RESULT</span>
                <strong className={`font-mono text-xs font-black ${
                  selectedTradesList.reduce((sum, t) => sum + t.pnl, 0) >= 0 ? 'text-cat-green' : 'text-cat-red'
                }`}>
                  {selectedTradesList.reduce((sum, t) => sum + t.pnl, 0) >= 0 ? '+' : ''}
                  {formatCurrency(selectedTradesList.reduce((sum, t) => sum + t.pnl, 0), currentCurrency)}
                </strong>
              </div>

              {/* Day's Trades list */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {selectedTradesList.map(trade => (
                  <div
                    key={trade.id}
                    className="bg-cat-base border border-cat-surface0 rounded-xl p-3 flex justify-between items-center hover:bg-cat-surface0/10 transition-all select-none"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded leading-none ${
                          trade.action === 'BUY' ? 'bg-[#16a34a]/15 text-cat-green' : 'bg-[#dc2626]/15 text-cat-red'
                        }`}>
                          {trade.action}
                        </span>
                        <span className="font-extrabold text-2xs text-cat-text font-mono">{trade.pair}</span>
                        <span className="text-[8px] text-cat-subtext font-mono">({trade.lotSize.toFixed(2)} lot)</span>
                      </div>
                    </div>
                    <strong className={`font-mono text-2xs font-black shrink-0 ${trade.pnl >= 0 ? 'text-cat-green' : 'text-cat-red'}`}>
                      {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl, currentCurrency)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- INTEGRATED SESSION INSIGHTS TOGGLE --- */}
      {viewMode === 'all' && (
        <div className="bg-cat-mantle border-2 border-cat-surface0 rounded-2xl p-4 brut-shadow-sm">
          <div className="mb-3.5 select-none">
            <h3 className="text-2xs font-extrabold text-cat-text uppercase tracking-widest flex items-center gap-1.5">
              <BarChart2 className="h-4 w-4 text-cat-lavender" />
              🕒 Session Performance Metrics (All-time)
            </h3>
            <p className="text-[9px] text-cat-subtext font-bold mt-1">Which session operates best for you</p>
          </div>

          {activeAccountTrades.length === 0 ? (
            <div className="h-[90px] flex items-center justify-center text-cat-subtext text-[10px] italic font-semibold">
              No session statistics generated yet.
            </div>
          ) : (
            <div className="space-y-2 select-none">
              {(() => {
                const sessionMap: Record<string, { count: number; won: number; pnl: number }> = {
                  'Asian': { count: 0, won: 0, pnl: 0 },
                  'London': { count: 0, won: 0, pnl: 0 },
                  'New York': { count: 0, won: 0, pnl: 0 },
                  'Other': { count: 0, won: 0, pnl: 0 }
                };

                activeAccountTrades.forEach(t => {
                  const s = t.session || 'Other';
                  if (!sessionMap[s]) {
                    sessionMap[s] = { count: 0, won: 0, pnl: 0 };
                  }
                  sessionMap[s].count += 1;
                  sessionMap[s].pnl += t.pnl;
                  if (t.pnl > 0.01) {
                    sessionMap[s].won += 1;
                  }
                });

                return Object.entries(sessionMap)
                  .map(([session, data]) => ({
                    session,
                    tradeCount: data.count,
                    pnl: data.pnl,
                    winRate: data.count > 0 ? (data.won / data.count) * 100 : 0
                  }))
                  .filter(s => s.tradeCount > 0 || s.session !== 'Other')
                  .map((item, idx) => {
                    const isProfit = item.pnl >= 0.01;
                    const hasTrades = item.tradeCount > 0;

                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                          !hasTrades
                            ? 'border-cat-surface0/30 bg-cat-base/20'
                            : isProfit
                            ? 'border-[#16a34a]/30 bg-[#16a34a]/5'
                            : 'border-[#dc2626]/30 bg-[#dc2626]/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs">
                            {item.session === 'Asian' ? '🇯🇵' : item.session === 'London' ? '🇬🇧' : item.session === 'New York' ? '🇺🇸' : '🌍'}
                          </span>
                          <div>
                            <h4 className="text-2xs font-extrabold text-cat-text">{item.session} Session</h4>
                            <span className="text-[8px] text-cat-subtext font-bold uppercase tracking-wider block mt-0.5">
                              {item.tradeCount} position{item.tradeCount !== 1 ? 's' : ''} opened
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className={`font-mono text-2xs font-black block leading-none ${
                            !hasTrades ? 'text-cat-subtext' : isProfit ? 'text-cat-green' : 'text-cat-red'
                          }`}>
                            {hasTrades ? (isProfit ? '+' : '') : ''}
                            {formatCurrency(item.pnl, currentCurrency)}
                          </span>
                          {hasTrades && (
                            <span className="text-[8px] text-cat-subtext font-mono font-bold block mt-1">
                              Win Rate: {item.winRate.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
