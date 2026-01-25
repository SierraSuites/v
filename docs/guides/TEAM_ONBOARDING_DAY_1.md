# TEAM ONBOARDING - DAY 1 GUIDE

**Welcome to Sierra Suites!** 🎉
**Your first day as a Software Engineering Intern**

---

## WELCOME MESSAGE

Welcome to the Sierra Suites team! We're building a modern construction management platform that will revolutionize how construction companies manage their projects.

You're joining us at an exciting time - we're 6-8 weeks away from our MVP launch in August 2026. Your contributions will directly impact thousands of construction professionals.

This document will guide you through your first day and set you up for success.

---

## DAY 1 SCHEDULE

### Morning (9:00 AM - 12:00 PM)

**9:00 - 9:30 AM: Team Introduction**
- Meet the team (video call or in-person)
- Overview of Sierra Suites platform
- Your role and responsibilities
- Questions and answers

**9:30 - 11:00 AM: Development Environment Setup**
- Install required software (see below)
- Clone repository
- Set up local development environment
- Run the application locally
- Verify everything works

**11:00 AM - 12:00 PM: Codebase Tour**
- Project structure walkthrough
- Key modules overview
- Coding standards and conventions
- Git workflow
- Where to find help

### Afternoon (1:00 PM - 5:00 PM)

**1:00 - 2:00 PM: Documentation Review**
- Read through key documentation
- Review implementation master plan
- Understand current status
- Note questions

**2:00 - 3:30 PM: First Task Assignment**
- Receive your first task
- Set up your development branch
- Ask clarifying questions
- Start working

**3:30 - 4:30 PM: Hands-On Development**
- Work on first task
- Ask for help when stuck
- Commit your first code

**4:30 - 5:00 PM: Day 1 Wrap-Up**
- Daily standup
- Share progress
- Discuss blockers
- Plan for tomorrow

---

## REQUIRED SOFTWARE INSTALLATION

### 1. Code Editor: Visual Studio Code
**Download**: https://code.visualstudio.com/

**Required Extensions**:
- ES7+ React/Redux/React-Native snippets
- Tailwind CSS IntelliSense
- Prettier - Code formatter
- ESLint
- GitLens
- Thunder Client (API testing)

**Install Extensions**:
```
Ctrl/Cmd + Shift + X
Search for each extension and click Install
```

### 2. Node.js & npm
**Download**: https://nodejs.org/ (LTS version 18.x or higher)

**Verify Installation**:
```bash
node --version   # Should show v18.x.x or higher
npm --version    # Should show 9.x.x or higher
```

### 3. Git
**Download**: https://git-scm.com/

**Configure Git**:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 4. GitHub Account
- Create account at https://github.com (if you don't have one)
- Share your username with the team
- Accept repository invitation

### 5. Supabase Account
- Create account at https://supabase.com
- You'll receive invitation to join the project

### 6. Vercel Account (Optional)
- Create account at https://vercel.com
- Link with GitHub account

### 7. Communication Tools
- **Slack/Discord**: You'll receive invitation
- **Email**: Check inbox for invitations
- **Calendar**: Add team meetings to your calendar

---

## REPOSITORY SETUP

### 1. Clone the Repository

```bash
# Navigate to your projects folder
cd ~/Projects  # or wherever you keep code

# Clone the repository (replace with actual URL)
git clone https://github.com/sierrasuites/sierra-suites.git

# Navigate into the project
cd sierra-suites

# Install dependencies
npm install
```

### 2. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Open .env.local and add your credentials
# (You'll receive these from your team lead)
```

**Your .env.local should contain**:
```env
# Supabase (Development)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Resend (Email - Development)
RESEND_API_KEY=re_xxx
RESEND_FROM_EMAIL=dev@sierrasuites.com

# Stripe (Test Mode)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxx

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Start Development Server

```bash
npm run dev
```

**Expected Output**:
```
✓ Ready in 3.2s
○ Local:        http://localhost:3000
```

