# RSG CALL

Production crew management system for film & TV sets. Real-time timecards, OT tracking, meal penalties, and payroll export.

## Features

- **Live Dashboard**: Crew confirmations, real-time alerts, and lunch tracking
- **Timecards**: Automatic OT calculation (8hr threshold), meal penalty tracking (6hr rule), approval workflow
- **Multi-view System**: Separate coordinator and crew interfaces
- **Payroll Export**: Formatted timecard reports ready for payroll processing
- **Department Management**: Custom department setup with call times

## Tech Stack

- **Frontend**: React 18 + Vite
- **Database**: Supabase (PostgreSQL)
- **Styling**: Inline CSS with dark mode theme
- **Build**: Vite for fast development and optimized production builds

## Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Sonnyflem1/RSGCALL-.git
cd RSGCALL-
```

2. Install dependencies:
```bash
npm install
```

3. Start development server:
```bash
npm run dev
```

The app will open at `http://localhost:3000`

### Build for Production

```bash
npm run build
npm run preview
```

## Database Schema

The app connects to Supabase with these core tables:

- `shoot_days` - Production/shoot day records
- `crew_members` - Cast and crew with timecards
- `departments` - Department setup and call times
- `alerts` - Real-time production notifications

## Environment Variables

Create a `.env.local` file (not included in repo for security):

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

Currently, keys are embedded in `src/App.jsx` for demo purposes. For production, migrate to environment variables.

## Usage

### Create a New Shoot Day
1. Click **+ NEW SHOOT DAY** 
2. Fill 5-step onboarding: Project → Location → Departments → Crew → Review
3. System creates production record in Supabase

### Live Dashboard
- **Crew Tab**: Confirm crew presence, mark wrap times
- **Alerts Tab**: Send department-specific updates
- **Lunch Tab**: Track lunch in/out times to prevent meal penalties

### Timecards
- Enter call, wrap, and lunch times for each crew member
- View automatic calculations: straight time, OT, lunch duration
- Approve timecards before payroll export
- Export formatted report with totals

## Key Calculations

- **Straight Time**: Up to 8 hours (480 min)
- **Overtime**: Hours beyond 8hr threshold
- **Meal Penalty**: Triggered if no lunch recorded and worked >6hr, or if lunch break delayed beyond 6hr from call time

## Color Scheme

- **Primary Accent**: #FF6B35 (Orange)
- **Success**: #00FF87 (Green)
- **Warning**: #FFD700 (Gold)
- **Background**: #0A0A0F (Dark)
- **Card**: #1E1E2E (Charcoal)

## File Structure

```
RSGCALL-/
├── src/
│   ├── App.jsx          # Main application component
│   └── main.jsx         # React DOM entry
├── index.html           # HTML template
├── vite.config.js       # Vite configuration
├── package.json         # Dependencies & scripts
└── README.md            # Documentation
```

## Development

### Running Tests
```bash
npm run lint
```

### Code Style
Uses ESLint with React plugin. Format with:
```bash
npm run lint -- --fix
```

## Security Notes

⚠️ **Supabase API key is currently hardcoded** for demo purposes. Before production:
1. Move keys to `.env.local`
2. Implement Row-Level Security (RLS) policies
3. Use authentication tokens
4. Never commit secrets to git

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues or questions, please open a GitHub issue on the repository.

---

**Built for production workflows** 🎬
