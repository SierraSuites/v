# Git Collaborative Workflow Guide
## The Sierra Suites Construction Management App

**Team Size:** 3 Developers (1 Lead + 2 Interns)
**Tech Stack:** Next.js + Supabase
**Version Control:** Git + GitHub
**Last Updated:** January 31, 2026

---

## Table of Contents

1. [Quick Start (Daily Workflow)](#1-quick-start-daily-workflow)
2. [Branch Strategy](#2-branch-strategy)
3. [Setting Up Your Development Environment](#3-setting-up-your-development-environment)
4. [Feature Branch Workflow (Step-by-Step)](#4-feature-branch-workflow-step-by-step)
5. [Handling Merge Conflicts](#5-handling-merge-conflicts)
6. [Commit Message Standards](#6-commit-message-standards)
7. [Code Review Process](#7-code-review-process)
8. [Common Git Commands Reference](#8-common-git-commands-reference)
9. [Avoiding Common Mistakes](#9-avoiding-common-mistakes)
10. [Communication Protocol](#10-communication-protocol)
11. [Work Assignment Strategy (Avoid Conflicts)](#11-work-assignment-strategy-avoid-conflicts)
12. [GitHub Repository Setup](#12-github-repository-setup)
13. [Troubleshooting Common Issues](#13-troubleshooting-common-issues)
14. [VS Code Git Integration](#14-vs-code-git-integration)
15. [Emergency Procedures](#15-emergency-procedures)

---

## 1. Quick Start (Daily Workflow)

This is your simple 5-step daily workflow. Follow this every day to stay in sync with your team and avoid conflicts.

### Morning Routine (Start of Day)

```bash
# 1. Open your terminal in the project directory
cd c:\Users\as_ka\OneDrive\Desktop\new

# 2. Check what branch you're on
git status

# 3. Switch to dev branch
git checkout dev

# 4. Pull the latest changes from the team
git pull origin dev

# 5. Check if there are any updates
git log --oneline -5
```

**Why?** This ensures you start with the latest code from your teammates. If someone merged changes last night, you'll have them before you start coding.

### During Work (Every 30-60 Minutes)

```bash
# 1. Check what files you've changed
git status

# 2. Review your changes
git diff

# 3. Add all changes to staging
git add .

# 4. Commit with a descriptive message
git commit -m "feat: Add invoice validation for QuoteHub"

# 5. Push to your feature branch (backup your work!)
git push origin feature/your-feature-name
```

**Why?** Committing frequently creates save points. If something breaks, you can go back. Pushing to GitHub backs up your work - if your laptop crashes, your code is safe.

### End of Day Routine

```bash
# 1. Make sure all your work is committed
git status

# 2. Commit any remaining changes
git add .
git commit -m "feat: Complete invoice PDF generation layout"

# 3. Push to your feature branch
git push origin feature/your-feature-name

# 4. Post update in team Slack/Discord
# Example: "Pushed invoice validation code to feature/invoice-validation. Ready for review tomorrow."
```

**Why?** Never leave uncommitted changes overnight. Always push before you close your laptop. This prevents lost work and keeps the team informed.

### The 5-Step Daily Workflow (Simplified)

```
MORNING:
  1. git checkout dev
  2. git pull origin dev

DURING WORK:
  3. git add . && git commit -m "your message"

END OF DAY:
  4. git push origin feature/your-branch
  5. Update team in Slack
```

**Print this out and stick it on your wall!**

---

## 2. Branch Strategy

Our team uses a structured branching strategy to keep the codebase organized and prevent conflicts.

### Branch Types

| Branch Type | Purpose | Who Can Merge | Lifetime |
|-------------|---------|---------------|----------|
| `main` | Production-ready code | Lead only | Permanent |
| `dev` | Integration branch | Lead (after review) | Permanent |
| `feature/*` | Individual features | Anyone (to dev) | Until merged |
| `hotfix/*` | Urgent production fixes | Lead (to main) | 1-2 days |

### Branch Flow Diagram

```
main (PROTECTED - Production)
  │
  │  ← Merge only after thorough testing
  │
dev (Integration - All work merges here first)
  │
  ├─── feature/invoice-creation (Intern 1)
  │      │
  │      ├─ Commit: Add invoice form
  │      ├─ Commit: Add validation
  │      └─ Commit: Add tests
  │
  ├─── feature/photo-upload (Intern 2)
  │      │
  │      ├─ Commit: Add upload component
  │      ├─ Commit: Add S3 integration
  │      └─ Commit: Add progress bar
  │
  └─── feature/ai-quote-generation (Lead)
         │
         ├─ Commit: Add OpenAI integration
         ├─ Commit: Add prompt templates
         └─ Commit: Add error handling


hotfix/* (Emergency fixes go directly to main)
  │
  hotfix/critical-security-patch
    │
    └─ Merge to main → Cherry-pick to dev
```

### Branch Naming Conventions

**Feature Branches:**
```bash
feature/invoice-creation
feature/photo-upload
feature/budget-calculator
feature/project-dashboard
feature/user-authentication
```

**Hotfix Branches:**
```bash
hotfix/security-patch
hotfix/payment-error
hotfix/data-loss-bug
```

**Good Branch Names:**
- `feature/add-invoice-pdf-export`
- `feature/improve-photo-gallery-ui`
- `hotfix/fix-quote-calculation-error`

**Bad Branch Names:**
- `johns-branch` (who is John? what's he working on?)
- `test` (too vague)
- `asdf` (meaningless)
- `temp` (if it's temp, it shouldn't be in git)

### Branch Lifecycle

```
1. CREATE FEATURE BRANCH
   git checkout dev
   git pull origin dev
   git checkout -b feature/my-feature

2. WORK ON FEATURE
   (Make commits, push regularly)

3. PREPARE FOR MERGE
   git checkout dev
   git pull origin dev
   git checkout feature/my-feature
   git merge dev
   (Resolve conflicts if any)

4. CREATE PULL REQUEST
   Push to GitHub
   Create PR: feature/my-feature → dev
   Request review from lead

5. MERGE AFTER APPROVAL
   Lead merges PR
   Delete feature branch

6. PULL LATEST DEV
   git checkout dev
   git pull origin dev
   (Your code is now in dev!)
```

---

## 3. Setting Up Your Development Environment

Follow these steps when you first join the team or set up a new machine.

### Prerequisites

Before you start, make sure you have:
- Git installed: `git --version` (should show version 2.30+)
- Node.js installed: `node --version` (should show version 18+)
- npm installed: `npm --version` (should show version 9+)
- VS Code installed (recommended editor)
- GitHub account with access to repository

### Step 1: Configure Git (First Time Only)

```bash
# Set your name (will appear in commits)
git config --global user.name "Your Name"

# Set your email (use your GitHub email)
git config --global user.email "your.email@example.com"

# Set default branch name to main
git config --global init.defaultBranch main

# Enable colored output (easier to read)
git config --global color.ui auto

# Set default editor (VS Code)
git config --global core.editor "code --wait"

# Verify your configuration
git config --list
```

### Step 2: Set Up SSH Keys for GitHub (Recommended)

SSH keys allow you to push/pull without entering your password every time.

```bash
# Generate SSH key (press Enter for all prompts)
ssh-keygen -t ed25519 -C "your.email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add your key to the agent
ssh-add ~/.ssh/id_ed25519

# Copy your public key (paste this into GitHub)
cat ~/.ssh/id_ed25519.pub
```

**Then:**
1. Go to GitHub → Settings → SSH and GPG keys
2. Click "New SSH key"
3. Paste your public key
4. Click "Add SSH key"

**Test your connection:**
```bash
ssh -T git@github.com
# Should say: "Hi username! You've successfully authenticated..."
```

### Step 3: Clone the Repository

```bash
# Navigate to where you want to store the project
cd c:\Users\as_ka\OneDrive\Desktop

# Clone using SSH (recommended)
git clone git@github.com:your-org/sierra-suites.git new

# OR clone using HTTPS
git clone https://github.com/your-org/sierra-suites.git new

# Navigate into the project
cd new

# Verify you're on the main branch
git branch
# Should show: * main
```

### Step 4: Install Dependencies

```bash
# Install all npm packages (this takes 2-5 minutes)
npm install

# You should see output like:
# added 1234 packages in 3m
```

**If you get errors:**
- Make sure you have Node.js 18+ installed
- Try deleting `node_modules` and `package-lock.json`, then run `npm install` again
- Check if you're behind a firewall/proxy

### Step 5: Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env.local

# Open .env.local in VS Code
code .env.local
```

**Fill in these variables** (ask lead for actual values):

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-key-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here

# OpenAI (for AI features)
OPENAI_API_KEY=sk-your-key-here

# AWS S3 (for photo uploads)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=sierra-suites-photos
```

**Important:**
- Never commit `.env.local` to git (it's in `.gitignore`)
- Keep these secrets safe - don't share in Slack or email
- If you accidentally expose a key, tell the lead immediately

### Step 6: Run the Development Server

```bash
# Start the Next.js development server
npm run dev

# You should see:
# ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

**Open your browser:** http://localhost:3000

You should see the Sierra Suites login page.

### Step 7: Verify Everything Works

**Test checklist:**
- [ ] Can you see the login page?
- [ ] Can you log in with test credentials?
- [ ] Can you navigate to different pages?
- [ ] Open browser console - no errors?
- [ ] Can you edit a file and see hot reload?

**If something doesn't work:**
1. Check the terminal for errors
2. Check browser console (F12) for errors
3. Make sure all environment variables are set
4. Ask in team chat for help

### Step 8: Create Your First Feature Branch

```bash
# Make sure you're on dev branch
git checkout dev

# Pull latest changes
git pull origin dev

# Create your first feature branch
git checkout -b feature/setup-complete

# Make a small test change (add your name to a comment)
code README.md
# Add: "<!-- Setup completed by Your Name on Jan 31, 2026 -->"

# Commit the change
git add README.md
git commit -m "docs: Complete development environment setup"

# Push to GitHub
git push origin feature/setup-complete
```

**You're all set!** Now you're ready to start contributing.

---

## 4. Feature Branch Workflow (Step-by-Step)

This is the complete workflow for working on a new feature from start to finish.

### Starting New Work

**Before you write any code**, always start with a fresh feature branch.

```bash
# 1. Make sure you're on dev branch
git checkout dev

# 2. Pull the absolute latest changes from GitHub
git pull origin dev

# 3. Create a new feature branch with descriptive name
git checkout -b feature/invoice-pdf-generation

# 4. Verify you're on the new branch
git branch
# Should show: * feature/invoice-pdf-generation

# 5. Start coding!
```

**Branch naming examples:**
```bash
# Good: Describes what you're building
git checkout -b feature/add-photo-gallery
git checkout -b feature/budget-calculator
git checkout -b feature/project-timeline

# Bad: Too vague or unclear
git checkout -b johns-work
git checkout -b temp
git checkout -b fix
```

### During Development

**Work in small, logical chunks.** Commit every 30-60 minutes or whenever you complete a logical unit of work.

#### Making Your First Changes

```bash
# 1. Edit files in VS Code
code src/app/quotehub/invoices/page.tsx

# 2. Check what you've changed
git status
# Shows:
#   modified: src/app/quotehub/invoices/page.tsx
#   modified: src/app/quotehub/invoices/components/InvoiceForm.tsx

# 3. See exactly what changed
git diff

# 4. If you want to see changes in a specific file
git diff src/app/quotehub/invoices/page.tsx
```

#### Committing Your Changes

```bash
# Option 1: Add all changed files
git add .

# Option 2: Add specific files
git add src/app/quotehub/invoices/page.tsx
git add src/app/quotehub/invoices/components/InvoiceForm.tsx

# Option 3: Add all files of a certain type
git add *.tsx

# Verify what's staged
git status
# Should show files under "Changes to be committed:"

# Commit with a descriptive message
git commit -m "feat: Add invoice form validation logic"

# See your commit in the log
git log --oneline -1
```

#### Pushing Your Work (Backing Up)

```bash
# Push to your feature branch on GitHub
git push origin feature/invoice-pdf-generation

# First time pushing a new branch, you might need:
git push -u origin feature/invoice-pdf-generation
# The -u flag sets up tracking so you can just use "git push" later
```

**Why push frequently?**
- Backs up your work to GitHub (safe from laptop crashes)
- Allows teammates to see your progress
- Enables collaboration if someone needs to help
- Creates a remote copy if you need to switch machines

#### Example: Complete Work Session

```bash
# Morning: Start work
git checkout dev
git pull origin dev
git checkout -b feature/photo-upload-component

# 10:00 AM: Create component file
# (edit files in VS Code)
git add src/components/PhotoUpload.tsx
git commit -m "feat: Create PhotoUpload component structure"
git push origin feature/photo-upload-component

# 11:00 AM: Add file validation
# (edit files in VS Code)
git add src/components/PhotoUpload.tsx
git commit -m "feat: Add file type and size validation"
git push origin feature/photo-upload-component

# 12:00 PM: Add upload progress bar
# (edit files in VS Code)
git add .
git commit -m "feat: Add upload progress indicator"
git push origin feature/photo-upload-component

# 2:00 PM: Add error handling
# (edit files in VS Code)
git add .
git commit -m "feat: Add error handling for failed uploads"
git push origin feature/photo-upload-component

# 3:00 PM: Add tests
# (edit files in VS Code)
git add .
git commit -m "test: Add unit tests for PhotoUpload component"
git push origin feature/photo-upload-component

# End of day: Feature complete!
# Now ready to create Pull Request
```

### Finishing Your Work (Preparing for Merge)

When your feature is complete and tested, follow these steps to prepare for merging.

#### Step 1: Update Your Branch with Latest Dev

Other people may have merged their work to `dev` while you were working. You need to get their changes and resolve any conflicts locally.

```bash
# 1. Save any uncommitted work first
git status
# If you have uncommitted changes:
git add .
git commit -m "feat: Complete photo upload feature"

# 2. Switch to dev branch
git checkout dev

# 3. Pull the latest changes
git pull origin dev

# 4. Switch back to your feature branch
git checkout feature/photo-upload-component

# 5. Merge dev into your feature branch
git merge dev
```

#### Step 2: Handle Merge Results

**Scenario A: No conflicts (clean merge)**
```bash
# You'll see:
# Merge made by the 'recursive' strategy.
#  src/app/projects/page.tsx | 10 +++++++
#  1 file changed, 10 insertions(+)

# Great! No conflicts. Proceed to next step.
```

**Scenario B: Merge conflicts**
```bash
# You'll see:
# Auto-merging src/app/quotehub/invoices/page.tsx
# CONFLICT (content): Merge conflict in src/app/quotehub/invoices/page.tsx
# Automatic merge failed; fix conflicts and then commit the result.

# Don't panic! See section 5 for detailed conflict resolution.
```

#### Step 3: Test Everything Still Works

After merging dev, you must test your feature to ensure nothing broke.

```bash
# 1. Run the development server
npm run dev

# 2. Test your feature manually in the browser
# - Does it still work?
# - Are there any console errors?
# - Did the merge break anything?

# 3. Run automated tests (if you have them)
npm run test

# 4. Run linter to check code quality
npm run lint
```

#### Step 4: Push Your Updated Branch

```bash
# Push your feature branch with merged dev changes
git push origin feature/photo-upload-component

# If you resolved conflicts, your branch is now up to date with dev
# and ready for a Pull Request
```

#### Step 5: Create Pull Request on GitHub

**On GitHub website:**

1. Go to your repository on GitHub
2. Click "Pull requests" tab
3. Click "New pull request"
4. Set base: `dev` ← compare: `feature/photo-upload-component`
5. Click "Create pull request"
6. Fill out the PR template:

```markdown
## Summary
Adds a photo upload component with drag-and-drop support, file validation,
and progress tracking. Integrates with AWS S3 for storage.

## Changes
- Created PhotoUpload component with drag-and-drop UI
- Added file type validation (jpg, png, heic only)
- Added file size limit (10MB max)
- Added upload progress bar
- Integrated with S3 bucket for storage
- Added error handling and user feedback

## Screenshots
(Attach screenshots of the feature working)

## Testing Done
- [x] Tested drag-and-drop upload
- [x] Tested file validation (rejected invalid types)
- [x] Tested large file handling (showed error)
- [x] Tested upload progress display
- [x] Tested error states
- [x] No console errors
- [x] Tested on Chrome and Firefox

## Related Issues
Closes #42

## Checklist
- [x] Code follows project style guidelines
- [x] Self-reviewed my own code
- [x] Commented complex logic
- [x] Updated documentation if needed
- [x] No new warnings or errors
- [x] Tested thoroughly
```

7. Request review from lead
8. Wait for approval

#### Step 6: Address Review Feedback

Your lead will review your code and may request changes.

```bash
# If lead requests changes:

# 1. Make the requested changes in VS Code
# (edit files)

# 2. Commit the fixes
git add .
git commit -m "fix: Address PR feedback - improve error messages"

# 3. Push to the same branch
git push origin feature/photo-upload-component

# The Pull Request will automatically update!
```

#### Step 7: Merge After Approval

Once approved, the lead will merge your PR. Then:

```bash
# 1. Switch to dev branch
git checkout dev

# 2. Pull the latest (includes your merged feature!)
git pull origin dev

# 3. Delete your local feature branch (no longer needed)
git branch -d feature/photo-upload-component

# 4. Delete remote feature branch (cleanup)
git push origin --delete feature/photo-upload-component

# 5. Celebrate! Your code is now in dev!
```

### Quick Reference: Complete Feature Workflow

```bash
# START
git checkout dev
git pull origin dev
git checkout -b feature/your-feature

# WORK (repeat many times)
# ... edit files ...
git add .
git commit -m "descriptive message"
git push origin feature/your-feature

# FINISH
git checkout dev
git pull origin dev
git checkout feature/your-feature
git merge dev
# ... resolve conflicts if needed ...
npm run dev  # Test everything works
git push origin feature/your-feature
# Create PR on GitHub
# Wait for review and approval
# Lead merges PR
git checkout dev
git pull origin dev
git branch -d feature/your-feature
```

---

## 5. Handling Merge Conflicts

Merge conflicts are normal! They happen when two people edit the same lines in a file. Don't panic - they're easy to fix.

### What is a Merge Conflict?

A merge conflict occurs when:
- You and a teammate both edited the same file
- You both changed the same lines (or nearby lines)
- Git can't automatically decide which changes to keep

**Example scenario:**
- You're working on `feature/invoice-form`
- Teammate is working on `feature/invoice-validation`
- You both edit `src/app/quotehub/invoices/page.tsx`
- Teammate merges to dev first
- When you try to merge dev, Git finds conflicts

### How to Identify Conflicts

```bash
# When you run:
git merge dev

# You might see:
Auto-merging src/app/quotehub/invoices/page.tsx
CONFLICT (content): Merge conflict in src/app/quotehub/invoices/page.tsx
Automatic merge failed; fix conflicts and then commit the result.

# Check which files have conflicts:
git status

# You'll see:
Unmerged paths:
  (use "git add <file>..." to mark resolution)
        both modified:   src/app/quotehub/invoices/page.tsx
```

### Understanding Conflict Markers

When you open a file with conflicts, you'll see special markers:

```typescript
export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);

<<<<<<< HEAD
  // Your code (current branch)
  const handleSubmit = async (data) => {
    await createInvoice(data);
    toast.success('Invoice created!');
  };
=======
  // Teammate's code (from dev branch)
  const handleSubmit = async (formData) => {
    const result = await createInvoice(formData);
    if (result.success) {
      showNotification('Invoice created successfully');
    }
  };
>>>>>>> dev

  return (
    // ... rest of component
  );
}
```

**Marker explanation:**
- `<<<<<<< HEAD` - Start of your changes (current branch)
- `=======` - Separator between the two versions
- `>>>>>>> dev` - End of their changes (branch you're merging)

### Step-by-Step Conflict Resolution

#### Step 1: Open the Conflicted File

```bash
# Open in VS Code
code src/app/quotehub/invoices/page.tsx
```

#### Step 2: Decide Which Changes to Keep

You have three options:

**Option A: Keep your changes only**
```typescript
// Delete their code and the conflict markers
const handleSubmit = async (data) => {
  await createInvoice(data);
  toast.success('Invoice created!');
};
```

**Option B: Keep their changes only**
```typescript
// Delete your code and the conflict markers
const handleSubmit = async (formData) => {
  const result = await createInvoice(formData);
  if (result.success) {
    showNotification('Invoice created successfully');
  }
};
```

**Option C: Combine both changes**
```typescript
// Take the best of both versions
const handleSubmit = async (data) => {
  const result = await createInvoice(data);
  if (result.success) {
    toast.success('Invoice created successfully');
  }
};
```

#### Step 3: Remove All Conflict Markers

**Make sure you delete:**
- `<<<<<<< HEAD`
- `=======`
- `>>>>>>> dev`

**Bad (will cause errors):**
```typescript
<<<<<<< HEAD
const handleSubmit = async (data) => {
=======
  await createInvoice(data);
  toast.success('Invoice created!');
};
```

**Good (clean, no markers):**
```typescript
const handleSubmit = async (data) => {
  await createInvoice(data);
  toast.success('Invoice created!');
};
```

#### Step 4: Test Your Changes

```bash
# Save the file

# Run the dev server
npm run dev

# Test in browser:
# - Does the feature work?
# - No syntax errors?
# - Open browser console - no errors?

# Run linter
npm run lint

# Make sure everything compiles
npm run build
```

#### Step 5: Mark as Resolved and Commit

```bash
# Add the resolved file
git add src/app/quotehub/invoices/page.tsx

# Check status (should show "Changes to be committed")
git status

# Commit the resolution
git commit -m "merge: Resolve conflict in invoices page, combine validation logic"

# Push to your branch
git push origin feature/invoice-form
```

### Using VS Code's Conflict Resolution UI

VS Code has a built-in conflict resolver that makes this easier.

**When you open a file with conflicts, VS Code shows:**

```
Accept Current Change | Accept Incoming Change | Accept Both Changes | Compare Changes
<<<<<<< HEAD (Current Change)
Your code here
=======
Their code here
>>>>>>> dev (Incoming Change)
```

**Click the option you want:**
- **Accept Current Change** - Keep your code, discard theirs
- **Accept Incoming Change** - Keep their code, discard yours
- **Accept Both Changes** - Keep both (you may need to edit after)
- **Compare Changes** - See side-by-side diff

**After clicking:**
1. Conflict markers are automatically removed
2. Review the result (make any needed adjustments)
3. Save the file
4. Run tests
5. `git add` and `git commit`

### Common Conflict Scenarios

#### Scenario 1: Same Function, Different Implementation

```typescript
<<<<<<< HEAD
// Your version: Simple validation
function validateInvoice(invoice) {
  return invoice.amount > 0;
}
=======
// Their version: Comprehensive validation
function validateInvoice(invoice) {
  if (!invoice.amount || invoice.amount <= 0) return false;
  if (!invoice.client) return false;
  if (!invoice.date) return false;
  return true;
}
>>>>>>> dev
```

**Resolution:** Keep the more complete version (their code)

#### Scenario 2: Different Features, Same Area

```typescript
<<<<<<< HEAD
// Your version: Added export button
<Button onClick={handleExport}>Export PDF</Button>
<Button onClick={handlePrint}>Print</Button>
=======
// Their version: Added share button
<Button onClick={handleShare}>Share</Button>
<Button onClick={handlePrint}>Print</Button>
>>>>>>> dev
```

**Resolution:** Combine both features
```typescript
<Button onClick={handleExport}>Export PDF</Button>
<Button onClick={handleShare}>Share</Button>
<Button onClick={handlePrint}>Print</Button>
```

#### Scenario 3: Import Statements

```typescript
<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
=======
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
>>>>>>> dev
```

**Resolution:** Combine unique imports
```typescript
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
```

### Prevention Strategies

**How to avoid conflicts before they happen:**

#### 1. Communicate with Your Team

```
Before starting work:
"Working on invoice form validation today - touching
src/app/quotehub/invoices/page.tsx"

Response:
"Ok, I'm working on invoice PDF export - different file.
We're good!"
```

#### 2. Work on Different Files

- Intern 1: Frontend components (`src/components/`)
- Intern 2: API routes (`src/app/api/`)
- Lead: Complex features, code review

#### 3. Pull Frequently

```bash
# Every few hours, merge latest dev
git checkout dev
git pull origin dev
git checkout feature/your-branch
git merge dev
```

#### 4. Keep Feature Branches Short-Lived

- Don't work on a feature for weeks
- Break large features into smaller PRs
- Merge frequently (daily if possible)

#### 5. Use Clear Commit Messages

Good messages help you understand what changed:
```bash
git commit -m "feat: Add invoice PDF export button to toolbar"
# vs
git commit -m "changes"  # What changed?!
```

### When to Ask for Help

**Ask your lead if:**
- You have conflicts in more than 3 files
- The conflict is in a file you've never seen before
- You're not sure which version to keep
- You've been stuck for more than 30 minutes
- The merge conflict broke the app and you can't fix it

**How to ask for help:**
```
"Hey lead, I'm getting merge conflicts in
src/app/quotehub/invoices/page.tsx when trying to merge dev.
Both versions changed the handleSubmit function. Not sure which
to keep - can you take a look?"
```

### Aborting a Merge

If the conflicts are too complex, you can abort and start over:

```bash
# Abort the merge (go back to before you started)
git merge --abort

# You're back to a clean state
git status
# Should show: nothing to commit, working tree clean

# Now you can:
# 1. Ask for help from lead
# 2. Coordinate with teammate who created the conflict
# 3. Try again with better understanding
```

### Conflict Resolution Checklist

- [ ] Identified all conflicted files (`git status`)
- [ ] Opened each file and found conflict markers
- [ ] Decided which changes to keep (yours, theirs, or both)
- [ ] Removed ALL conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- [ ] Saved files
- [ ] Tested app works (`npm run dev`)
- [ ] No console errors
- [ ] Ran linter (`npm run lint`)
- [ ] Staged resolved files (`git add`)
- [ ] Committed resolution (`git commit`)
- [ ] Pushed to branch (`git push`)

---

## 6. Commit Message Standards

Good commit messages help your team understand what changed and why. They're like comments for your git history.

### Commit Message Format

We use the [Conventional Commits](https://www.conventionalcommits.org/) standard:

```
<type>: <description>

[optional body]

[optional footer]
```

**Examples:**
```bash
git commit -m "feat: Add invoice PDF export functionality"
git commit -m "fix: Resolve photo upload timeout on slow connections"
git commit -m "docs: Update API documentation for QuoteHub endpoints"
```

### Commit Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature | `feat: Add budget calculator component` |
| `fix` | Bug fix | `fix: Resolve calculation error in quote totals` |
| `docs` | Documentation | `docs: Add setup instructions to README` |
| `style` | Code formatting (no logic change) | `style: Format files with Prettier` |
| `refactor` | Code improvement (no feature/bug change) | `refactor: Simplify invoice validation logic` |
| `test` | Adding tests | `test: Add unit tests for photo upload` |
| `chore` | Maintenance tasks | `chore: Update dependencies to latest versions` |
| `perf` | Performance improvement | `perf: Optimize image loading in gallery` |
| `ci` | CI/CD changes | `ci: Add GitHub Actions workflow` |
| `build` | Build system changes | `build: Update Next.js to v15.1.4` |
| `revert` | Revert previous commit | `revert: Revert "feat: Add experimental feature"` |

### Good Commit Messages

**Great examples:**
```bash
feat: Add drag-and-drop photo upload component
fix: Resolve invoice calculation error for tax rates > 10%
docs: Update environment variable setup instructions
style: Format all TypeScript files with Prettier
refactor: Extract invoice validation into separate function
test: Add integration tests for quote creation workflow
chore: Update Supabase client to v2.40.0
perf: Add lazy loading to project images gallery
```

**Why these are good:**
- Start with type prefix (`feat`, `fix`, etc.)
- Use imperative mood ("Add" not "Added" or "Adding")
- Concise but descriptive (50-72 characters)
- Explain WHAT changed, not HOW
- No period at the end

### Bad Commit Messages

**Avoid these:**
```bash
git commit -m "stuff"
# Problem: Too vague - what stuff?

git commit -m "wip"
# Problem: Work in progress isn't descriptive

git commit -m "fixed bug"
# Problem: Which bug? Where?

git commit -m "asdf"
# Problem: Random characters - meaningless

git commit -m "Updated files"
# Problem: Which files? What updates?

git commit -m "changes"
# Problem: Everything is a change!

git commit -m "Final version"
# Problem: Nothing is ever final

git commit -m "Fixed the thing that was broken"
# Problem: What thing? What was broken?
```

### Writing Better Commit Messages

**Formula: What + Where (optional) + Why (optional)**

```bash
# Good: What
feat: Add invoice validation

# Better: What + Where
feat: Add invoice validation to QuoteHub form

# Best: What + Where + Why
feat: Add invoice validation to QuoteHub form to prevent negative amounts

# Another example:
fix: Resolve photo upload timeout
# vs
fix: Resolve photo upload timeout by increasing S3 client timeout to 30s
```

### Commit Message Examples by Module

#### QuoteHub Module
```bash
feat: Add invoice creation form
feat: Add quote PDF export functionality
fix: Resolve quote calculation rounding error
refactor: Simplify invoice status update logic
test: Add tests for quote validation rules
```

#### Projects Module
```bash
feat: Add project timeline view
feat: Add photo gallery to project details
fix: Resolve project search filter bug
refactor: Extract project card to reusable component
style: Update project dashboard layout
```

#### Financial Module
```bash
feat: Add budget vs actual comparison chart
feat: Add expense tracking for labor costs
fix: Resolve budget calculation for multi-phase projects
refactor: Simplify financial report generation
perf: Optimize budget calculation queries
```

#### General
```bash
chore: Update Next.js to v15.1.4
docs: Add Git workflow guide for team
ci: Add automated testing workflow
build: Configure TypeScript strict mode
```

### Multi-Line Commit Messages

For complex changes, use a detailed body:

```bash
git commit -m "feat: Add invoice PDF export functionality

Adds ability to export invoices as PDF documents with company branding.

Implementation details:
- Uses jsPDF library for PDF generation
- Includes company logo and contact info
- Supports multi-page invoices for large item lists
- Adds download and email options

Related to issue #42"
```

**In terminal:**
```bash
# Option 1: Use git commit without -m (opens editor)
git commit
# Then type your multi-line message

# Option 2: Use echo with multi-line string
git commit -m "feat: Add invoice PDF export

Adds ability to export invoices as PDF with branding.

- Uses jsPDF library
- Includes logo and contact info
- Supports multi-page invoices

Related to issue #42"
```

### Commit Message Templates

Save time with templates for common scenarios:

**New Feature:**
```bash
feat: Add [feature name]

Implements [what it does] for [who/where].

Changes:
- [Major change 1]
- [Major change 2]
- [Major change 3]

Closes #[issue number]
```

**Bug Fix:**
```bash
fix: Resolve [issue description]

The issue occurred when [scenario]. This fix [solution approach].

Root cause: [why it happened]
Solution: [what you did]

Fixes #[issue number]
```

**Refactoring:**
```bash
refactor: Simplify [what you refactored]

Improves code readability and maintainability without changing behavior.

Changes:
- [Change 1]
- [Change 2]

No functional changes.
```

### Commit Frequency

**How often should you commit?**

**Too infrequent (bad):**
```bash
# End of day: One commit with everything
git commit -m "feat: Complete entire invoice feature"
# 2000 lines changed across 15 files
```

**Too frequent (also bad):**
```bash
git commit -m "fix: typo"
git commit -m "fix: another typo"
git commit -m "fix: missing semicolon"
git commit -m "fix: forgot to save"
```

**Just right (good):**
```bash
# Every 30-60 minutes or logical stopping point
git commit -m "feat: Create invoice form component structure"
# ... 30 minutes later ...
git commit -m "feat: Add validation to invoice form fields"
# ... 45 minutes later ...
git commit -m "feat: Add submit handler and API integration"
# ... 30 minutes later ...
git commit -m "test: Add unit tests for invoice form validation"
```

**Rule of thumb:**
- Commit when you complete a logical unit of work
- Each commit should be self-contained and working
- If you can't describe the commit in one line, it's too big
- Commit before lunch, before meetings, before end of day

### Amending Commits

Made a typo in your last commit message? You can fix it:

```bash
# Oh no, typo!
git commit -m "feat: Add invoice validaton"

# Fix it (only if you haven't pushed yet!)
git commit --amend -m "feat: Add invoice validation"

# If you already pushed, just make a new commit
# Don't amend pushed commits!
```

### Commit Message Checklist

Before committing, ask yourself:

- [ ] Does the message start with a type? (`feat:`, `fix:`, etc.)
- [ ] Is it in imperative mood? ("Add" not "Added")
- [ ] Is it concise but descriptive?
- [ ] Does it explain WHAT changed?
- [ ] Would a teammate understand what this commit does?
- [ ] Did you spell everything correctly?

---

## 7. Code Review Process

Code reviews ensure quality, catch bugs early, and help everyone learn. Every Pull Request must be reviewed before merging.

### Why Code Reviews Matter

**Benefits:**
- Catch bugs before they reach production
- Ensure code follows team standards
- Share knowledge across team
- Improve code quality
- Mentor junior developers
- Prevent technical debt

**For reviewers (lead):**
- Understand what everyone is working on
- Ensure architectural consistency
- Spot potential issues early

**For authors (interns):**
- Get feedback and learn
- Improve coding skills
- Understand team expectations

### Creating a Pull Request

#### Step 1: Prepare Your Branch

```bash
# Make sure all work is committed
git status

# Make sure your branch is up to date with dev
git checkout dev
git pull origin dev
git checkout feature/your-feature
git merge dev

# Run tests
npm run test

# Run linter
npm run lint

# Build to ensure no errors
npm run build

# Push your final changes
git push origin feature/your-feature
```

#### Step 2: Create PR on GitHub

**Go to GitHub repository:**
1. Click "Pull requests" tab
2. Click "New pull request"
3. Select branches:
   - Base: `dev`
   - Compare: `feature/your-feature`
4. Click "Create pull request"

#### Step 3: Fill Out PR Template

**Good PR description:**

```markdown
## Summary
Implements a photo upload component with drag-and-drop support for the
Projects module. Users can now upload multiple photos at once with
real-time progress tracking and automatic upload to S3.

## Type of Change
- [x] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation update

## Changes Made
- Created PhotoUpload component with drag-and-drop UI
- Added file type validation (JPEG, PNG, HEIC only)
- Added file size validation (max 10MB per file)
- Integrated with AWS S3 for storage
- Added upload progress indicator
- Added error handling for failed uploads
- Created Supabase database entries for uploaded photos
- Added photo gallery view to project details page

## Related Issues
Closes #42
Related to #38

## Screenshots
### Photo Upload Component
![Photo upload UI](https://imgur.com/abc123.png)

### Upload Progress
![Progress indicator](https://imgur.com/def456.png)

### Photo Gallery
![Gallery view](https://imgur.com/ghi789.png)

## Testing Completed
- [x] Tested drag-and-drop upload
- [x] Tested click-to-upload
- [x] Tested multiple file upload (tested with 10 files)
- [x] Tested file type validation (rejected .gif and .pdf)
- [x] Tested file size validation (rejected 15MB file)
- [x] Tested upload progress display
- [x] Tested error states (network error, S3 error)
- [x] Tested photo display in gallery
- [x] Tested on Chrome, Firefox, Safari
- [x] Tested on mobile (iOS Safari)
- [x] No console errors or warnings
- [x] Ran `npm run lint` - passed
- [x] Ran `npm run build` - successful

## Database Changes
Added columns to `project_photos` table:
- `file_size` (integer)
- `upload_date` (timestamp)

Migration file: `supabase/migrations/20260131_add_photo_metadata.sql`

## Environment Variables
Requires these to be set:
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

## Deployment Notes
- Ensure S3 bucket CORS policy allows uploads from app domain
- Ensure Supabase service role key has write permissions

## Questions for Reviewer
- Should we add a photo compression feature before upload?
- What should be the max number of photos per project?

## Checklist
- [x] Code follows project style guidelines
- [x] Self-reviewed my own code
- [x] Commented complex logic
- [x] Updated documentation where needed
- [x] Added tests for new features
- [x] All tests pass
- [x] No new warnings or errors
- [x] Tested thoroughly in browser
- [x] Updated database schema (if applicable)
- [x] Updated environment variable documentation
```

#### Step 4: Request Review

1. On the right sidebar, click "Reviewers"
2. Select the lead developer
3. Add any relevant labels (e.g., "feature", "high-priority")
4. Add to project board if you use one
5. Click "Create pull request"

### Reviewing Code (For Lead)

When you receive a PR to review:

#### 1. Read the Description First

- Understand what the PR is trying to accomplish
- Check if tests were run
- Review screenshots/videos if provided

#### 2. Check Out the Branch Locally

```bash
# Fetch the latest branches
git fetch origin

# Check out the feature branch
git checkout feature/photo-upload-component

# Install any new dependencies
npm install

# Run the development server
npm run dev

# Test the feature manually
```

#### 3. Review the Code

**What to look for:**

**Code Quality:**
- Is the code readable and well-organized?
- Are variables and functions well-named?
- Is there commented code or console.logs left in?
- Is there duplicated code that should be extracted?

**Functionality:**
- Does it work as described?
- Are edge cases handled?
- Is error handling comprehensive?
- Are there any obvious bugs?

**Performance:**
- Are there any performance issues?
- Are queries optimized?
- Are large operations properly async?

**Security:**
- Are user inputs validated?
- Are API keys or secrets exposed?
- Are Supabase RLS policies considered?

**Testing:**
- Are there tests for new functionality?
- Do all tests pass?
- Are edge cases tested?

**Standards:**
- Does it follow team coding standards?
- Is TypeScript used properly?
- Are proper types defined (no `any`)?
- Does it match the project architecture?

#### 4. Leave Comments

**On GitHub PR page:**

**Inline comments on specific lines:**
```
// Example comment on line 42:
"Consider extracting this validation logic into a separate
function for reusability. We'll likely need this in the
invoice form too."
```

**Types of feedback:**

**Blocking (must fix):**
```
⛔ This API endpoint is missing authentication. Add
Supabase auth check before allowing uploads.
```

**Suggestion (nice to have):**
```
💡 Consider using the useCallback hook here to prevent
unnecessary re-renders. Not required for this PR, but
good for performance.
```

**Question (seeking clarification):**
```
❓ Why did we choose to store photos in S3 instead of
Supabase Storage? Just want to understand the decision.
```

**Praise (positive feedback):**
```
✨ Great error handling here! Love the user-friendly
error messages.
```

#### 5. Test Thoroughly

```bash
# Run automated tests
npm run test

# Run linter
npm run lint

# Build the project
npm run build

# Test the feature manually:
# - Happy path (expected usage)
# - Error cases (network errors, validation failures)
# - Edge cases (empty data, max limits, special characters)
# - Different browsers if needed
```

#### 6. Approve or Request Changes

**If everything looks good:**
1. Click "Review changes"
2. Select "Approve"
3. Leave summary comment:
```
Looks great! Code is clean, tests pass, and feature works
perfectly. Nice work on the error handling. Approved to merge.
```

**If changes needed:**
1. Click "Review changes"
2. Select "Request changes"
3. Leave summary comment:
```
Good start! A few issues to address:

1. Missing authentication check on upload endpoint
2. Need to add file type validation on server side
3. Console.log statements should be removed

Please update and I'll re-review.
```

### Addressing Review Feedback (For Author)

When you receive review comments:

#### Step 1: Read All Feedback Carefully

- Don't get defensive - reviews help you improve
- Ask questions if you don't understand
- Understand WHY changes are requested

#### Step 2: Make the Requested Changes

```bash
# Make sure you're on your feature branch
git checkout feature/photo-upload-component

# Make the requested changes in VS Code
# ... edit files ...

# Commit the fixes
git add .
git commit -m "fix: Address PR feedback - add server-side validation"

# Push to the same branch
git push origin feature/photo-upload-component
```

**The PR automatically updates!** No need to create a new PR.

#### Step 3: Respond to Comments

On each comment thread:
```
✅ Fixed - added authentication check to upload endpoint
✅ Fixed - added server-side file type validation
✅ Fixed - removed console.log statements
❓ Re: useCallback - should I add that in this PR or create
a separate performance optimization PR?
```

#### Step 4: Re-Request Review

After making changes:
1. Click "Re-request review" button
2. Add comment: "All feedback addressed. Ready for re-review."

### Merging the Pull Request

**After approval, the lead merges:**

```bash
# Option 1: Merge on GitHub
# 1. Click "Merge pull request"
# 2. Select merge method: "Squash and merge" (recommended)
# 3. Edit commit message if needed
# 4. Click "Confirm squash and merge"
# 5. Click "Delete branch" (cleanup)

# Option 2: Merge locally (advanced)
git checkout dev
git pull origin dev
git merge --no-ff feature/photo-upload-component
git push origin dev
git push origin --delete feature/photo-upload-component
```

**Merge strategies:**

**Squash and merge (recommended for small features):**
- Combines all commits into one
- Keeps dev branch history clean
- Good for feature branches with many small commits

**Merge commit (for larger features):**
- Preserves all individual commits
- Shows complete history
- Good for features with logical commit progression

**Rebase and merge (for linear history):**
- Replays commits on top of dev
- Creates linear history
- More advanced - use with caution

### After Merge

**Author should:**
```bash
# Pull the latest dev (includes your merged code!)
git checkout dev
git pull origin dev

# Delete your local feature branch
git branch -d feature/photo-upload-component

# Celebrate! 🎉
```

**Team notification:**
```
Posted in Slack:
"Photo upload feature merged to dev! Projects can now upload
and view photos. Nice work @intern1! 🎉"
```

### Code Review Best Practices

**For authors:**
- Keep PRs small (< 400 lines of code if possible)
- Self-review before requesting review
- Provide context in description
- Add screenshots/videos for UI changes
- Respond promptly to feedback
- Don't take feedback personally - it's about the code

**For reviewers:**
- Review within 24 hours
- Be constructive and kind
- Explain WHY changes are needed
- Praise good work
- Distinguish between blocking issues and suggestions
- Test the code, don't just read it

### Code Review Checklist

**For authors before requesting review:**
- [ ] All code is committed and pushed
- [ ] Branch is up to date with dev
- [ ] Tests pass (`npm run test`)
- [ ] Linter passes (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Feature tested manually in browser
- [ ] No console errors or warnings
- [ ] PR description is complete
- [ ] Screenshots added (if UI change)
- [ ] Self-reviewed the code
- [ ] Removed debug code and console.logs

**For reviewers:**
- [ ] Read PR description
- [ ] Checked out branch locally
- [ ] Ran code and tested feature
- [ ] Reviewed code for quality
- [ ] Checked for security issues
- [ ] Verified tests pass
- [ ] Tested edge cases
- [ ] Left constructive feedback
- [ ] Approved or requested changes

---

## 8. Common Git Commands Reference

Quick reference for commands you'll use daily.

### Checking Status

```bash
# See current branch and changed files
git status

# Short format
git status -s

# See what branch you're on
git branch

# See all branches (local and remote)
git branch -a

# See remote repository URL
git remote -v
```

### Viewing Changes

```bash
# See all unstaged changes
git diff

# See changes in a specific file
git diff src/app/page.tsx

# See staged changes (what will be committed)
git diff --staged

# See changes between branches
git diff dev feature/my-branch

# See changes in last commit
git show

# See changes in specific commit
git show abc123
```

### Viewing History

```bash
# See commit history
git log

# See concise one-line history
git log --oneline

# See graphical branch history
git log --oneline --graph --all

# See last 5 commits
git log --oneline -5

# See commits by specific author
git log --author="Your Name"

# See commits in last 24 hours
git log --since="24 hours ago"

# See commits that changed a specific file
git log -- src/app/page.tsx

# See who changed each line of a file
git blame src/app/page.tsx
```

### Creating and Switching Branches

```bash
# Create new branch
git branch feature/new-feature

# Switch to existing branch
git checkout dev

# Create and switch to new branch (shortcut)
git checkout -b feature/new-feature

# Switch to previous branch
git checkout -

# Rename current branch
git branch -m new-branch-name

# See current branch
git branch --show-current
```

### Pulling and Fetching

```bash
# Pull latest changes for current branch
git pull

# Pull from specific branch
git pull origin dev

# Fetch all branches (doesn't merge)
git fetch origin

# Fetch and prune deleted remote branches
git fetch -p

# Pull and rebase instead of merge
git pull --rebase origin dev
```

### Committing

```bash
# Stage all changed files
git add .

# Stage specific file
git add src/app/page.tsx

# Stage all TypeScript files
git add *.tsx

# Stage all files in a directory
git add src/components/

# Commit staged changes
git commit -m "feat: Add new feature"

# Stage and commit in one command
git commit -am "fix: Quick bug fix"

# Amend last commit (before pushing!)
git commit --amend -m "feat: Add new feature (fixed typo)"

# Amend last commit without changing message
git commit --amend --no-edit
```

### Pushing

```bash
# Push current branch to remote
git push

# Push to specific branch (first time)
git push -u origin feature/new-feature

# Push to specific branch
git push origin feature/new-feature

# Push all branches
git push --all

# Delete remote branch
git push origin --delete feature/old-feature

# Force push (dangerous! use with caution)
git push --force
# Better: force with lease (safer)
git push --force-with-lease
```

### Merging

```bash
# Merge dev into current branch
git merge dev

# Merge with commit message
git merge dev -m "merge: Merge dev into feature branch"

# Merge without fast-forward (creates merge commit)
git merge --no-ff dev

# Abort a merge in progress
git merge --abort

# Continue merge after resolving conflicts
git merge --continue
```

### Stashing (Temporary Storage)

```bash
# Stash current changes
git stash

# Stash with description
git stash save "WIP: invoice validation"

# List all stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash pop stash@{1}

# Apply stash without removing it
git stash apply

# See what's in a stash
git stash show

# Delete all stashes
git stash clear

# Delete specific stash
git stash drop stash@{0}
```

### Undoing Changes

```bash
# Undo changes to a file (before staging)
git checkout -- src/app/page.tsx

# Undo all unstaged changes
git checkout -- .

# Unstage a file (keep changes)
git reset HEAD src/app/page.tsx

# Unstage all files (keep changes)
git reset HEAD

# Undo last commit (keep changes)
git reset --soft HEAD~1

# Undo last commit (discard changes) - dangerous!
git reset --hard HEAD~1

# Undo last 3 commits (keep changes)
git reset --soft HEAD~3

# Revert a commit (creates new commit)
git revert abc123

# Discard all changes and match remote
git reset --hard origin/dev
```

### Cleaning Up

```bash
# See what would be deleted
git clean -n

# Delete untracked files
git clean -f

# Delete untracked files and directories
git clean -fd

# Delete local branches that are merged
git branch --merged | grep -v "main\|dev" | xargs git branch -d

# Delete local branch
git branch -d feature/old-feature

# Force delete local branch
git branch -D feature/old-feature

# Prune remote tracking branches
git remote prune origin
```

### Tagging (For Releases)

```bash
# Create lightweight tag
git tag v1.0.0

# Create annotated tag (recommended)
git tag -a v1.0.0 -m "Release version 1.0.0"

# List all tags
git tag

# See tag details
git show v1.0.0

# Push tag to remote
git push origin v1.0.0

# Push all tags
git push --tags

# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin --delete v1.0.0

# Check out a tag
git checkout v1.0.0
```

### Searching

```bash
# Search for text in all files
git grep "TODO"

# Search in specific file type
git grep "handleSubmit" -- "*.tsx"

# Search in specific directory
git grep "useState" src/components/

# Search commit messages
git log --grep="invoice"

# Search for commits that added/removed text
git log -S "handleSubmit"
```

### Configuration

```bash
# See all config
git config --list

# Set your name
git config --global user.name "Your Name"

# Set your email
git config --global user.email "your@email.com"

# Set default editor
git config --global core.editor "code --wait"

# Set default branch name
git config --global init.defaultBranch main

# Enable colors
git config --global color.ui auto

# See specific config value
git config user.name

# Edit config file directly
git config --global --edit
```

### Helpful Aliases

Add these to your `~/.gitconfig` file:

```bash
# Set up aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual 'log --oneline --graph --all'

# Now you can use:
git st         # instead of git status
git co dev     # instead of git checkout dev
git br         # instead of git branch
git ci -m "msg" # instead of git commit -m "msg"
git visual     # pretty graph view
```

### Advanced Commands

```bash
# Interactive rebase (clean up commits before PR)
git rebase -i HEAD~3

# Cherry-pick specific commit to current branch
git cherry-pick abc123

# See what would be pulled
git fetch && git log HEAD..origin/dev --oneline

# Create patch file
git diff > my-changes.patch

# Apply patch file
git apply my-changes.patch

# Find which commit introduced a bug (binary search)
git bisect start
git bisect bad  # Current commit is bad
git bisect good abc123  # This old commit was good
# Git will help you find the problematic commit

# See file from different branch
git show dev:src/app/page.tsx

# See file from different commit
git show abc123:src/app/page.tsx
```

### Git Command Cheat Sheet

**Daily workflow:**
```bash
git checkout dev && git pull origin dev
git checkout -b feature/my-work
# ... do work ...
git add . && git commit -m "feat: My changes"
git push origin feature/my-work
```

**When stuck:**
```bash
git status          # Where am I?
git log --oneline   # What happened?
git diff           # What changed?
```

**Emergency:**
```bash
git stash          # Save work temporarily
git merge --abort  # Cancel bad merge
git reset --hard origin/dev  # Start over
```

---

## 9. Avoiding Common Mistakes

Learn from common Git mistakes so you don't have to make them yourself.

### DON'T: Commit Directly to Main

**Bad:**
```bash
git checkout main
# ... edit files ...
git commit -m "Quick fix"
git push origin main  # ⛔ NO!
```

**Why it's bad:**
- Bypasses code review
- Could break production
- No chance for team to review
- Violates workflow

**Good:**
```bash
git checkout dev
git pull origin dev
git checkout -b hotfix/urgent-fix
# ... edit files ...
git commit -m "fix: Urgent production fix"
git push origin hotfix/urgent-fix
# Create PR, get review, then merge
```

### DON'T: Push Without Pulling First

**Bad:**
```bash
git commit -m "feat: Add feature"
git push origin dev  # ⛔ Might fail!
# Error: Updates were rejected because the remote contains work that you do not have locally
```

**Why it's bad:**
- Creates conflicts
- Wastes time
- Can overwrite teammates' work

**Good:**
```bash
git pull origin dev  # Get latest first
git commit -m "feat: Add feature"
git push origin dev  # ✅ Clean push
```

### DON'T: Commit node_modules or .env Files

**Bad:**
```bash
git add .
# ⛔ This adds EVERYTHING including node_modules and .env!
git commit -m "feat: Add feature"
```

**Why it's bad:**
- node_modules is huge (100MB+)
- .env contains secrets
- Slows down git operations
- Wastes storage

**Good:**
```bash
# Make sure .gitignore includes:
node_modules/
.env
.env.local
.env*.local

# Then:
git status  # Check what will be added
git add .   # Now safe
git commit -m "feat: Add feature"
```

**If you accidentally committed node_modules:**
```bash
# Remove from git but keep locally
git rm -r --cached node_modules
git commit -m "chore: Remove node_modules from git"
git push
```

### DON'T: Force Push to Shared Branches

**Bad:**
```bash
git push --force origin dev  # ⛔ NEVER!
# Overwrites teammates' work!
```

**Why it's bad:**
- Deletes teammates' commits
- Breaks their local repos
- Causes major problems
- Very hard to recover

**Good:**
```bash
# If your push is rejected, merge instead
git pull origin dev
# Resolve conflicts
git push origin dev  # ✅ Safe

# Force push ONLY to your own feature branch (if necessary)
git push --force-with-lease origin feature/my-branch  # Safer
```

### DON'T: Leave Merge Conflict Markers in Code

**Bad:**
```bash
# After resolving conflict, you forget to remove markers
<<<<<<< HEAD
const result = await processInvoice(data);
=======
const output = await handleInvoice(formData);
>>>>>>> dev

git add .  # ⛔ Committed conflict markers!
git commit -m "merge: Merge dev"
```

**Why it's bad:**
- Code won't compile
- Breaks the app
- Looks unprofessional
- Shows you didn't test

**Good:**
```bash
# Remove ALL markers
const result = await processInvoice(data);

# Test the code works
npm run dev  # ✅ No errors

git add .
git commit -m "merge: Resolve conflict in invoice handler"
```

### DON'T: Write Vague Commit Messages

**Bad:**
```bash
git commit -m "stuff"
git commit -m "wip"
git commit -m "changes"
git commit -m "asdf"
git commit -m "final"
git commit -m "final2"
git commit -m "final-final"
git commit -m "this-time-for-real"
```

**Why it's bad:**
- Can't understand what changed
- Hard to find specific commits
- Looks unprofessional
- Useless in code review

**Good:**
```bash
git commit -m "feat: Add invoice PDF export button"
git commit -m "fix: Resolve photo upload timeout on large files"
git commit -m "refactor: Extract validation logic to utils"
git commit -m "docs: Update API documentation for quotes"
```

### DON'T: Commit Broken Code

**Bad:**
```bash
# Code has syntax error
git add .
git commit -m "feat: Add feature"  # ⛔ Doesn't compile!
git push
```

**Why it's bad:**
- Breaks teammates' development
- Fails CI/CD builds
- Wastes time debugging
- Blocks other work

**Good:**
```bash
# ALWAYS test before committing
npm run dev  # Test it works
npm run lint  # Check for errors
npm run build  # Ensure it compiles

# Only commit if everything passes
git add .
git commit -m "feat: Add feature"
git push  # ✅ Tested and working
```

### DON'T: Work on Outdated Branch

**Bad:**
```bash
# Monday morning
git checkout feature/my-feature
# ... work all day without pulling ...
git push  # ⛔ You're days behind!
```

**Why it's bad:**
- Your code is based on old version
- Massive merge conflicts later
- May be building on buggy code
- Wastes time redoing work

**Good:**
```bash
# Every morning
git checkout dev
git pull origin dev
git checkout feature/my-feature
git merge dev  # Stay up to date

# Throughout day, pull regularly
git pull origin dev  # Every few hours
```

### DO: Commit Frequently

**Bad:**
```bash
# Work all day, one commit at end
# 2000 lines changed across 15 files
git commit -m "feat: Complete entire feature"  # ⛔ Too big!
```

**Why it's bad:**
- Hard to review
- Can't undo specific changes
- Loses granular history
- Makes debugging harder

**Good:**
```bash
# Commit every 30-60 minutes
git commit -m "feat: Create invoice form component"
# ... 30 minutes ...
git commit -m "feat: Add form validation"
# ... 45 minutes ...
git commit -m "feat: Add submit handler"
# ... 30 minutes ...
git commit -m "test: Add unit tests"
```

### DO: Pull Before Starting Work Each Day

**Good morning routine:**
```bash
# Every morning before coding
git checkout dev
git pull origin dev
git checkout feature/my-feature
git merge dev

# Now you have latest code ✅
```

**Why it's important:**
- Gets teammates' changes
- Prevents conflicts
- Ensures you're building on latest
- Discovers issues early

### DO: Test Your Code Before Pushing

**Always run these before pushing:**
```bash
# 1. Run dev server - does it work?
npm run dev

# 2. Test in browser - no errors?
# Open http://localhost:3000
# Check browser console (F12)

# 3. Run linter - code quality ok?
npm run lint

# 4. Run tests - all passing?
npm run test

# 5. Build - does it compile?
npm run build

# Only push if all pass ✅
git push origin feature/my-branch
```

### DO: Write Descriptive Commit Messages

**Always follow convention:**
```bash
# Good ✅
git commit -m "feat: Add invoice PDF export functionality"
git commit -m "fix: Resolve photo upload timeout on slow networks"
git commit -m "refactor: Simplify budget calculation logic"

# Bad ⛔
git commit -m "changes"
git commit -m "wip"
git commit -m "stuff"
```

### DO: Communicate with Team

**Before working on shared code:**
```
In Slack/Discord:
"Starting work on invoice validation today. Will be touching
src/app/quotehub/invoices/page.tsx and related files."

Response:
"Thanks for heads up! I'm working on photo upload - different
files. We're good."
```

**When you push important changes:**
```
In Slack/Discord:
"Just merged invoice validation to dev. If you're working on
QuoteHub, please pull latest to avoid conflicts."
```

**When you're stuck:**
```
In Slack/Discord:
"Been trying to fix this merge conflict for an hour. Can
someone take a look? Getting conflicts in invoice page."
```

### Common Mistake Recovery Guide

**Committed to wrong branch:**
```bash
# Oh no, I'm on main and just committed!
git log --oneline -1  # Note the commit hash (abc123)

# Create feature branch from current state
git checkout -b feature/my-work

# Go back to main and reset
git checkout main
git reset --hard origin/main

# Your work is safe on feature branch!
git checkout feature/my-work
```

**Accidentally committed .env:**
```bash
# Remove from git but keep locally
git rm --cached .env
git commit -m "chore: Remove .env from git"

# Add to .gitignore if not already there
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: Add .env to .gitignore"

# Push
git push

# Then change all secrets (they're exposed now!)
```

**Pushed broken code:**
```bash
# Quick fix
git checkout feature/my-branch
# ... fix the issue ...
git add .
git commit -m "fix: Resolve compilation error"
git push

# Or revert the broken commit
git revert abc123
git push
```

**Made changes but on wrong branch:**
```bash
# Save changes
git stash

# Switch to correct branch
git checkout feature/correct-branch

# Apply changes
git stash pop

# Now commit on correct branch
git add .
git commit -m "feat: Add feature on correct branch"
```

---

## 10. Communication Protocol

Good communication prevents conflicts and keeps everyone aligned.

### Daily Standup (Async)

Post in team Slack/Discord channel every morning:

**Template:**
```
Daily Update - [Your Name] - [Date]

Yesterday:
- Completed invoice form validation
- Fixed photo upload timeout issue
- Reviewed PR #42

Today:
- Working on invoice PDF export
- Will be touching: src/app/quotehub/invoices/export.ts
- Plan to have PR ready by EOD

Blockers:
- None (or: Need clarification on PDF layout requirements)
```

**Examples:**

**Intern 1:**
```
Daily Update - Sarah - Jan 31, 2026

Yesterday:
- Built photo gallery component
- Added pagination for project list
- Pushed to feature/photo-gallery

Today:
- Adding photo delete functionality
- Files: src/components/PhotoGallery.tsx
- Plan to create PR this afternoon

Blockers:
- None
```

**Intern 2:**
```
Daily Update - Mike - Jan 31, 2026

Yesterday:
- Created invoice API endpoints
- Added validation logic
- Wrote unit tests

Today:
- Working on quote calculation API
- Files: src/app/api/quotes/calculate/route.ts
- May need help with tax calculation logic

Blockers:
- Waiting for clarification on multi-state tax rates
```

**Lead:**
```
Daily Update - Alex - Jan 31, 2026

Yesterday:
- Reviewed 3 PRs (all approved and merged)
- Fixed middleware crash issue
- Deployed to staging environment

Today:
- Implementing AI quote generation
- Code reviews as PRs come in
- Will be available for questions 9-5 PT

Blockers:
- None

Note: Dev branch is stable, safe to pull.
```

### Before Working on a Module

**Always announce what you're working on:**

```
In team chat:
"Starting work on invoice PDF export. Will be modifying:
- src/app/quotehub/invoices/export.ts
- src/components/PDFTemplate.tsx
- src/lib/pdf-utils.ts

Let me know if anyone else is touching these files."
```

**Response from teammate:**
```
"I'm working on invoice emails, different files. You're good to go!"
```

### When Modifying Shared Code

**If you need to modify a file someone else created:**

```
In team chat:
"Hey @Sarah, I need to update PhotoGallery.tsx to add a
filter feature. Are you currently working on that file?
Want to coordinate?"

Response:
"I just finished my work on it yesterday and merged. All
yours! Latest is in dev."
```

### When You're Stuck

**Don't stay stuck for too long. Ask for help!**

**After 30 minutes:**
```
In team chat:
"Quick question: Getting a TypeScript error in invoice
validation. Should 'amount' be string or number type?"

Response:
"Use number. We handle conversion on the API side."
```

**After 1 hour:**
```
In team chat:
"Need help: Photo upload is failing with S3 timeout error.
I've tried increasing timeout and checking CORS. Not sure
what else to try. Can someone take a look?"

Response from lead:
"Jump on a quick call? Screen share and we'll debug together."
```

### Before Creating a PR

**Announce when PR is ready:**

```
In team chat:
"PR ready for review: feature/photo-upload → dev
Adds drag-and-drop photo upload with S3 integration.

PR link: https://github.com/org/repo/pull/42

Please review when you have a chance. No rush, targeting
merge tomorrow."
```

### After Merging to Dev

**Let team know to pull:**

```
In team chat:
"Merged PR #42 (photo upload) to dev. If you're working on
Projects module, please pull latest to avoid conflicts.

Breaking changes: None
New dependencies: aws-sdk
Environment variables needed: AWS_S3_BUCKET (see .env.example)

Let me know if any issues after pulling."
```

### Conflict Coordination

**If you know there might be conflicts:**

```
In team chat:
"@Mike I see we both touched invoice validation logic.
I'm about to merge dev into my branch. Want to quickly
sync so we can coordinate the merge?"

Response:
"Sure, let me push my changes first. Give me 5 min,
then you can merge and I'll handle conflicts on my end."
```

### Emergency Situations

**If you break dev branch:**

```
In team chat:
"⚠️ URGENT: I just merged a PR that breaks the build.
Do NOT pull dev right now. Working on fix."

5 minutes later:
"✅ Fixed. Dev is stable again. Safe to pull."
```

**If you find a critical bug:**

```
In team chat:
"🚨 Found critical bug: Invoice totals are calculating
incorrectly. Already working on fix. Don't merge any
invoice-related PRs until I fix this."

Response from lead:
"Thanks for catching this. Let me know when fix is ready
to review."
```

### Asking Questions

**Good questions:**

```
"What's the expected behavior when a user uploads a file
larger than 10MB? Should we show error or compress it?"

"Should invoice dates use user's timezone or always UTC?"

"Where should I put this validation logic - client side
or API route?"
```

**Before asking, try:**
1. Read existing code for similar patterns
2. Check documentation
3. Google the error message
4. Try debugging for 30 min

**But don't stay stuck for hours!** Ask after 1 hour.

### Code Review Communication

**When requesting review:**
```
In PR:
"@lead Ready for review. I have a question about the S3
upload implementation (see comment on line 42). Want to
make sure I'm using the SDK correctly."

In team chat:
"PR ready for review: #42. Includes a question about S3
implementation. Please review when you have time."
```

**When receiving feedback:**
```
In PR:
"✅ Great catch on the error handling! Fixed.
✅ Added server-side validation as suggested.
❓ Re: useCallback - should that be a separate PR or
include here?"
```

### Weekly Summary

**Every Friday, post a weekly summary:**

```
Weekly Summary - [Your Name] - Week of Jan 27, 2026

Completed:
- Photo upload feature (PR #42) ✅
- Invoice validation (PR #43) ✅
- Fixed 3 bugs (#44, #45, #46) ✅

In Progress:
- Invoice PDF export (70% done)
- Will finish Monday

Next Week:
- Complete PDF export
- Start on quote email notifications
- Help with testing before release

Notes:
- Learned a lot about S3 integration this week
- Getting faster with TypeScript
- Thanks @lead for help with async/await debugging!
```

### Communication Best Practices

**Do:**
- Update daily in standup channel
- Announce when working on shared files
- Ask questions when stuck
- Share knowledge and learnings
- Give heads up before breaking changes
- Respond to messages promptly
- Be friendly and supportive

**Don't:**
- Go silent for days
- Make big changes without telling anyone
- Leave teammates waiting for reviews
- Assume everyone knows what you're working on
- Be afraid to ask questions
- Take feedback personally

### Communication Channels

**Slack/Discord channels:**

**#daily-standups**
- Daily updates
- What you're working on
- Blockers

**#dev-team**
- General development discussion
- Questions and answers
- Coordination

**#code-reviews**
- PR announcements
- Review requests
- Review feedback

**#git-help**
- Git issues
- Merge conflicts
- Command questions

**#deployments**
- Deployment notifications
- Production issues
- Release notes

### Response Time Expectations

**Urgent (within 1 hour):**
- Broken build
- Production issues
- Blocking questions

**High Priority (within 4 hours):**
- PR review requests
- Merge conflict help
- Technical questions

**Normal (within 24 hours):**
- Daily standup updates
- General questions
- Code review feedback

**Low Priority (whenever):**
- Ideas and suggestions
- Non-urgent improvements
- Learning resources

---

## 11. Work Assignment Strategy (Avoid Conflicts)

Strategic work assignment minimizes merge conflicts and maximizes productivity.

### Module Ownership

Divide work by modules to reduce conflicts:

**Intern 1 (Frontend Focus):**
- Projects Module UI
  - `src/app/projects/`
  - `src/components/projects/`
- Dashboard UI
  - `src/app/dashboard/`
  - `src/components/dashboard/`
- Photo Gallery Components
  - `src/components/PhotoGallery.tsx`
  - `src/components/PhotoUpload.tsx`

**Intern 2 (Backend Focus):**
- Financial APIs
  - `src/app/api/financial/`
  - `src/lib/financial-utils.ts`
- QuoteHub APIs
  - `src/app/api/quotes/`
  - `src/app/api/invoices/`
- Database Utilities
  - `src/lib/database/`
  - `src/lib/supabase-utils.ts`

**Lead (Architecture & Complex Features):**
- AI Integration
  - `src/lib/ai/`
  - `src/app/api/ai/`
- Authentication & Security
  - `src/app/api/auth/`
  - `src/middleware.ts`
- Code Reviews
- Architecture Decisions
- Complex Bug Fixes

### File-Level Coordination

**If two people need the same file:**

**Option 1: Sequential Work**
```
In team chat:
Intern 1: "I need to update PhotoGallery.tsx"
Intern 2: "I also need to add a feature to that file"

Solution:
Lead: "Intern 1, do your work first. Create PR by EOD.
Intern 2, work on something else today and do PhotoGallery
tomorrow after Intern 1's PR merges."
```

**Option 2: Split the Work**
```
In team chat:
Intern 1: "I need to add pagination to PhotoGallery"
Intern 2: "I need to add delete functionality"

Lead: "Intern 1, create pagination in a separate component
(PhotoGalleryPagination.tsx). Intern 2, add delete button
to PhotoGalleryItem.tsx. Then Intern 1 will integrate both
in PhotoGallery.tsx."
```

**Option 3: Pair Programming**
```
In team chat:
Lead: "These features are closely related. Intern 1 and 2,
pair program on this. One drives, one navigates. Work on
one branch together."
```

### Feature Independence

**Design features to be independent:**

**Good (independent):**
```
Feature A: Add photo upload button
Files: src/components/PhotoUpload.tsx (new file)

Feature B: Add invoice PDF export
Files: src/lib/pdf-generator.ts (new file)

Result: No conflicts! ✅
```

**Bad (dependent):**
```
Feature A: Add photo upload to project details page
Files: src/app/projects/[id]/page.tsx (modify)

Feature B: Add budget display to project details page
Files: src/app/projects/[id]/page.tsx (modify)

Result: Merge conflicts! ⛔
```

### Vertical Slicing

**Assign complete vertical slices:**

**Good vertical slice:**
```
Feature: Invoice PDF Export

Intern 2 does:
- API route: src/app/api/invoices/pdf/route.ts
- PDF utils: src/lib/pdf-utils.ts
- Database query: src/lib/database/invoices.ts

Intern 1 does:
- UI button: src/components/InvoiceActions.tsx
- Download handler: src/hooks/useInvoicePDF.ts

Lead reviews:
- Both PRs
- Ensures they integrate correctly
```

### Shared Files Strategy

**For files everyone needs to touch:**

**Approach 1: Append-Only**
```typescript
// src/lib/constants.ts
// Everyone can add constants without conflicts

export const INVOICE_STATUS = {
  DRAFT: 'draft',      // Added by Intern 1
  PENDING: 'pending',  // Added by Intern 2
  PAID: 'paid',        // Added by Lead
};

export const PROJECT_TYPES = {
  RESIDENTIAL: 'residential',  // Added by Intern 1
  COMMERCIAL: 'commercial',    // Added by Intern 2
};

// Append-only = fewer conflicts
```

**Approach 2: Lead Owns It**
```
For critical files like:
- src/middleware.ts
- src/lib/auth.ts
- src/app/layout.tsx

Rule: Only lead modifies these files.
Interns request changes via issues.
```

**Approach 3: Lock Before Edit**
```
In team chat:
Intern 1: "Locking src/app/layout.tsx for next hour to
add navigation changes. Don't edit until I'm done."

Intern 1 (1 hour later): "Done with layout.tsx. Pushed
to dev. File unlocked."
```

### Daily Work Planning

**Every morning, lead assigns work:**

```
Monday Morning Plan:

Intern 1:
- Build photo gallery pagination
- Files: src/components/PhotoGalleryPagination.tsx (new)
- Estimated: Full day
- Target: PR by EOD

Intern 2:
- Create invoice calculation API
- Files: src/app/api/invoices/calculate/route.ts (new)
- Estimated: 4 hours
- Target: PR by 2pm

Lead:
- Code reviews
- Fix middleware bug
- Plan AI integration

No overlapping files = no conflicts ✅
```

### Conflict Prevention Checklist

**Before starting work:**
- [ ] Check what teammates are working on (daily standup)
- [ ] Announce what files you'll be modifying
- [ ] Pull latest dev branch
- [ ] Create feature branch from latest dev
- [ ] Start coding

**During work:**
- [ ] Commit frequently (every 30-60 min)
- [ ] Push to your feature branch regularly
- [ ] If you need to touch a teammate's file, coordinate first
- [ ] Merge dev into your branch every few hours

**Before creating PR:**
- [ ] Pull latest dev
- [ ] Merge dev into your branch
- [ ] Resolve any conflicts locally
- [ ] Test everything works
- [ ] Create PR

### Example Work Week

**Week of Jan 27, 2026:**

**Monday:**
- Intern 1: Photo upload UI (Projects module)
- Intern 2: Invoice API (QuoteHub backend)
- Lead: Code reviews, AI planning

**Tuesday:**
- Intern 1: Photo gallery display (Projects module)
- Intern 2: Quote calculation API (QuoteHub backend)
- Lead: Authentication improvements

**Wednesday:**
- Intern 1: Project timeline component (Projects module)
- Intern 2: Financial reporting API (Financial backend)
- Lead: Code reviews, middleware fixes

**Thursday:**
- Intern 1: Dashboard widgets (Dashboard module)
- Intern 2: Budget tracking API (Financial backend)
- Lead: AI quote generation (new feature)

**Friday:**
- Intern 1: Bug fixes and cleanup
- Intern 2: Testing and documentation
- Lead: Code reviews, release prep

**Notice:** Each person works in different areas = minimal conflicts!

---

## 12. GitHub Repository Setup

Configure your repository for optimal team collaboration.

### Protected Branch Rules

**Protect main branch:**

1. Go to GitHub → Settings → Branches
2. Click "Add rule"
3. Branch name pattern: `main`
4. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
   - ✅ Require conversation resolution before merging
   - ✅ Include administrators
   - ✅ Restrict who can push to matching branches (lead only)

**Protect dev branch:**

1. Same steps as above
2. Branch name pattern: `dev`
3. Enable:
   - ✅ Require a pull request before merging
   - ✅ Require approvals: 1
   - ✅ Require status checks to pass before merging
   - ✅ Allow force pushes: NO

### Pull Request Template

Create `.github/pull_request_template.md`:

```markdown
## Summary
<!-- Brief description of what this PR does -->

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation update
- [ ] Configuration change

## Changes Made
<!-- List the main changes in this PR -->
-
-
-

## Related Issues
<!-- Link related issues -->
Closes #
Related to #

## Screenshots
<!-- If UI changes, add before/after screenshots -->

## Testing Completed
- [ ] Tested locally in dev environment
- [ ] Tested in browser (Chrome, Firefox, Safari)
- [ ] Tested on mobile (if applicable)
- [ ] No console errors or warnings
- [ ] Ran `npm run lint` - passed
- [ ] Ran `npm run test` - passed
- [ ] Ran `npm run build` - successful

## Database Changes
<!-- If you modified database schema -->
- [ ] Created migration file
- [ ] Tested migration locally
- [ ] Documented changes

## Environment Variables
<!-- If you added/changed environment variables -->
- [ ] Updated `.env.example`
- [ ] Documented in README or docs

## Deployment Notes
<!-- Any special deployment considerations -->

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed my own code
- [ ] Commented complex logic
- [ ] Updated documentation where needed
- [ ] Added tests for new features
- [ ] All tests pass
- [ ] No new warnings or errors
```

### Issue Templates

Create `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug Report
about: Report a bug or issue
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description
<!-- Clear description of the bug -->

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
<!-- What should happen -->

## Actual Behavior
<!-- What actually happens -->

## Screenshots
<!-- If applicable -->

## Environment
- Browser:
- OS:
- Node version:
- Branch:

## Additional Context
<!-- Any other relevant information -->
```

Create `.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature Request
about: Suggest a new feature
title: '[FEATURE] '
labels: enhancement
assignees: ''
---

## Feature Description
<!-- Clear description of the proposed feature -->

## Use Case
<!-- Who needs this and why? -->

## Proposed Solution
<!-- How should this work? -->

## Alternatives Considered
<!-- What other approaches did you consider? -->

## Additional Context
<!-- Any other relevant information -->
```

### Branch Deletion After Merge

**Enable automatic branch deletion:**

1. Go to GitHub → Settings → General
2. Scroll to "Pull Requests"
3. Enable: ✅ Automatically delete head branches

**This ensures:**
- No stale branches cluttering repo
- Clean branch list
- Forces devs to create new branches for new work

### GitHub Actions CI/CD

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
    branches: [dev, main]
  push:
    branches: [dev, main]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run tests
        run: npm run test

      - name: Build project
        run: npm run build

      - name: Check TypeScript
        run: npx tsc --noEmit
```

**This automatically:**
- Runs on every PR
- Runs linter, tests, build
- Prevents merging broken code
- Shows status in PR

### Required Status Checks

**Make CI required:**

1. Go to Settings → Branches
2. Edit protection rule for `dev`
3. Enable: ✅ Require status checks to pass before merging
4. Select: `test`
5. Save changes

**Now PRs can't merge unless CI passes!**

### Team Access

**Set up team permissions:**

1. Go to Settings → Collaborators and teams
2. Add team members:
   - Lead: Admin access
   - Intern 1: Write access
   - Intern 2: Write access

**Permissions:**
- **Admin (Lead)**: Can merge to main, modify settings
- **Write (Interns)**: Can push to branches, create PRs

### Repository Settings

**Recommended settings:**

**General:**
- ✅ Allow squash merging
- ❌ Allow merge commits (or ✅ if you prefer)
- ❌ Allow rebase merging (can be confusing for beginners)
- ✅ Automatically delete head branches

**Security:**
- ✅ Enable Dependabot alerts
- ✅ Enable Dependabot security updates
- ✅ Enable secret scanning

**Notifications:**
- ✅ Email notifications for mentions
- ✅ Email notifications for PR reviews
- ✅ Web notifications for all activity

---

## 13. Troubleshooting Common Issues

Solutions for problems you'll encounter.

### "Your branch is behind origin/dev"

**Problem:**
```bash
git push
# To github.com:org/repo.git
#  ! [rejected]        feature/my-branch -> feature/my-branch (non-fast-forward)
# error: failed to push some refs
# hint: Updates were rejected because the tip of your current branch is behind
```

**Solution:**
```bash
# Pull latest changes
git pull origin dev

# Or if you want to merge dev into your branch
git fetch origin
git merge origin/dev

# Resolve any conflicts
# Then push
git push origin feature/my-branch
```

### "Merge conflict in file.ts"

**Problem:**
```bash
git merge dev
# Auto-merging src/app/quotehub/invoices/page.tsx
# CONFLICT (content): Merge conflict in src/app/quotehub/invoices/page.tsx
# Automatic merge failed; fix conflicts and then commit the result.
```

**Solution:**
```bash
# 1. Open the conflicted file in VS Code
code src/app/quotehub/invoices/page.tsx

# 2. Look for conflict markers:
# <<<<<<< HEAD
# Your code
# =======
# Their code
# >>>>>>> dev

# 3. Decide which changes to keep
# 4. Remove ALL conflict markers
# 5. Test the code works
npm run dev

# 6. Mark as resolved
git add src/app/quotehub/invoices/page.tsx
git commit -m "merge: Resolve conflict in invoices page"
git push origin feature/my-branch
```

**See Section 5 for detailed conflict resolution guide.**

### "Permission denied (publickey)"

**Problem:**
```bash
git push
# git@github.com: Permission denied (publickey).
# fatal: Could not read from remote repository.
```

**Solution:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"
# Press Enter for all prompts

# Start SSH agent
eval "$(ssh-agent -s)"

# Add your key
ssh-add ~/.ssh/id_ed25519

# Copy public key
cat ~/.ssh/id_ed25519.pub
# Copy the output

# Add to GitHub:
# 1. Go to GitHub → Settings → SSH and GPG keys
# 2. Click "New SSH key"
# 3. Paste your public key
# 4. Click "Add SSH key"

# Test connection
ssh -T git@github.com
# Should say: "Hi username! You've successfully authenticated..."
```

### "I accidentally committed to main"

**Problem:**
```bash
git branch
# * main  # Oh no!

git log --oneline -1
# abc123 feat: My changes  # Just committed to main!
```

**Solution (if you haven't pushed yet):**
```bash
# Create feature branch from current state
git checkout -b feature/my-work

# Go back to main and reset
git checkout main
git reset --hard origin/main

# Your work is safe on feature branch
git checkout feature/my-work
git log --oneline -1
# abc123 feat: My changes  # ✅ Here it is!
```

**Solution (if you already pushed):**
```bash
# Tell the team immediately!
# Lead will need to revert the commit

git revert abc123
git push origin main

# Then create your feature branch
git checkout -b feature/my-work
# Cherry-pick your commit
git cherry-pick abc123
```

### "I need to undo my last commit"

**Problem:**
```bash
git log --oneline -1
# abc123 feat: My changes  # Want to undo this
```

**Solution (keep the changes):**
```bash
# Undo commit but keep changes
git reset --soft HEAD~1

# Your changes are still there
git status
# Shows your files as "Changes to be committed"

# Now you can:
# - Edit more
# - Commit with better message
git commit -m "feat: Better commit message"
```

**Solution (discard the changes):**
```bash
# ⚠️ WARNING: This deletes your work!
git reset --hard HEAD~1

# Changes are GONE. Only do if you're sure!
```

### "I have uncommitted changes but need to switch branches"

**Problem:**
```bash
git checkout dev
# error: Your local changes to the following files would be overwritten by checkout:
#     src/app/page.tsx
# Please commit your changes or stash them before you switch branches.
```

**Solution (save changes temporarily):**
```bash
# Stash your changes
git stash

# Now you can switch branches
git checkout dev
git pull origin dev
git checkout feature/my-branch

# Get your changes back
git stash pop
```

**Solution (commit the changes):**
```bash
# Just commit them
git add .
git commit -m "wip: Work in progress"

# Now you can switch
git checkout dev
```

### "npm install fails"

**Problem:**
```bash
npm install
# npm ERR! code ERESOLVE
# npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution:**
```bash
# Try deleting lock file and node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still failing, try force
npm install --force

# Or use legacy peer deps
npm install --legacy-peer-deps
```

### "Port 3000 already in use"

**Problem:**
```bash
npm run dev
# Error: listen EADDRINUSE: address already in use :::3000
```

**Solution (Windows):**
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F

# Now try again
npm run dev
```

**Solution (Mac/Linux):**
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Now try again
npm run dev
```

**Solution (use different port):**
```bash
# Run on different port
PORT=3001 npm run dev
```

### "Module not found" after pulling

**Problem:**
```bash
git pull origin dev
npm run dev
# Error: Cannot find module '@/components/NewComponent'
```

**Solution:**
```bash
# Someone added new dependencies
# Reinstall
npm install

# Now try again
npm run dev
```

### "Detached HEAD state"

**Problem:**
```bash
git checkout abc123  # Checked out a specific commit
# You are in 'detached HEAD' state...
```

**Solution:**
```bash
# If you made changes you want to keep:
git checkout -b feature/temp-branch

# If you just want to go back to your branch:
git checkout feature/my-branch
```

### "fatal: not a git repository"

**Problem:**
```bash
git status
# fatal: not a git repository (or any of the parent directories): .git
```

**Solution:**
```bash
# You're in the wrong directory
# Navigate to your project:
cd c:\Users\as_ka\OneDrive\Desktop\new

# Now try again
git status
```

### "Everything up-to-date" but changes not pushed

**Problem:**
```bash
git push
# Everything up-to-date
# But my changes aren't on GitHub!
```

**Solution:**
```bash
# Check if you committed
git status
# Shows: Changes not staged for commit

# You forgot to commit!
git add .
git commit -m "feat: My changes"
git push
```

### "Refusing to merge unrelated histories"

**Problem:**
```bash
git merge dev
# fatal: refusing to merge unrelated histories
```

**Solution:**
```bash
# This happens with new repos
# Allow unrelated histories
git merge dev --allow-unrelated-histories

# Resolve any conflicts
# Then commit
```

### ".env variables not loading"

**Problem:**
```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// undefined
```

**Solution:**
```bash
# 1. Make sure file is named correctly
# Must be: .env.local (not .env or env.local)

# 2. Check if .env.local exists
ls -la | grep env

# 3. Restart dev server (required for .env changes)
# Ctrl+C to stop
npm run dev

# 4. For NEXT_PUBLIC_ vars, check spelling
# Must start with NEXT_PUBLIC_ to be available in browser
```

### "Supabase connection failing"

**Problem:**
```bash
npm run dev
# Error: Invalid Supabase URL
```

**Solution:**
```bash
# 1. Check .env.local has correct values
cat .env.local

# 2. Verify URL format
# Should be: https://abcdefgh.supabase.co
# Not: https://abcdefgh.supabase.co/

# 3. Check for trailing spaces
# Open .env.local and remove any spaces

# 4. Restart server
npm run dev
```

---

## 14. VS Code Git Integration

Use VS Code's built-in Git tools for easier workflow.

### Source Control Panel

**Access:**
- Click Source Control icon in left sidebar (branch icon)
- Or: `Ctrl+Shift+G` (Windows/Linux) / `Cmd+Shift+G` (Mac)

**What you see:**
- Changed files
- Staged files
- Commit message box
- Branches dropdown

### Viewing Changes

**In Source Control panel:**

1. Click on a changed file
2. VS Code shows diff view:
   - Left: Old version
   - Right: New version (your changes)
   - Red: Deleted lines
   - Green: Added lines

**Inline changes:**
- Click line numbers to see change indicators
- Green bar: Added lines
- Red triangle: Deleted lines
- Blue bar: Modified lines

### Staging Changes

**Stage individual files:**
1. Hover over file in Source Control panel
2. Click `+` icon
3. File moves to "Staged Changes"

**Stage all files:**
- Click `+` icon next to "Changes" header

**Unstage files:**
- Click `-` icon next to staged file

**Stage specific lines:**
1. Open file
2. Select lines you want to stage
3. Right-click → "Stage Selected Ranges"

### Committing

**In Source Control panel:**

1. Stage your files (click `+`)
2. Type commit message in message box
3. Click `✓` (checkmark) or press `Ctrl+Enter`

**Commit message box accepts:**
```
feat: Add invoice validation

More detailed description here if needed.

- Added validation rules
- Added error messages
```

### Viewing History

**Git Graph (built-in):**
1. Click `...` (More Actions) in Source Control panel
2. Select "View History"
3. See commit timeline

**See file history:**
1. Right-click file in Explorer
2. Select "Open Timeline"
3. See all commits that changed this file

### Branches

**Create new branch:**
1. Click branch name in bottom-left corner
2. Select "Create new branch"
3. Type branch name
4. Press Enter

**Switch branches:**
1. Click branch name in bottom-left corner
2. Select branch to switch to

**Visual:**
```
Bottom-left corner shows:
main  ↻  0↓ 0↑
├─ Branch name
├─ Sync icon
└─ Pull/push indicators
```

### Resolving Conflicts in VS Code

**When conflicts occur:**

1. VS Code highlights conflicted files
2. Open conflicted file
3. See conflict markers with actions:

```typescript
<<<<<<< HEAD (Current Change)
const result = await processInvoice(data);
[Accept Current Change] [Accept Incoming Change] [Accept Both Changes] [Compare Changes]
=======
const output = await handleInvoice(formData);
>>>>>>> dev (Incoming Change)
```

**Click one:**
- **Accept Current Change**: Keep your code
- **Accept Incoming Change**: Keep their code
- **Accept Both Changes**: Keep both (you'll need to edit)
- **Compare Changes**: See side-by-side diff

**After resolving:**
1. Save file
2. Stage file (click `+`)
3. Commit with message: "merge: Resolve conflict in invoice handler"

### GitLens Extension (Highly Recommended)

**Install:**
1. Open Extensions (`Ctrl+Shift+X`)
2. Search "GitLens"
3. Click Install

**Features:**

**Inline blame:**
- See who wrote each line
- When it was written
- Commit message

**File history:**
- Click GitLens icon in sidebar
- See complete file history
- Compare versions

**Line history:**
- Right-click a line
- "Show Line History"
- See all changes to that line

**Commit details:**
- Hover over a line
- See commit message, author, date
- Click to see full commit

### Git Ignore

**Using .gitignore:**

Create `.gitignore` in project root:

```gitignore
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env*.local

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Misc
.vercel
.turbo
```

**VS Code shows ignored files:**
- Grayed out in Explorer
- Not shown in Source Control panel

### Useful VS Code Shortcuts

| Action | Shortcut (Win/Linux) | Shortcut (Mac) |
|--------|----------------------|----------------|
| Open Source Control | `Ctrl+Shift+G` | `Cmd+Shift+G` |
| Commit | `Ctrl+Enter` | `Cmd+Enter` |
| Open Command Palette | `Ctrl+Shift+P` | `Cmd+Shift+P` |
| Stage file | `Ctrl+K Ctrl+S` | `Cmd+K Cmd+S` |
| Open terminal | `Ctrl+`` | `Cmd+`` |

### Git Commands in VS Code

**Command Palette (`Ctrl+Shift+P`):**

Type "Git:" to see all commands:
- Git: Pull
- Git: Push
- Git: Commit
- Git: Create Branch
- Git: Checkout to...
- Git: Merge Branch
- Git: Stash
- Git: And many more!

**You can do almost everything without terminal!**

### Viewing Diffs

**Compare with previous version:**
1. Right-click file
2. "Open Changes"
3. See side-by-side diff

**Compare with specific commit:**
1. Open Timeline (clock icon in sidebar)
2. Click on a commit
3. See file as it was then

**Compare branches:**
1. `Ctrl+Shift+P`
2. "Git: Compare with Branch"
3. Select branch
4. See all differences

### Recommended VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "git.autofetch": true,
  "git.confirmSync": false,
  "git.enableSmartCommit": true,
  "git.postCommitCommand": "push",
  "editor.formatOnSave": true,
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

---

## 15. Emergency Procedures

When things go wrong, follow these procedures.

### Lost Work / Need to Recover

**Scenario: "I deleted my code!"**

```bash
# Git tracks everything. Check reflog:
git reflog

# You'll see:
# abc123 HEAD@{0}: commit: feat: Add feature
# def456 HEAD@{1}: commit: feat: Previous work
# ghi789 HEAD@{2}: checkout: moving to feature/my-branch

# Recover deleted work
git checkout abc123

# If you want to restore it permanently
git checkout -b feature/recovered
git checkout feature/my-branch
git merge feature/recovered
```

**Scenario: "I accidentally reset --hard and lost commits!"**

```bash
# Find the lost commit in reflog
git reflog

# abc123 HEAD@{0}: reset: moving to HEAD~1
# def456 HEAD@{1}: commit: feat: My important work  ← This!

# Recover it
git cherry-pick def456

# Or create branch from it
git checkout -b feature/recovered def456
```

### Accidentally Deleted Important Code

**Scenario: "I deleted a function and committed!"**

```bash
# Find when file was in good state
git log --oneline -- src/lib/my-file.ts

# abc123 feat: Add important function  ← Before deletion
# def456 refactor: Remove old code      ← This deleted it

# Restore file from before deletion
git checkout abc123 -- src/lib/my-file.ts

# Or restore specific lines
git show abc123:src/lib/my-file.ts
# Copy the lines you need
```

**Scenario: "I deleted entire file!"**

```bash
# Find last commit that had the file
git log --all --full-history -- src/lib/deleted-file.ts

# Restore it
git checkout abc123 -- src/lib/deleted-file.ts

# Commit restoration
git add src/lib/deleted-file.ts
git commit -m "fix: Restore accidentally deleted file"
```

### Undo Last Commit (Not Pushed Yet)

**Scenario: "I committed but forgot to add files"**

```bash
# Undo commit, keep changes
git reset --soft HEAD~1

# Add forgotten files
git add forgotten-file.ts

# Recommit
git commit -m "feat: Add feature (complete this time)"
```

**Scenario: "I committed with wrong message"**

```bash
# Change last commit message (if not pushed yet)
git commit --amend -m "feat: Correct commit message"

# If already pushed, just make new commit
# Don't amend pushed commits!
```

**Scenario: "I committed to wrong branch"**

```bash
# Note the commit hash
git log --oneline -1
# abc123 feat: My work

# Create branch with this commit
git checkout -b feature/correct-branch

# Go back to original branch and remove commit
git checkout wrong-branch
git reset --hard HEAD~1
```

### Broken Dev Branch

**Scenario: "I merged bad code and broke dev"**

```bash
# Find the bad merge commit
git log --oneline dev
# abc123 Merge pull request #42  ← This broke it
# def456 feat: Working code      ← Last good commit

# Revert the merge
git revert -m 1 abc123

# Or reset to last good commit (if no one else pulled)
git reset --hard def456
git push --force origin dev  # ⚠️ Only if team coordinated!

# Better: Fix forward
git checkout -b hotfix/fix-broken-build
# ... fix the issue ...
git commit -m "fix: Resolve build break from PR #42"
# Create PR to dev
```

### Accidentally Force Pushed

**Scenario: "I force pushed and deleted teammates' commits"**

```bash
# DON'T PANIC
# Ask teammate to push their commits again

# If they can't, check reflog on their machine
# On teammate's machine:
git reflog
# Find their lost commits
git checkout abc123

# Or if you have their commit hashes:
git cherry-pick abc123 def456 ghi789
git push
```

### Merge Conflict Too Complex

**Scenario: "I have 50 files with conflicts!"**

```bash
# Abort the merge
git merge --abort

# Ask for help
# Coordinate with teammate who created conflicts

# Option 1: Pair program on merge
# Share screen and resolve together

# Option 2: Lead resolves
# Lead creates integration branch
git checkout dev
git pull origin dev
git checkout -b integrate/my-branch-to-dev
git merge feature/my-branch
# Resolve conflicts
# Test
# Create PR
```

### Committed Secrets (.env, API keys)

**Scenario: "I committed .env with production secrets!"**

```bash
# IMMEDIATELY:

# 1. Remove from git
git rm --cached .env
git commit -m "chore: Remove .env from git"

# 2. Add to .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "chore: Add .env to .gitignore"

# 3. Push
git push

# 4. ROTATE ALL SECRETS
# The secrets in that commit are now public!
# - Generate new Supabase keys
# - Generate new API keys
# - Generate new auth secrets
# - Update .env.local with new secrets

# 5. Tell lead immediately
```

**If secrets were pushed to GitHub:**

1. **Delete the repository** (if private and just started)
2. **Contact GitHub support** to purge from cache
3. **Rotate ALL secrets immediately**
4. **Learn from mistake** - never commit secrets!

### Branch Diverged Beyond Repair

**Scenario: "My branch and dev have completely different code"**

```bash
# Option 1: Rebase (advanced)
git checkout feature/my-branch
git rebase dev
# Resolve conflicts step-by-step
# This rewrites history - only if not shared

# Option 2: Create new branch with just your changes
git checkout dev
git pull origin dev
git checkout -b feature/my-branch-v2

# Manually port your changes
# Copy your code from old branch to new

# Option 3: Ask lead for help
# Sometimes best to pair program on integration
```

### Pushed Broken Code to Dev

**Scenario: "My merged PR broke dev build"**

```bash
# URGENT - notify team
# Post in Slack: "⚠️ Dev is broken, working on fix"

# Option 1: Quick fix
git checkout dev
git pull origin dev
git checkout -b hotfix/fix-build
# ... fix the issue ...
git add .
git commit -m "fix: Resolve build break in invoice validation"
git push origin hotfix/fix-build
# Create PR, get quick review, merge

# Option 2: Revert your PR
git checkout dev
git pull origin dev
# Find your merge commit
git log --oneline
# abc123 Merge pull request #42  ← Your PR
git revert -m 1 abc123
git push origin dev
# Post in Slack: "✅ Dev is stable again. Reverted my PR #42."

# Then fix locally and re-PR
```

### Lost Track of Which Branch You're On

**Scenario: "Made changes but don't know what branch I'm on"**

```bash
# Check current branch
git branch --show-current

# See all changes
git status

# If you're on wrong branch:
git stash
git checkout correct-branch
git stash pop
```

### Accidentally Deleted .git Folder

**Scenario: "I deleted .git folder!"**

```bash
# If you have pushed to GitHub recently:
# Re-clone the repository

cd ..
git clone git@github.com:org/repo.git repo-recovered
cd repo-recovered

# Copy your uncommitted work from old directory
# Check what you need:
cd ../old-directory
# Copy any files not in GitHub

# If you never pushed:
# Your local commits are LOST
# This is why you push regularly!
```

### Computer Crashed / Hard Drive Failed

**Scenario: "My computer died with uncommitted work"**

**If you pushed recently:**
```bash
# On new computer:
git clone git@github.com:org/repo.git
cd repo
git checkout feature/my-branch
git pull origin feature/my-branch

# You have everything you pushed ✅
# Lost: Only uncommitted changes since last push
```

**If you never pushed:**
- Uncommitted work is lost
- Last pushed commit is safe
- **Lesson: Push frequently!**

### Emergency Contact

**When to escalate to lead:**

**IMMEDIATE (contact now):**
- Committed secrets/API keys
- Broke production
- Accidentally deleted main branch
- Force pushed to dev/main
- Lost important code and can't recover

**URGENT (within 1 hour):**
- Broke dev build
- Complex merge conflicts (>10 files)
- Accidentally committed huge files (>100MB)
- Unusual git errors you can't solve

**NORMAL (ask when available):**
- General git questions
- How to approach a merge
- Clarification on workflow
- Best practices

**Contact methods:**
1. Slack/Discord DM (fastest)
2. Team channel @mention
3. Phone call (emergencies only)

### Emergency Checklist

When something goes wrong:

- [ ] Stay calm - git can recover almost everything
- [ ] Don't make it worse - stop and assess
- [ ] Check git reflog - your work is likely still there
- [ ] Ask for help - don't struggle for hours
- [ ] Document what happened - learn from it
- [ ] Update team - communicate issues

**Remember: Git is very hard to truly break. Almost everything is recoverable!**

---

## Appendix: Quick Command Reference

### Daily Workflow Commands

```bash
# Start of day
git checkout dev
git pull origin dev
git checkout -b feature/your-feature

# During work
git add .
git commit -m "feat: Your message"
git push origin feature/your-feature

# End of day
git checkout dev
git pull origin dev
git checkout feature/your-feature
git merge dev
git push origin feature/your-feature
```

### Most Used Commands

```bash
git status                    # What's changed?
git log --oneline --graph    # History
git diff                     # See changes
git add .                    # Stage all
git commit -m "message"      # Commit
git push                     # Push
git pull                     # Pull
git checkout branch-name     # Switch branch
git checkout -b new-branch   # Create and switch
git merge dev                # Merge dev into current
git merge --abort            # Cancel merge
```

### Emergency Commands

```bash
git reflog                   # Find lost commits
git stash                    # Save work temporarily
git stash pop                # Restore stashed work
git reset --soft HEAD~1      # Undo last commit (keep changes)
git reset --hard origin/dev  # Match remote exactly
git checkout -- file.ts      # Undo changes to file
git clean -fd                # Delete untracked files
```

---

## Conclusion

This guide covers everything you need for collaborative Git workflow. Key takeaways:

1. **Pull before you start work every day**
2. **Commit frequently (every 30-60 minutes)**
3. **Push regularly (backup your work)**
4. **Write descriptive commit messages**
5. **Communicate with your team**
6. **Test before you push**
7. **Don't be afraid to ask for help**

**Git is a tool - mastering it takes time. Be patient with yourself!**

When in doubt:
- Check `git status`
- Read the error message
- Ask your lead
- Consult this guide

**Happy coding!** 🚀

---

**Document Version:** 1.0
**Last Updated:** January 31, 2026
**Maintained By:** Development Lead
**Questions?** Ask in #git-help Slack channel
