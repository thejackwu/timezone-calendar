'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  startOfWeek,
  addDays,
  format,
  setHours,
  setMinutes,
  isToday,
  isSameDay,
} from 'date-fns';
import TimezonePopup from './TimezonePopup';

interface TimeSelection {
  startTime: Date;
  endTime: Date;
}

const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM
const SLOT_HEIGHT = 48; // pixels per hour

export default function WeekCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selection, setSelection] = useState<TimeSelection | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: Date; hour: number; minute: number } | null>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [userTimezone, setUserTimezone] = useState('America/New_York');
  const [viewMode, setViewMode] = useState<'day' | '3day' | 'week'>('week');
  const [mobileStartIndex, setMobileStartIndex] = useState(0);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Set initial view mode based on screen size
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setViewMode('day');
      } else if (window.innerWidth < 1024) {
        setViewMode('3day');
      } else {
        setViewMode('week');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Set mobile start index to current day
  useEffect(() => {
    const today = new Date();
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const todayIndex = days.findIndex(d => isSameDay(d, today));
    if (todayIndex >= 0) {
      setMobileStartIndex(todayIndex);
    }
  }, [currentDate]);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const allDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Get visible days based on view mode
  const getVisibleDays = () => {
    switch (viewMode) {
      case 'day':
        return [allDays[mobileStartIndex]];
      case '3day':
        return allDays.slice(mobileStartIndex, Math.min(mobileStartIndex + 3, 7));
      default:
        return allDays;
    }
  };

  const days = getVisibleDays();

  const navigateDays = (direction: 'prev' | 'next') => {
    const step = viewMode === 'day' ? 1 : viewMode === '3day' ? 3 : 7;
    if (direction === 'prev') {
      if (viewMode === 'week') {
        setCurrentDate(addDays(currentDate, -7));
      } else {
        setMobileStartIndex(Math.max(0, mobileStartIndex - step));
      }
    } else {
      if (viewMode === 'week') {
        setCurrentDate(addDays(currentDate, 7));
      } else {
        setMobileStartIndex(Math.min(7 - step, mobileStartIndex + step));
      }
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    const today = new Date();
    const newWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    const newDays = Array.from({ length: 7 }, (_, i) => addDays(newWeekStart, i));
    const todayIndex = newDays.findIndex(d => isSameDay(d, today));
    if (todayIndex >= 0) {
      setMobileStartIndex(todayIndex);
    }
  };

  const getTimeFromPosition = useCallback((clientY: number, dayIndex: number): { day: Date; hour: number; minute: number } | null => {
    if (!calendarRef.current) return null;

    const rect = calendarRef.current.getBoundingClientRect();
    const scrollTop = calendarRef.current.scrollTop;
    const relativeY = clientY - rect.top + scrollTop;

    const hourIndex = Math.floor(relativeY / SLOT_HEIGHT);
    const minuteOffset = ((relativeY % SLOT_HEIGHT) / SLOT_HEIGHT) * 60;
    const minute = Math.round(minuteOffset / 15) * 15;

    if (hourIndex < 0 || hourIndex >= HOURS.length) return null;

    return {
      day: days[dayIndex],
      hour: HOURS[hourIndex],
      minute: minute >= 60 ? 0 : minute,
    };
  }, [days]);

  const startDrag = useCallback((clientY: number, dayIndex: number) => {
    const timeInfo = getTimeFromPosition(clientY, dayIndex);
    if (!timeInfo) return;

    setIsDragging(true);
    setDragStart(timeInfo);
    setShowPopup(false);

    const startTime = setMinutes(setHours(timeInfo.day, timeInfo.hour), timeInfo.minute);
    setSelection({
      startTime,
      endTime: startTime,
    });
  }, [getTimeFromPosition]);

  const updateDrag = useCallback((clientY: number, dayIndex: number) => {
    if (!isDragging || !dragStart) return;

    const timeInfo = getTimeFromPosition(clientY, dayIndex);
    if (!timeInfo || !isSameDay(timeInfo.day, dragStart.day)) return;

    const startTime = setMinutes(setHours(dragStart.day, dragStart.hour), dragStart.minute);
    const endTime = setMinutes(setHours(timeInfo.day, timeInfo.hour), timeInfo.minute);

    setSelection({
      startTime: startTime < endTime ? startTime : endTime,
      endTime: startTime < endTime ? endTime : startTime,
    });
  }, [isDragging, dragStart, getTimeFromPosition]);

  const endDrag = useCallback(() => {
    if (isDragging && selection && selection.startTime < selection.endTime) {
      setShowPopup(true);
    }
    setIsDragging(false);
    setDragStart(null);
  }, [isDragging, selection]);

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent, dayIndex: number) => {
    e.preventDefault();
    startDrag(e.clientY, dayIndex);
  }, [startDrag]);

  const handleMouseMove = useCallback((e: React.MouseEvent, dayIndex: number) => {
    updateDrag(e.clientY, dayIndex);
  }, [updateDrag]);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, dayIndex: number) => {
    const touch = e.touches[0];
    startDrag(touch.clientY, dayIndex);
  }, [startDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent, dayIndex: number) => {
    const touch = e.touches[0];
    updateDrag(touch.clientY, dayIndex);
  }, [updateDrag]);

  const getSelectionStyle = (day: Date) => {
    if (!selection || !isSameDay(day, selection.startTime)) return null;

    const startHour = selection.startTime.getHours();
    const startMinute = selection.startTime.getMinutes();
    const endHour = selection.endTime.getHours();
    const endMinute = selection.endTime.getMinutes();

    const startOffset = (startHour - HOURS[0]) * SLOT_HEIGHT + (startMinute / 60) * SLOT_HEIGHT;
    const endOffset = (endHour - HOURS[0]) * SLOT_HEIGHT + (endMinute / 60) * SLOT_HEIGHT;
    const height = Math.max(endOffset - startOffset, 12);

    return {
      top: `${startOffset}px`,
      height: `${height}px`,
    };
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelection(null);
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-3 sm:px-4 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy')}
              <span className="hidden sm:inline text-sm font-normal text-gray-500 ml-2">
                Week {format(currentDate, 'w')}
              </span>
            </h1>
            <div className="flex items-center gap-1 sm:hidden">
              <button
                onClick={() => navigateDays('prev')}
                disabled={viewMode !== 'week' && mobileStartIndex === 0}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="px-2 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                Today
              </button>
              <button
                onClick={() => navigateDays('next')}
                disabled={viewMode !== 'week' && mobileStartIndex >= 7 - (viewMode === 'day' ? 1 : 3)}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* Desktop navigation */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => navigateDays('prev')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Today
              </button>
              <button
                onClick={() => navigateDays('next')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <div className="text-xs sm:text-sm text-gray-500 truncate">
              <span className="hidden sm:inline">Your timezone: </span>
              {userTimezone.split('/').pop()?.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Mobile instruction */}
        <p className="sm:hidden text-xs text-gray-400 mt-2">
          Drag on the calendar to select a time slot
        </p>
      </div>

      {/* Day Headers */}
      <div className="flex border-b border-gray-200">
        <div className="w-12 sm:w-16 flex-shrink-0" />
        {days.map((day, i) => (
          <div
            key={i}
            className="flex-1 text-center py-2 border-l border-gray-200"
          >
            <div className="text-xs sm:text-sm text-gray-500">
              {viewMode === 'day' ? format(day, 'EEEE') : format(day, 'EEE')}
            </div>
            <div
              className={`text-base sm:text-lg font-medium ${
                isToday(day)
                  ? 'bg-blue-600 text-white rounded-full w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center mx-auto'
                  : 'text-gray-900'
              }`}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div
        ref={calendarRef}
        className="flex-1 overflow-auto relative touch-pan-y"
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchEnd={endDrag}
      >
        <div className="flex min-h-full">
          {/* Time Labels */}
          <div className="w-12 sm:w-16 flex-shrink-0 bg-white sticky left-0 z-10">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="text-right pr-1 sm:pr-2 text-[10px] sm:text-xs text-gray-500 relative"
                style={{ height: SLOT_HEIGHT }}
              >
                <span className="absolute -top-2 right-1 sm:right-2">
                  {format(setHours(new Date(), hour), 'h a')}
                </span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          {days.map((day, dayIndex) => (
            <div
              key={dayIndex}
              className="flex-1 border-l border-gray-200 relative min-w-0"
              onMouseDown={(e) => handleMouseDown(e, dayIndex)}
              onMouseMove={(e) => handleMouseMove(e, dayIndex)}
              onTouchStart={(e) => handleTouchStart(e, dayIndex)}
              onTouchMove={(e) => handleTouchMove(e, dayIndex)}
            >
              {/* Hour slots */}
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  style={{ height: SLOT_HEIGHT }}
                />
              ))}

              {/* Selection overlay */}
              {selection && isSameDay(day, selection.startTime) && (
                <div
                  className="absolute left-0.5 right-0.5 sm:left-1 sm:right-1 bg-blue-500 bg-opacity-30 border-l-4 border-blue-600 rounded pointer-events-none"
                  style={getSelectionStyle(day) || undefined}
                >
                  <div className="p-0.5 sm:p-1 text-[10px] sm:text-xs text-blue-800 font-medium truncate">
                    {format(selection.startTime, 'h:mm a')} - {format(selection.endTime, 'h:mm a')}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Current time indicator */}
        {days.some((day) => isToday(day)) && (
          <div
            className="absolute left-12 sm:left-16 right-0 flex items-center pointer-events-none z-20"
            style={{
              top: `${(new Date().getHours() - HOURS[0] + new Date().getMinutes() / 60) * SLOT_HEIGHT}px`,
            }}
          >
            <div className="w-2 h-2 bg-red-500 rounded-full -ml-1" />
            <div className="flex-1 h-0.5 bg-red-500" />
          </div>
        )}
      </div>

      {/* Timezone Popup */}
      {showPopup && selection && (
        <TimezonePopup
          startTime={selection.startTime}
          endTime={selection.endTime}
          userTimezone={userTimezone}
          onClose={closePopup}
        />
      )}
    </div>
  );
}
