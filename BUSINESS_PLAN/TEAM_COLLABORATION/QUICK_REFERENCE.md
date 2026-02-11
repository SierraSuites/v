# Git Quick Reference - Sierra Suites Team
**Print this and keep it at your desk!**

---

## Daily Workflow (5 Steps)

### Morning (Start of Day)
```bash
git checkout dev
git pull origin dev
git checkout -b feature/your-feature-name  # Or checkout existing branch
```

### During Work (Every 30-60 min)
```bash
git status              # Check what changed
git add .               # Stage all changes
git commit -m "feat: Description of what you did"
git push origin feature/your-feature-name
```

### End of Day
```bash
git status              # Make sure everything is committed
git push origin feature/your-feature-name
# Post update in Slack
```

---

## Essential Commands

### Check Status
```bash
git status              # What's changed?
git log --oneline -5    # Recent commits
git diff                # See changes
git branch              # What branch am I on?
```

### Create & Switch Branches
```bash
git checkout -b feature/new-feature    # Create and switch
git checkout dev                       # Switch to dev
git checkout -                         # Switch to previous branch
```

### Commit Changes
```bash
git add .                              # Stage all files
git add filename.ts                    # Stage specific file
git commit -m "feat: Your message"     # Commit
git push origin feature/your-branch    # Push to GitHub
```

### Update Your Branch
```bash
git checkout dev
git pull origin dev
git checkout feature/your-branch
git merge dev                          # Get latest changes
```

### Create Pull Request
```bash
# On GitHub website:
# 1. Go to repository
# 2. Click "Pull requests" → "New pull request"
# 3. Base: dev ← Compare: feature/your-branch
# 4. Fill out description
# 5. Request review from lead
```

---

## Commit Message Format

**Use these prefixes:**

```bash
git commit -m "feat: Add new invoice form"
git commit -m "fix: Resolve photo upload bug"
git commit -m "docs: Update README"
git commit -m "style: Format code with Prettier"
git commit -m "refactor: Simplify validation logic"
git commit -m "test: Add unit tests"
git commit -m "chore: Update dependencies"
```

**Good Examples:**
```bash
git commit -m "feat: Add invoice PDF export button"
git commit -m "fix: Resolve timeout on photo upload"
git commit -m "refactor: Extract validation to utils"
```

