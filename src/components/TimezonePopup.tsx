'use client';

import { useState, useEffect } from 'react';
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
}

const COMMON_TIMEZONES: TimezoneOption[] = [
  { id: 'America/New_York', label: 'EST/EDT', city: 'New York' },
  { id: 'America/Chicago', label: 'CST/CDT', city: 'Chicago' },
  { id: 'America/Denver', label: 'MST/MDT', city: 'Denver' },
  { id: 'America/Los_Angeles', label: 'PST/PDT', city: 'Los Angeles' },
  { id: 'America/Toronto', label: 'EST/EDT', city: 'Toronto' },
  { id: 'America/Vancouver', label: 'PST/PDT', city: 'Vancouver' },
  { id: 'Europe/London', label: 'GMT/BST', city: 'London' },
  { id: 'Europe/Paris', label: 'CET/CEST', city: 'Paris' },
  { id: 'Europe/Berlin', label: 'CET/CEST', city: 'Berlin' },
  { id: 'Asia/Tokyo', label: 'JST', city: 'Tokyo' },
  { id: 'Asia/Shanghai', label: 'CST', city: 'Shanghai' },
  { id: 'Asia/Singapore', label: 'SGT', city: 'Singapore' },
  { id: 'Asia/Dubai', label: 'GST', city: 'Dubai' },
  { id: 'Asia/Kolkata', label: 'IST', city: 'Mumbai' },
  { id: 'Australia/Sydney', label: 'AEST/AEDT', city: 'Sydney' },
  { id: 'Pacific/Auckland', label: 'NZST/NZDT', city: 'Auckland' },
];

export default function TimezonePopup({
  startTime,
  endTime,
  userTimezone,
  onClose,
}: TimezonePopupProps) {
  const [selectedTimezones, setSelectedTimezones] = useState<string[]>([
    'America/New_York',
    'America/Los_Angeles',
    'Europe/London',
    'Asia/Tokyo',
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const filteredTimezones = COMMON_TIMEZONES.filter(
    (tz) =>
      !selectedTimezones.includes(tz.id) &&
      (tz.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  const copyToClipboard = () => {
    const text = selectedTimezones
      .map((tz) => {
        const tzData = COMMON_TIMEZONES.find((t) => t.id === tz);
        const { start, end, date } = formatTimeRange(tz);
        return `${tzData?.city || tz}: ${date}, ${start} - ${end}`;
      })
      .join('\n');

    navigator.clipboard.writeText(text);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Time Zones</h2>
            <p className="text-sm text-gray-500">
              {format(startTime, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Your Time */}
        <div className="px-4 sm:px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-blue-600">Your Time ({userTimezone.split('/').pop()?.replace('_', ' ')})</div>
              <div className="text-2xl font-bold text-blue-900">
                {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
              </div>
            </div>
            <div className="text-sm text-blue-600">
              {formatInTimeZone(startTime, userTimezone, 'XXX')}
            </div>
          </div>
        </div>

        {/* Timezone List */}
        <div className="overflow-y-auto max-h-[40vh]">
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
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="relative">
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
              <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredTimezones.map((tz) => (
                  <button
                    key={tz.id}
                    onClick={() => addTimezone(tz.id)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span className="font-medium">{tz.city}</span>
                    <span className="text-sm text-gray-500">{tz.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row gap-2 sm:justify-end">
          <button
            onClick={copyToClipboard}
            className="w-full sm:w-auto px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy All
          </button>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
