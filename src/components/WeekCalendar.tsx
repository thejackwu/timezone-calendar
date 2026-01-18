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
  const [isLongPressActive, setIsLongPressActive] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

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

  // Auto-scroll to current time on mount
  useEffect(() => {
    if (calendarRef.current) {
      const currentHour = new Date().getHours();
      if (currentHour >= HOURS[0] && currentHour <= HOURS[HOURS.length - 1]) {
        // Scroll to show current hour with some buffer above
        const scrollPosition = (currentHour - HOURS[0]) * SLOT_HEIGHT - 50;
        calendarRef.current.scrollTop = Math.max(0, scrollPosition);
      }
    }
  }, []);

  // Prevent scroll when long-press selection is active
  // Must use native event listener with { passive: false } to allow preventDefault
  useEffect(() => {
    const container = calendarRef.current;
    if (!container) return;

    const handleTouchMoveNative = (e: TouchEvent) => {
      if (isLongPressActive) {
        e.preventDefault();
      }
    };

    container.addEventListener('touchmove', handleTouchMoveNative, { passive: false });
    return () => {
      container.removeEventListener('touchmove', handleTouchMoveNative);
    };
  }, [isLongPressActive]);

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
        // At start of week, go to previous week
        if (mobileStartIndex === 0) {
          setCurrentDate(addDays(currentDate, -7));
          setMobileStartIndex(viewMode === 'day' ? 6 : 4); // End of previous week
        } else {
          setMobileStartIndex(Math.max(0, mobileStartIndex - step));
        }
      }
    } else {
      if (viewMode === 'week') {
        setCurrentDate(addDays(currentDate, 7));
      } else {
        const maxIndex = 7 - step;
        // At end of week, go to next week
        if (mobileStartIndex >= maxIndex) {
          setCurrentDate(addDays(currentDate, 7));
          setMobileStartIndex(0); // Start of next week
        } else {
          setMobileStartIndex(Math.min(maxIndex, mobileStartIndex + step));
        }
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

    let hourIndex = Math.floor(relativeY / SLOT_HEIGHT);
    const minuteOffset = ((relativeY % SLOT_HEIGHT) / SLOT_HEIGHT) * 60;
    let minute = Math.round(minuteOffset / 15) * 15;

    // Handle minute overflow - when rounding pushes to 60, increment the hour
    if (minute >= 60) {
      minute = 0;
      hourIndex += 1;
    }

    if (hourIndex < 0 || hourIndex >= HOURS.length) return null;

    return {
      day: days[dayIndex],
      hour: HOURS[hourIndex],
      minute,
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

  // Touch handlers with long-press detection
  const LONG_PRESS_DURATION = 300; // ms
  const MOVE_THRESHOLD = 10; // pixels - if moved more than this, cancel long press

  const cancelLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent, dayIndex: number) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    // Start long-press timer
    longPressTimerRef.current = setTimeout(() => {
      setIsLongPressActive(true);
      startDrag(touch.clientY, dayIndex);
      // Vibrate if supported (haptic feedback)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, LONG_PRESS_DURATION);
  }, [startDrag]);

  const handleTouchMove = useCallback((e: React.TouchEvent, dayIndex: number) => {
    const touch = e.touches[0];

    // If long press hasn't activated yet, check if we've moved too much
    if (!isLongPressActive && touchStartPosRef.current) {
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
        cancelLongPress();
        return;
      }
    }

    // If long press is active, update the drag selection
    // (scroll prevention is handled by native event listener with { passive: false })
    if (isLongPressActive) {
      updateDrag(touch.clientY, dayIndex);
    }
  }, [isLongPressActive, updateDrag, cancelLongPress]);

  const handleTouchEnd = useCallback(() => {
    cancelLongPress();
    if (isLongPressActive) {
      endDrag();
      setIsLongPressActive(false);
    }
  }, [isLongPressActive, endDrag, cancelLongPress]);

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
                className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-lg"
              >
                Today
              </button>
              <button
                onClick={() => navigateDays('next')}
                className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg"
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

            <button
              onClick={() => setShowAbout(true)}
              className="p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg text-gray-500"
              aria-label="About"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile instruction */}
        <p className="sm:hidden text-xs text-gray-400 mt-2">
          Hold on the calendar to select a time slot
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
        className={`flex-1 overflow-auto relative ${isLongPressActive ? 'touch-none' : 'touch-pan-y'}`}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
                  className="border-b border-gray-100 hover:bg-gray-50 active:bg-blue-50 cursor-pointer transition-colors"
                  style={{ height: SLOT_HEIGHT }}
                />
              ))}

              {/* Selection overlay */}
              {selection && isSameDay(day, selection.startTime) && (
                <div
                  className={`absolute left-0.5 right-0.5 sm:left-1 sm:right-1 bg-blue-500 bg-opacity-30 border-l-4 border-blue-600 rounded pointer-events-none ${isLongPressActive ? 'ring-2 ring-blue-400 ring-opacity-50' : ''}`}
                  style={getSelectionStyle(day) || undefined}
                >
                  <div className="p-1 text-xs text-blue-800 font-medium truncate">
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

      {/* About Modal */}
      {showAbout && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-gray-900 mb-3">About</h2>
            <p className="text-gray-600 mb-4">
              Select a time slot on the calendar to instantly see it converted across multiple timezones. Perfect for scheduling meetings with people around the world.
            </p>
            <a
              href="https://github.com/thejackwu/timezone-calendar"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              Open source on GitHub
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
