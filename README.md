# Timezone Calendar

A quick timezone conversion tool with an interactive calendar interface. Select time slots by dragging on a week view calendar, then instantly see that time converted across multiple timezones.

![Timezone Calendar](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

- **Interactive Week View** - Calendar displays a full week with hourly time slots (6 AM - 11 PM)
- **Drag to Select** - Click and drag to select a time block on any day
- **Multi-Timezone Display** - See your selected time converted to 30+ cities worldwide
- **Responsive Design** - Adapts to any screen size:
  - Mobile: Single day view
  - Tablet: 3-day view
  - Desktop: Full 7-day week view
- **Touch Support** - Works on mobile devices with touch gestures
- **Persistent Preferences** - Your timezone selections are saved to localStorage
- **Current Time Indicator** - Red line shows the current time on today's column

## Getting Started

### Prerequisites

- Node.js 20+ (use `nvm use` to switch)

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd timezone-calendar

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage

1. **Select a time slot** - Click and drag on the calendar to select a time range
2. **View conversions** - A popup appears showing the time in multiple timezones
3. **Customize timezones** - Search and add/remove cities from the list
4. **Copy times** - Click "Copy All" to copy all timezone conversions to clipboard

## Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router
- **Language**: TypeScript
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) v4
- **Date Handling**: [date-fns](https://date-fns.org/) & [date-fns-tz](https://github.com/marnusw/date-fns-tz)

## Project Structure

```
src/
  app/
    page.tsx           # Main page
    layout.tsx         # Root layout
    globals.css        # Global styles
  components/
    WeekCalendar.tsx   # Calendar with drag-to-select
    TimezonePopup.tsx  # Timezone conversion modal
```

## Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Supported Timezones

30 cities across 4 regions:

- **Americas**: New York, Chicago, Denver, Los Angeles, Toronto, Vancouver, Mexico City, São Paulo
- **Europe**: London, Paris, Berlin, Amsterdam, Madrid, Rome, Moscow
- **Asia**: Tokyo, Shanghai, Hong Kong, Singapore, Seoul, Dubai, Mumbai, Bangkok, Jakarta, Manila, Taipei
- **Oceania**: Sydney, Melbourne, Auckland

## License

MIT
