# Hive Platform

A modern workspace organization platform with AI-powered structure generation and centralized file management.

## Quick Start

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation & Running

```bash
# Navigate to project directory
cd hive-platform

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Authentication

This is a frontend demo with mocked backend:
- **Login/Signup**: Use any email and password
- Session persists for 24 hours in localStorage

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Icons**: Lucide React

## Key Features

- **Multi-Organization Support**: Switch between multiple organizations
- **AI Structure Wizard**: Generate optimized workspace structures based on your needs
- **File Hub**: Centralized file management from multiple sources
- **Chat Interface**: Channels and direct messaging
- **Dark Mode**: Full dark/light theme support
- **Responsive**: Mobile-first design

## Project Structure

```
app/
├── (marketing)/          # Landing, login, signup pages
├── app/                  # Main app (dashboard, wizard, files, settings)
components/
├── features/            # Feature components (chat, wizard, file-hub, org)
├── ui/                  # shadcn/ui components
├── marketing/           # Marketing components
contexts/                # React contexts
lib/                     # Utilities, templates, mock DB
types/                   # TypeScript types
```

## Available Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

## Design System

- **Accent Color**: `#F5DAA7` (warm gold/beige)
- **Font**: Inter (400, 500 weights)
- **Border Radius**: 10px
- **Theme**: Light and dark mode with system preference detection

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
