'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

interface TimezonePopupProps {
  startTime: Date;
  endTime: Date;
  userTimezone: string;
  onClose: () => void;
}

interface TimezoneOption {
  id: string;
  label: string;
  city: string;
  country: string;
}

const COMMON_TIMEZONES: TimezoneOption[] = [
  // Americas
  { id: 'America/New_York', label: 'EST/EDT', city: 'New York', country: 'USA' },
  { id: 'America/Chicago', label: 'CST/CDT', city: 'Chicago', country: 'USA' },
  { id: 'America/Denver', label: 'MST/MDT', city: 'Denver', country: 'USA' },
  { id: 'America/Los_Angeles', label: 'PST/PDT', city: 'Los Angeles', country: 'USA' },
  { id: 'America/Toronto', label: 'EST/EDT', city: 'Toronto', country: 'Canada' },
  { id: 'America/Vancouver', label: 'PST/PDT', city: 'Vancouver', country: 'Canada' },
  { id: 'America/Mexico_City', label: 'CST/CDT', city: 'Mexico City', country: 'Mexico' },
  { id: 'America/Sao_Paulo', label: 'BRT', city: 'São Paulo', country: 'Brazil' },
  // Europe
  { id: 'Europe/London', label: 'GMT/BST', city: 'London', country: 'UK' },
  { id: 'Europe/Paris', label: 'CET/CEST', city: 'Paris', country: 'France' },
  { id: 'Europe/Berlin', label: 'CET/CEST', city: 'Berlin', country: 'Germany' },
  { id: 'Europe/Amsterdam', label: 'CET/CEST', city: 'Amsterdam', country: 'Netherlands' },
  { id: 'Europe/Madrid', label: 'CET/CEST', city: 'Madrid', country: 'Spain' },
  { id: 'Europe/Rome', label: 'CET/CEST', city: 'Rome', country: 'Italy' },
  { id: 'Europe/Moscow', label: 'MSK', city: 'Moscow', country: 'Russia' },
  // Asia
  { id: 'Asia/Tokyo', label: 'JST', city: 'Tokyo', country: 'Japan' },
  { id: 'Asia/Shanghai', label: 'CST', city: 'Shanghai', country: 'China' },
  { id: 'Asia/Hong_Kong', label: 'HKT', city: 'Hong Kong', country: 'Hong Kong' },
  { id: 'Asia/Singapore', label: 'SGT', city: 'Singapore', country: 'Singapore' },
  { id: 'Asia/Seoul', label: 'KST', city: 'Seoul', country: 'South Korea' },
  { id: 'Asia/Dubai', label: 'GST', city: 'Dubai', country: 'UAE' },
  { id: 'Asia/Kolkata', label: 'IST', city: 'Mumbai', country: 'India' },
  { id: 'Asia/Bangkok', label: 'ICT', city: 'Bangkok', country: 'Thailand' },
  { id: 'Asia/Jakarta', label: 'WIB', city: 'Jakarta', country: 'Indonesia' },
  { id: 'Asia/Manila', label: 'PHT', city: 'Manila', country: 'Philippines' },
  { id: 'Asia/Taipei', label: 'CST', city: 'Taipei', country: 'Taiwan' },
  // Oceania
  { id: 'Australia/Sydney', label: 'AEST/AEDT', city: 'Sydney', country: 'Australia' },
  { id: 'Australia/Melbourne', label: 'AEST/AEDT', city: 'Melbourne', country: 'Australia' },
  { id: 'Pacific/Auckland', label: 'NZST/NZDT', city: 'Auckland', country: 'New Zealand' },
];

export default function TimezonePopup({
  startTime,
  endTime,
  userTimezone,
  onClose,
}: TimezonePopupProps) {
  const [selectedTimezones, setSelectedTimezones] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const STORAGE_KEY = 'timezone-calendar-selected-timezones';
  const DEFAULT_TIMEZONES = ['America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Tokyo'];

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSelectedTimezones(parsed);
          return;
        }
      } catch {
        // Invalid JSON, use defaults
      }
    }
    setSelectedTimezones(DEFAULT_TIMEZONES);
  }, []);

  // Save to localStorage when selection changes
  useEffect(() => {
    if (selectedTimezones.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedTimezones));
    }
  }, [selectedTimezones]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTimezones = COMMON_TIMEZONES.filter(
    (tz) =>
      !selectedTimezones.includes(tz.id) &&
      (tz.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tz.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tz.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tz.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const addTimezone = (tzId: string) => {
    setSelectedTimezones([...selectedTimezones, tzId]);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const removeTimezone = (tzId: string) => {
    setSelectedTimezones(selectedTimezones.filter((id) => id !== tzId));
  };

  const formatTimeRange = (timezone: string) => {
    const start = formatInTimeZone(startTime, timezone, 'h:mm a');
    const end = formatInTimeZone(endTime, timezone, 'h:mm a');
    const date = formatInTimeZone(startTime, timezone, 'EEE, MMM d');
    const offset = formatInTimeZone(startTime, timezone, 'XXX');
    return { start, end, date, offset };
  };

  const getDayDifference = (timezone: string): string => {
    const userDay = format(startTime, 'yyyy-MM-dd');
    const tzDay = formatInTimeZone(startTime, timezone, 'yyyy-MM-dd');

    if (tzDay > userDay) return '+1 day';
    if (tzDay < userDay) return '-1 day';
    return '';
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-blue-600 text-white flex items-center justify-between">
          <div>
            <div className="text-sm text-blue-100">
              {userTimezone.split('/').pop()?.replace('_', ' ')} · {format(startTime, 'EEE, MMM d')}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              {format(startTime, 'h:mm a')} – {format(endTime, 'h:mm a')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Timezone List */}
        <div className="overflow-y-auto max-h-[40vh] overscroll-contain">
          {selectedTimezones.map((tzId) => {
            const tzData = COMMON_TIMEZONES.find((t) => t.id === tzId);
            const { start, end, date, offset } = formatTimeRange(tzId);
            const dayDiff = getDayDifference(tzId);

            return (
              <div
                key={tzId}
                className="px-4 sm:px-6 py-3 border-b border-gray-100 hover:bg-gray-50 flex items-center justify-between group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 truncate">
                      {tzData?.city || tzId.split('/').pop()?.replace('_', ' ')}
                      {tzData?.country && <span className="text-gray-500 font-normal">, {tzData.country}</span>}
                    </span>
                    {dayDiff && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full whitespace-nowrap">
                        {dayDiff}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">{date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">
                      {start} - {end}
                    </div>
                    <div className="text-xs text-gray-400">{offset}</div>
                  </div>
                  <button
                    onClick={() => removeTimezone(tzId)}
                    className="p-2 sm:p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-gray-200 active:bg-gray-300 rounded transition-all"
                  >
                    <svg className="w-5 h-5 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Timezone */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 relative">
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              placeholder="Add timezone..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {showDropdown && filteredTimezones.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto overscroll-contain">
                {filteredTimezones.map((tz) => (
                  <button
                    key={tz.id}
                    onClick={() => addTimezone(tz.id)}
                    className="w-full px-4 py-3 sm:py-2 text-left hover:bg-gray-50 active:bg-gray-100 flex items-center justify-between"
                  >
                    <span>
                      <span className="font-medium">{tz.city}</span>
                      <span className="text-gray-500">, {tz.country}</span>
                    </span>
                    <span className="text-sm text-gray-500">{tz.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
