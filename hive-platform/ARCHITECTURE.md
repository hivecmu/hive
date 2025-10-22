# Hive Platform - Architecture Documentation

## Overview

Hive is a modern SaaS application built with Next.js 14, TypeScript, and Tailwind CSS. It provides AI-powered workspace organization and centralized file management.

## Technology Decisions

### Framework: Next.js 14 (App Router)

**Why Next.js?**
- Server-side rendering for better SEO on marketing pages
- App Router for modern routing patterns with route groups
- Built-in API routes for backend functionality
- Excellent developer experience with hot reload
- TypeScript support out of the box

**Why App Router over Pages Router?**
- Better code organization with route groups
- Improved data fetching patterns
- Server Components support
- Simplified layouts and nested routes

### UI Libraries

**Marketing Pages: Framer Motion**
- Provides smooth, professional animations for landing pages
- Easy-to-use animation primitives
- Lightweight and performant
- Works well with React Server Components

**App Pages: shadcn/ui**
- Accessible components built on Radix UI
- Copy-paste component model (no package dependency)
- Full customization through Tailwind
- Production-ready with proper TypeScript support

### Styling: Tailwind CSS

**Why Tailwind?**
- Utility-first approach for rapid development
- Consistent design system through configuration
- Small bundle size with PurgeCSS
- Easy to customize with CSS variables