**Bad Examples (Don't do this!):**
```bash
git commit -m "stuff"
git commit -m "wip"
git commit -m "changes"
git commit -m "asdf"
```

---

## Handling Merge Conflicts

```bash
# When you see: CONFLICT (content): Merge conflict in file.ts

# 1. Open the file in VS Code
code src/app/page.tsx

# 2. Look for conflict markers:
<<<<<<< HEAD
Your code here
=======
Their code here
>>>>>>> dev

# 3. Choose which code to keep (or combine both)
# 4. Remove ALL conflict markers (<<<<<<<, =======, >>>>>>>)
# 5. Test that code works
npm run dev

# 6. Mark as resolved
git add src/app/page.tsx
git commit -m "merge: Resolve conflict in page.tsx"
git push
```

**In VS Code:**
- Click "Accept Current Change" (keep yours)
- Click "Accept Incoming Change" (keep theirs)
- Click "Accept Both Changes" (keep both, edit after)

---

## Emergency Commands

### Save Work Temporarily
```bash
git stash              # Save changes temporarily
git checkout dev
git pull origin dev
git checkout feature/your-branch
git stash pop          # Restore changes
```

### Undo Changes
```bash
git checkout -- filename.ts          # Undo changes to file (before commit)
git reset --soft HEAD~1              # Undo last commit (keep changes)
git reset --hard origin/dev          # Discard all local changes (dangerous!)
git merge --abort                    # Cancel a merge
```

### Find Lost Work
```bash
git reflog             # Show all commits (even deleted ones)
git checkout abc123    # Restore lost commit
```

### Fix Mistakes
```bash
# Committed to wrong branch:
git checkout -b feature/correct-branch    # Create branch from current state
git checkout wrong-branch
git reset --hard origin/wrong-branch

# Forgot to add files to commit:
git reset --soft HEAD~1
git add forgotten-file.ts
git commit -m "feat: Complete commit"

# Committed .env file by accident:
git rm --cached .env
git commit -m "chore: Remove .env from git"
# Then ROTATE ALL SECRETS!
```

---

## Before Pushing Checklist

- [ ] `git status` - Check what will be committed
- [ ] `npm run dev` - Test code works
- [ ] `npm run lint` - No linting errors
- [ ] `npm run build` - Code compiles
- [ ] Check browser console - No errors
- [ ] Commit message follows format
- [ ] `git push`

---

## Common Errors & Solutions

### "Permission denied (publickey)"
```bash
# Set up SSH key:
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# Add to GitHub: Settings → SSH Keys
```

### "Your branch is behind origin/dev"
```bash
git pull origin dev
```

### "Port 3000 already in use"
```bash
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

### "Module not found" after pull
```bash
npm install    # Teammate added new dependencies
```

---

## Communication Template

### Daily Standup (Post in Slack)
```
Daily Update - [Your Name] - [Date]

Yesterday:
- Completed [feature/task]
- Fixed [bug]

Today:
- Working on [feature/task]
- Files: [list files you'll modify]
- Target: [PR by EOD / Done by 2pm]

Blockers:
- None (or: [describe issue])
```

### Before Working on Shared File
```
In team chat:
"Working on [filename] today for [feature]. Let me know
if anyone else is touching this file."
```

### When Stuck (After 1 hour)
```
In team chat:
"Need help: [Brief description of issue]. Been stuck for
an hour. Can someone take a look?"
```

---

## Branch Strategy

```
main (PROTECTED - Production only)
  ↓
dev (Integration - All work merges here first)
  ↓
feature/your-feature-name (Your work)
```

**Branch naming:**
```bash
feature/invoice-creation
feature/photo-upload
feature/budget-calculator
hotfix/critical-bug
```

**NEVER commit directly to main!**

---

## Code Review Process

### Creating PR
1. Push your feature branch
2. Go to GitHub → Pull requests → New pull request
3. Base: `dev` ← Compare: `feature/your-branch`
4. Fill out description (what, why, how to test)
5. Request review from lead
6. Wait for approval

### Addressing Feedback
```bash
# Make requested changes
git add .
git commit -m "fix: Address PR feedback - add validation"
git push origin feature/your-branch
# PR automatically updates
```

### After Merge
```bash
git checkout dev
git pull origin dev
git branch -d feature/your-branch    # Delete local branch
```

---

## VS Code Integration

### Source Control Panel
- `Ctrl+Shift+G` (Windows) / `Cmd+Shift+G` (Mac)
- See changed files
- Stage files (click +)
- Type commit message
- Click ✓ to commit

### Resolve Conflicts
- Open conflicted file
- Click "Accept Current Change" or "Accept Incoming Change"
- Save file
- Stage and commit

### Install GitLens Extension
1. Extensions → Search "GitLens"
2. Install
3. See who wrote each line, when, and why

---

## What NOT to Commit

```gitignore
node_modules/       # Never commit (huge)
.env                # Never commit (secrets)
.env.local          # Never commit (secrets)
.env*.local         # Never commit (secrets)
.DS_Store           # Never commit (Mac files)
Thumbs.db           # Never commit (Windows files)
npm-debug.log       # Never commit (logs)
```

**If you accidentally commit secrets, tell lead IMMEDIATELY!**

---

## Team Assignments

**Intern 1 (Frontend):**
- Projects module UI
- Dashboard components
- Photo gallery

**Intern 2 (Backend):**
- Financial APIs
- QuoteHub APIs
- Database utilities

**Lead:**
- Code reviews
- Complex features
- Architecture

**Work on different files to avoid conflicts!**

---

## Important Rules

### DO:
- ✅ Pull before starting work every day
- ✅ Commit every 30-60 minutes
- ✅ Push regularly (backup your work)
- ✅ Test before pushing
- ✅ Write descriptive commit messages
- ✅ Ask for help when stuck (after 1 hour)
- ✅ Communicate with team

### DON'T:
- ❌ Commit directly to main
- ❌ Push without pulling first
- ❌ Commit node_modules or .env files
- ❌ Force push to shared branches
- ❌ Leave merge conflict markers in code
- ❌ Write vague commit messages ("stuff", "wip")
- ❌ Push broken code

---

## Who to Ask for Help

**Git Issues:**
- Merge conflicts → Lead
- Can't push/pull → Lead
- Lost work → Lead
- General questions → Team Slack #git-help

**Code Issues:**
- Bugs → Team Slack #dev-team
- Architecture questions → Lead
- "How do I..." questions → Team Slack #dev-team

**Stuck > 1 hour:** Ask for help!

**Emergency (broke production):** Call/DM lead immediately

---

## Useful Shortcuts

### Terminal
```bash
git st              # git status (set alias)
git co dev          # git checkout dev (set alias)
git br              # git branch (set alias)
git log --oneline --graph --all    # Pretty history
```

### VS Code
- `Ctrl+Shift+G` - Open Source Control
- `Ctrl+Enter` - Commit
- `Ctrl+``- Open terminal
- `Ctrl+Shift+P` - Command palette (type "Git:")

---

## Remember

1. **Pull every morning**
2. **Commit frequently**
3. **Push regularly**
4. **Test before pushing**
5. **Communicate with team**
6. **Ask for help when stuck**
7. **You can't break Git - almost everything is recoverable!**

---

**Questions?** Ask in #git-help Slack channel
**Emergency?** DM or call lead

**Document Version:** 1.0
**Last Updated:** January 31, 2026

---

## Quick Visual: Feature Workflow

```
START NEW FEATURE:
  git checkout dev
  git pull origin dev
  git checkout -b feature/my-feature
    ↓
WORK & COMMIT (repeat many times):
  [edit code]
  git add .
  git commit -m "feat: What I did"
  git push origin feature/my-feature
    ↓
PREPARE FOR MERGE:
  git checkout dev
  git pull origin dev
  git checkout feature/my-feature
  git merge dev
  [resolve conflicts if any]
  npm run dev  [test!]
  git push origin feature/my-feature
    ↓
CREATE PULL REQUEST:
  [Go to GitHub]
  [Create PR: dev ← feature/my-feature]
  [Request review]
    ↓
AFTER MERGE:
  git checkout dev
  git pull origin dev
  git branch -d feature/my-feature
    ↓
START NEXT FEATURE!
```

---

**Print this page and keep it visible while coding!**
