# Hive - AI-Powered Workspace Platform

A modern, production-ready SaaS application for AI-powered workspace organization and intelligent file management.

## Features

- **AI Structure Generation**: Automatically generate optimized workspace structures
- **Centralized File Hub**: Consolidate and manage files from multiple sources
- **Modern UI**: Built with Next.js 14, React 18, and Tailwind CSS
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark Mode**: Full dark mode support with system preference detection
- **Authentication**: Mock authentication system for demo purposes

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion
- **Forms**: React Hook Form + Zod
- **State Management**: React Query
- **Icons**: Lucide React

## Design System

- **Accent Color**: #F5DAA7 (warm gold/beige)
- **Typography**: Inter font (400, 500 weights)
- **Theme**: Light and dark mode support
- **Radius**: 10px (0.625rem)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Navigate to the project directory:
```bash
cd hive-platform
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open the URL shown in the terminal (typically [http://localhost:3000](http://localhost:3000)) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Authentication (Demo)

This is a demo application with mock authentication:

- **Login**: Use any email and password combination
- **Signup**: Use any name, email, and password
- Session persists in localStorage and cookies for 24 hours

## Project Structure

```
app/
├── (marketing)/          # Public marketing pages
│   ├── page.tsx         # Landing page
│   ├── login/           # Login page
│   └── signup/          # Signup page
├── (app)/               # Protected app routes (dashboard, wizard, files, settings)
components/
├── marketing/           # Marketing components (hero, features, navbar, footer)
├── app/                 # App shell components
├── features/            # Feature-specific components
└── ui/                  # shadcn/ui components
lib/
├── api/                 # API client
├── mocks/               # MSW mocks
└── hooks/               # Custom hooks
```

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

## Design Philosophy

- **Modern & Clean**: Minimal design with lots of whitespace
- **Lightweight**: Inter font at 400/500 weights only
- **Single Accent**: #F5DAA7 used sparingly for CTAs and highlights
- **Accessible**: WCAG AA compliant
- **Responsive**: Mobile-first approach

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT License

## Built With

- [Next.js](https://nextjs.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
- [Framer Motion](https://www.framer.com/motion/)
- [Tailwind CSS](https://tailwindcss.com/)