**Design System Implementation**:
- CSS variables for theme colors
- Custom accent color (#F5DAA7) integrated throughout
- Light and dark mode support via `next-themes`
- Inter font for lightweight, modern typography

## Project Structure

```
hive-platform/
├── app/
│   ├── (marketing)/        # Route group for public pages
│   │   ├── page.tsx        # Landing page
│   │   ├── login/          # Login page
│   │   ├── signup/         # Signup page
│   │   └── layout.tsx      # Marketing layout
│   ├── (app)/              # Route group for protected app
│   │   ├── page.tsx        # Dashboard
│   │   ├── wizard/         # AI Structure Wizard
│   │   ├── files/          # File Hub
│   │   ├── settings/       # Settings
│   │   └── layout.tsx      # App layout with sidebar
│   ├── globals.css         # Global styles and CSS variables
│   └── layout.tsx          # Root layout
├── components/
│   ├── marketing/          # Marketing-specific components
│   ├── app/                # App shell components
│   ├── features/           # Feature-specific components
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── api/                # API client utilities
│   ├── mocks/              # MSW mock data
│   └── hooks/              # Custom React hooks
└── middleware.ts           # Route protection logic
```

### Route Groups

We use Next.js route groups `()` to organize routes without affecting URLs:

- `(marketing)`: Public pages (landing, login, signup)
- `(app)`: Protected app pages (dashboard, wizard, files, settings)

This allows different layouts for marketing vs. app pages while keeping clean URLs.

## Authentication System

### Mock Authentication

**Implementation**:
- Client-side localStorage for user data
- HTTP-only cookie for middleware route protection
- No real backend required for demo

**Flow**:
1. User enters any email/password
2. Data stored in localStorage
3. Cookie set for middleware
4. Middleware protects `/app/*` routes
5. Redirects work automatically

**Why Mock Auth?**
- Simplifies demo deployment
- No database required
- Easy for users to test
- Real auth can be added later

### Middleware

```typescript
// middleware.ts
- Checks cookie for authentication
- Protects app routes
- Redirects unauthenticated users to /login
- Redirects authenticated users away from auth pages
```

## State Management

### Server State: React Query (Planned)

For API data fetching and caching:
- Automatic caching and refetching
- Optimistic updates
- Background updates
- Error handling

### Client State: React Context + useState

For UI state:
- Theme preference (next-themes)
- Sidebar open/closed state
- Form state (React Hook Form)

### URL State

For shareable state:
- Filters
- Search queries
- Pagination

## Design System

### Colors

**Primary Accent: #F5DAA7**
- Warm gold/beige tone
- Used for CTAs, highlights, and interactive elements
- Consistent across light and dark modes

**Neutral Palette**:
- Light mode: White backgrounds, gray text
- Dark mode: Near-black backgrounds, light gray text
- Subtle borders and cards

### Typography

**Font**: Inter
- Weights: 400 (regular), 500 (medium)
- No bold weight for cleaner appearance
- System font fallback

**Scale**:
- Headings: 3xl (30px) to 7xl (72px)
- Body: base (16px)
- Small text: sm (14px)

### Components

**shadcn/ui Components**:
- Button
- Card
- Input, Label, Select
- Dialog, Sheet, Dropdown Menu
- Sidebar, Tabs, Progress
- And more...

All components use Tailwind and CSS variables for theming.

## Routing and Navigation

### Marketing Routes (Public)

- `/` - Landing page
- `/login` - Login page
- `/signup` - Signup page

### App Routes (Protected)

- `/app` - Dashboard
- `/app/wizard` - AI Structure Wizard
- `/app/files` - File Hub
- `/app/settings` - Settings

### Navigation Components

**Marketing**: Simple navbar with logo and CTAs

**App**: Sidebar navigation with:
- Dashboard
- AI Wizard
- File Hub
- Settings
- Logout button

## Performance Considerations

### Code Splitting

- Route-based splitting via Next.js
- Dynamic imports for heavy components
- Lazy loading for non-critical features

### Image Optimization

- Next.js Image component for automatic optimization
- WebP format with fallbacks
- Lazy loading by default

### Bundle Size

- Minimal dependencies
- Tree-shaking with ES modules
- No heavy animation libraries on app pages

## Accessibility

### WCAG AA Compliance

- Color contrast ratios meet AA standards
- All interactive elements keyboard accessible
- Focus indicators visible
- Semantic HTML throughout

### Screen Reader Support

- ARIA labels where needed
- Proper heading hierarchy
- Alt text for images
- Form labels associated with inputs

### Keyboard Navigation

- Tab order follows visual flow
- Escape closes modals
- Arrow keys for dropdowns
- Enter submits forms

## Future Enhancements

### Short Term

1. Complete AI Structure Wizard flow
2. Build File Hub with all tabs
3. Implement MSW for API mocking
4. Add form validation with Zod
5. Create theme toggle component

### Medium Term

1. Real backend integration
2. Database for persistence
3. Real authentication with NextAuth
4. File upload functionality
5. Workspace collaboration features

### Long Term

1. AI integration for recommendations
2. Third-party integrations (Drive, Dropbox, etc.)
3. Team management and permissions
4. Analytics and reporting
5. Mobile apps

## Development Workflow

### Local Development

```bash
npm run dev    # Start development server
npm run build  # Build for production
npm run lint   # Run ESLint
```

### Code Organization

- One component per file
- Co-locate related files
- Feature-based organization
- Shared components in `/components/ui`

### Naming Conventions

- PascalCase for components
- camelCase for functions and variables
- kebab-case for files and folders
- UPPER_CASE for constants

## Deployment

### Vercel (Recommended)

- Zero-config deployment
- Automatic HTTPS
- Edge functions support
- Built-in analytics

### Other Platforms

- Compatible with any Node.js host
- Can be containerized with Docker
- Static export possible (with limitations)

## Security Considerations

### Current (Mock Auth)

- No real security (demo only)
- Client-side only
- No sensitive data handling

### Future (Real Auth)

- Use NextAuth.js or similar
- HTTP-only cookies
- CSRF protection
- Rate limiting on API routes
- Input validation and sanitization

## Testing Strategy (Planned)

### Unit Tests

- Vitest for component testing
- React Testing Library
- Mock service worker for API mocking

### Integration Tests

- Test critical user flows
- Auth flow (login → dashboard)
- Wizard completion
- File operations

### E2E Tests (Future)

- Playwright for full user journeys
- Test in multiple browsers
- Mobile responsive testing

## Conclusion

This architecture provides a solid foundation for a modern SaaS application. The tech stack is production-ready, the design system is flexible, and the code organization scales well as the app grows.

Key principles:
- **Modern**: Using latest Next.js features
- **Clean**: Minimal design with single accent color
- **Accessible**: WCAG AA compliant
- **Scalable**: Organized structure for growth
- **Performant**: Optimized bundle and rendering
