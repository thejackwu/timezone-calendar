# Timezone Calendar

A timezone conversion tool with an interactive calendar interface. Select time slots by dragging on a week view calendar, then view the selected time converted across multiple timezones.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript (strict mode enabled)
- **Styling**: Tailwind CSS v4
- **Date Handling**: date-fns and date-fns-tz for timezone conversions
- **Runtime**: Node.js 20 (see `.nvmrc`)

## Commands

```bash
npm run dev      # Start development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Project Structure

```
src/
  app/
    page.tsx           # Main page - renders WeekCalendar
    layout.tsx         # Root layout with Geist fonts
    globals.css        # Global styles and Tailwind config
  components/
    WeekCalendar.tsx   # Main calendar component with drag-to-select
    TimezonePopup.tsx  # Modal showing time in multiple timezones
```

## Key Components

### WeekCalendar (`src/components/WeekCalendar.tsx`)

The main calendar component featuring:
- Week view with hourly time slots (6 AM - 11 PM)
- Drag-to-select functionality for creating time blocks
- Touch support for mobile devices
- Responsive breakpoints:
  - Mobile (<640px): Single day view
  - Tablet (640-1024px): 3-day view
  - Desktop (>1024px): Full 7-day week view
- Current time indicator (red line)
- Navigation controls for prev/next and "Today" button
- Auto-detects user's timezone via `Intl.DateTimeFormat`

### TimezonePopup (`src/components/TimezonePopup.tsx`)

Modal popup that displays:
- Selected time range in user's local timezone
- Converted times across multiple common timezones
- Day difference indicators (+1 day / -1 day)
- Search and add/remove timezone functionality
- Copy all times to clipboard feature
- Keyboard support (Escape to close)

## Development Notes

### Node Version
This project requires Node.js 20. Use nvm to switch:
```bash
nvm use
```

### Responsive Design Pattern
The calendar uses a responsive view mode system:
```typescript
if (window.innerWidth < 640) setViewMode('day');
else if (window.innerWidth < 1024) setViewMode('3day');
else setViewMode('week');
```

### Time Slot Constants
```typescript
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 6 AM to 11 PM
const SLOT_HEIGHT = 48; // pixels per hour
```

### Path Aliases
Uses `@/*` alias mapped to `./src/*` (configured in `tsconfig.json`).

### Styling Conventions
- Uses Tailwind CSS utility classes
- Responsive prefixes: `sm:` (640px+), no prefix for mobile-first
- Color scheme: Blue accent (`blue-500`, `blue-600`) for selections and CTAs