### 4. Open in Browser

Navigate to: http://localhost:3000

You should see the Sierra Suites login page.

### 5. Create Test Account

Click "Sign Up" and create a test account:
- Email: your.name+test@example.com
- Password: TestPassword123!

---

## PROJECT STRUCTURE OVERVIEW

```
sierra-suites/
│
├── app/                        # Next.js 16 App Router
│   ├── dashboard/             # Dashboard module
│   ├── projects/              # Projects management
│   ├── taskflow/              # Task management
│   ├── quotes/                # Quote generation
│   ├── crm/                   # CRM module
│   ├── fieldsnap/             # Photo documentation
│   ├── teams/                 # Team management
│   ├── api/                   # API routes
│   ├── login/                 # Authentication pages
│   ├── layout.tsx             # Root layout
│   └── page.tsx               # Home page
│
├── components/                 # React components
│   ├── ui/                    # Reusable UI components
│   ├── dashboard/             # Dashboard-specific components
│   ├── projects/              # Project-specific components
│   ├── quotes/                # Quote components
│   └── ...                    # Other feature components
│
├── lib/                       # Utility functions & services
│   ├── supabase/              # Supabase client setup
│   ├── permissions.ts         # Permission checking
│   ├── pagination.ts          # Pagination utilities
│   ├── pdf-generator.ts       # PDF generation
│   ├── email-service.ts       # Email sending
│   └── ...                    # Other utilities
│
├── types/                     # TypeScript type definitions
│   └── index.ts               # Shared types
│
├── hooks/                     # Custom React hooks
│   ├── usePermissions.ts      # Permission hook
│   └── ...                    # Other hooks
│
├── database/                  # Database schemas & migrations
│   └── master-schema.sql      # Complete database schema
│
├── __tests__/                 # Unit & integration tests
│   ├── auth/                  # Auth tests
│   ├── projects/              # Project tests
│   └── ...                    # Other test suites
│
├── e2e/                       # End-to-end tests (Playwright)
│   └── critical-flows.spec.ts
│
├── docs/                      # Documentation
│   ├── README.md              # Developer guide
│   ├── API.md                 # API documentation
│   └── ...                    # Other docs
│
├── public/                    # Static assets (images, etc.)
│
├── .env.local                 # Environment variables (not in git)
├── .env.example               # Example environment file
├── package.json               # Dependencies
├── tsconfig.json              # TypeScript config
├── tailwind.config.js         # Tailwind CSS config
└── next.config.js             # Next.js config
```

---

## KEY TECHNOLOGIES

### Frontend
- **Next.js 16** - React framework with App Router
- **React 18** - UI library
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication
  - Storage
  - Real-time subscriptions
- **Next.js API Routes** - Serverless functions

### Integrations
- **Stripe** - Payment processing
- **Resend** - Email sending
- **jsPDF** - PDF generation

### Development Tools
- **Jest** - Unit testing
- **Playwright** - E2E testing
- **ESLint** - Code linting
- **Prettier** - Code formatting

---

## CODING STANDARDS

### File Naming
- Components: `PascalCase.tsx` (e.g., `DashboardStats.tsx`)
- Utilities: `camelCase.ts` (e.g., `pdfGenerator.ts`)
- API routes: `route.ts` (Next.js convention)

### Component Structure
```typescript
'use client' // Only if client component

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// Props interface
interface ComponentProps {
  data: any
  onUpdate?: () => void
}

// Component
export default function ComponentName({ data, onUpdate }: ComponentProps) {
  const [state, setState] = useState<any>(null)

  // Event handlers
  const handleClick = async () => {
    // Implementation
  }

  // Render
  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* JSX */}
    </div>
  )
}
```

### TypeScript Guidelines
- Always use proper types (no `any` unless absolutely necessary)
- Create interfaces for complex objects
- Use type inference when possible
- Document complex types

### Code Style
- Use 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- Max line length: 100 characters
- Use arrow functions for components

### Commit Messages
Follow conventional commits format:
```
feat: add new feature
fix: resolve bug
docs: update documentation
style: formatting changes
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

Example:
```bash
git commit -m "feat: add budget tracking to projects

- Add budget overview cards
- Implement expense tracking
- Create expense form modal"
```

---

## GIT WORKFLOW

### Daily Workflow

1. **Pull Latest Changes**:
```bash
git checkout main
git pull origin main
```

2. **Create Feature Branch**:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

3. **Make Changes & Commit**:
```bash
git add .
git commit -m "feat: description of changes"
```

4. **Push to Remote**:
```bash
git push -u origin feature/your-feature-name
```

5. **Create Pull Request**:
- Go to GitHub repository
- Click "Pull Requests" tab
- Click "New Pull Request"
- Select your branch
- Add description
- Request review from team lead

### Branch Naming Convention
- Features: `feature/description`
- Bug fixes: `fix/bug-description`
- Improvements: `improve/what-you-improved`
- Documentation: `docs/what-you-documented`

### Before Submitting PR
- [ ] Code builds without errors: `npm run build`
- [ ] Tests pass: `npm test`
- [ ] Linter passes: `npm run lint`
- [ ] Code is formatted: Run Prettier
- [ ] No console.log statements left in code
- [ ] Added comments for complex logic
- [ ] Updated documentation if needed

---

## YOUR FIRST TASK OPTIONS

### Option 1: Fix a Small Bug (Recommended for Day 1)
**Task**: Fix TypeScript type errors in quote details page
**File**: `app/quotes/[id]/page.tsx`
**Goal**: Replace `as any` type casts with proper interfaces
**Estimated Time**: 2-3 hours
**Documentation**: See `CRITICAL_FIXES_PRIORITY_LIST.md` Week 2

### Option 2: Create a Small Component
**Task**: Create a reusable loading spinner component
**Location**: `components/ui/LoadingSpinner.tsx`
**Goal**: Replace inline loading text with proper spinner
**Estimated Time**: 2-3 hours

### Option 3: Write Tests
**Task**: Write unit tests for pagination utility
**File**: `__tests__/lib/pagination.test.ts`
**Goal**: Achieve 80%+ coverage for pagination.ts
**Estimated Time**: 3-4 hours
**Documentation**: See `ENTERPRISE_IMPLEMENTATION_PART_3.md` Section 16

### Option 4: Update Documentation
**Task**: Improve user guide with screenshots
**File**: `docs/USER_GUIDE.md`
**Goal**: Add step-by-step screenshots for creating a project
**Estimated Time**: 2-3 hours

**Your team lead will assign you the best first task based on your skills and interests.**

---

## GETTING HELP

### When You're Stuck

1. **Try to Debug First** (15-30 minutes)
   - Read error messages carefully
   - Check documentation
   - Search for similar issues online
   - Review code examples in the codebase

2. **Ask Your Team**
   - Post in Slack/Discord channel
   - Tag relevant team member
   - Provide context:
     - What you're trying to do
     - What you've tried
     - Error messages (screenshots help)
     - Relevant code snippet

3. **Schedule a Call**
   - For complex issues
   - Pair programming session
   - Code review

### Resources

- **Internal Documentation**: `docs/` folder
- **Quick Reference**: `QUICK_REFERENCE_COMMANDS.md`
- **Implementation Plan**: `ENTERPRISE_IMPLEMENTATION_MASTER_PLAN.md` (Parts 1-3)
- **Critical Fixes List**: `CRITICAL_FIXES_PRIORITY_LIST.md`

- **External Documentation**:
  - Next.js: https://nextjs.org/docs
  - React: https://react.dev
  - Supabase: https://supabase.com/docs
  - Tailwind: https://tailwindcss.com/docs

- **Team Channels**:
  - Slack: #dev-team (general discussion)
  - Slack: #help (when you're stuck)
  - Slack: #random (casual chat)

---

## EXPECTATIONS & GOALS

### Week 1 Goals
- ✅ Set up development environment
- ✅ Understand project structure
- ✅ Complete first task
- ✅ Submit first pull request
- ✅ Learn team workflow
- ✅ Ask lots of questions!

### Month 1 Goals
- Complete 5-10 tasks
- Write tests for your code
- Understand core modules
- Contribute to documentation
- Participate in code reviews
- Suggest improvements

### Communication
- **Daily Standups**: Every morning at 9:30 AM
  - What you did yesterday
  - What you're doing today
  - Any blockers

- **Weekly Team Meeting**: Fridays at 2:00 PM
  - Progress review
  - Upcoming work
  - Retrospective

- **1-on-1 with Lead**: Weekly (scheduled separately)
  - Career development
  - Feedback
  - Questions

### Work Hours
- **Core Hours**: 9:00 AM - 5:00 PM (your timezone)
- **Flexible**: We focus on output, not hours
- **Communicate**: If you need to step away, let the team know

---

## IMPORTANT NOTES

### What to Do
✅ Ask questions (there are no stupid questions!)
✅ Take breaks when stuck
✅ Communicate early and often
✅ Share your ideas
✅ Learn from mistakes
✅ Help others when you can
✅ Keep your branch updated
✅ Write clean, readable code
✅ Test your changes
✅ Document complex logic

### What NOT to Do
❌ Push directly to main branch
❌ Commit secrets or API keys
❌ Copy code without understanding it
❌ Skip testing your changes
❌ Struggle in silence for hours
❌ Make large PRs (keep them small)
❌ Leave console.log in production code
❌ Commit commented-out code
❌ Ignore linting errors
❌ Work on multiple features in one branch

---

## FIRST DAY CHECKLIST

### Setup
- [ ] Installed VS Code with required extensions
- [ ] Installed Node.js and verified version
- [ ] Installed Git and configured username/email
- [ ] Created GitHub account and accepted invite
- [ ] Cloned repository
- [ ] Installed dependencies (`npm install`)
- [ ] Created `.env.local` with credentials
- [ ] Started dev server successfully
- [ ] Opened app in browser
- [ ] Created test account

### Learning
- [ ] Read project README
- [ ] Reviewed project structure
- [ ] Explored codebase
- [ ] Read coding standards
- [ ] Understood Git workflow
- [ ] Bookmarked important documentation
- [ ] Joined communication channels

### First Contribution
- [ ] Received first task assignment
- [ ] Created feature branch
- [ ] Made first code changes
- [ ] Tested changes locally
- [ ] Committed with proper message
- [ ] Pushed to remote
- [ ] (Optional) Created PR if task complete

### Team
- [ ] Met all team members
- [ ] Added team meetings to calendar
- [ ] Know who to ask for help
- [ ] Introduced yourself in chat
- [ ] Shared your background/interests

---

## ENCOURAGEMENT

Starting a new role can feel overwhelming - that's completely normal! Remember:

- **Everyone starts as a beginner**. Even senior developers learn new things daily.
- **Questions are encouraged**. We'd rather you ask than struggle silently.
- **Mistakes are learning opportunities**. We have code review and testing to catch issues.
- **You were hired for a reason**. We believe in your potential.
- **Take your time**. Quality over speed, especially while learning.

Your contributions matter. The code you write will help construction companies build better, faster, and smarter.

Welcome to the team! Let's build something amazing together. 🚀

---

## NEXT STEPS

After completing this guide:

1. **Slack the team**: Introduce yourself and confirm you're all set up
2. **Ask your team lead**: "What should I work on first?"
3. **Start coding**: Make your first contribution
4. **End of day**: Share your progress in standup

**Questions about anything in this guide?**
Don't hesitate to ask! We're here to help you succeed.

---

**Welcome aboard!** 🎉

*Last updated: January 21, 2026*