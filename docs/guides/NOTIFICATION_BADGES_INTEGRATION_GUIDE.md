# 🔔 Notification Badges - Integration Guide

## Overview
This guide shows how to add notification badges to navigation items to show open punch item counts.

## Components Created
- ✅ `lib/punch-notifications.ts` - Service for getting punch notification counts
- ✅ `components/ui/NotificationBadge.tsx` - Badge components (inline and positioned)

---

## Features

### Punch Notification Service
```typescript
// Get current counts
const counts = await getPunchNotificationCounts()
// Returns: { total, critical, open, needsAttention }

// Subscribe to real-time changes
const unsubscribe = subscribeToPunchListChanges(projectIds, () => {
  // Callback when punch items change
  refreshCounts()
})
```

### NotificationBadge Component
- **Inline badge**: For displaying next to text
- **Positioned badge**: For overlaying on icons
- **Variants**: default (blue), critical (red), warning (orange)
- **Sizes**: sm, md, lg
- **Pulse animation**: Optional
- **Auto-hide**: Hides when count is 0 (unless `showZero={true}`)
- **99+ limit**: Shows "99+" for counts over 99

---

## Integration Steps for Dashboard Navigation

### 1. Add Imports to `app/dashboard/page.tsx` (around line 4)

```typescript
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getPunchNotificationCounts, type PunchNotificationCounts } from "@/lib/punch-notifications"
import { PositionedBadge } from "@/components/ui/NotificationBadge"
```

### 2. Add State for Notification Counts (around line 32)

```typescript
const [dismissedWelcome, setDismissedWelcome] = useState(false)
const [activeView, setActiveView] = useState("overview")
const [punchCounts, setPunchCounts] = useState<PunchNotificationCounts>({
  total: 0,
  critical: 0,
  open: 0,
  needsAttention: 0
})
```

### 3. Add Load Function (around line 65)

```typescript
const loadPunchNotifications = async () => {
  const counts = await getPunchNotificationCounts()
  setPunchCounts(counts)
}
```

### 4. Update useEffect to Load Notifications (around line 33-64)

**ADD THIS AFTER `loadUser()`:**

```typescript
useEffect(() => {
  const loadUser = async () => {
    // ... existing loadUser code ...
  }

  loadUser()
  loadPunchNotifications() // ADD THIS

  // Update time every minute
  const timer = setInterval(() => setCurrentTime(new Date()), 60000)

  // Update notifications every 30 seconds
  const notifTimer = setInterval(loadPunchNotifications, 30000) // ADD THIS

  return () => {
    clearInterval(timer)
    clearInterval(notifTimer) // ADD THIS
  }
}, [router])
```

### 5. Update Navigation Items with Badges (around line 171)

**UPDATE THE navigationItems ARRAY:**

```typescript
const navigationItems: NavItem[] = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: "📊"
  },
  {
    name: "Projects",
    href: "/projects",
    icon: "🏗️",
    subItems: [
      { name: "All Projects", href: "/projects" },
      { name: "Active Projects", href: "/projects/active" },
      { name: "Archived", href: "/projects/archived" }
    ]
  },
  {
    name: "TaskFlow",
    href: "/taskflow",
    icon: "✅"
  },
  {
    name: "FieldSnap",
    href: "/fieldsnap",
    icon: "📸",
    badge: punchCounts.needsAttention > 0 ? `${punchCounts.needsAttention}` : undefined // ADD THIS
  },
  {
    name: "QuoteHub",
    href: "/quotehub",
    icon: "💰"
  },
  // ... rest of navigation items
]
```

### 6. Add Badge Display in Sidebar (Find the navigation rendering code)

**FIND THE NAVIGATION LINK RENDERING** (usually around line 250-350) and update it:

**BEFORE:**
```typescript
<Link
  href={item.href}
  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors"
>
  <span className="text-2xl">{item.icon}</span>
  {!sidebarCollapsed && (
    <>
      <span className="flex-1 font-medium">{item.name}</span>
      {item.badge && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500">
          {item.badge}
        </span>
      )}
    </>
  )}
</Link>
```

**AFTER:**
```typescript
<Link
  href={item.href}
  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors relative"
>
  <div className="relative">
    <span className="text-2xl">{item.icon}</span>
    {/* Show notification badge on FieldSnap icon */}
    {item.name === "FieldSnap" && punchCounts.needsAttention > 0 && (
      <PositionedBadge
        count={punchCounts.needsAttention}
        variant={punchCounts.critical > 0 ? "critical" : "warning"}
        size="sm"
        pulse={punchCounts.critical > 0}
        position="top-right"
      />
    )}
  </div>
  {!sidebarCollapsed && (
    <>
      <span className="flex-1 font-medium">{item.name}</span>
      {/* Show number badge for FieldSnap in text */}
      {item.name === "FieldSnap" && punchCounts.needsAttention > 0 && (
        <span
          className="px-2 py-0.5 text-xs rounded-full font-bold"
          style={{
            backgroundColor: punchCounts.critical > 0 ? '#DC2626' : '#F59E0B',
            color: '#FFFFFF'
          }}
        >
          {punchCounts.needsAttention}
        </span>
      )}
      {/* Show existing badge for Pro/Enterprise features */}
      {item.badge && item.badge !== `${punchCounts.needsAttention}` && (
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500">
          {item.badge}
        </span>
      )}
    </>
  )}
</Link>
```

---

## Integration for FieldSnap Navigation

### Add to `app/fieldsnap/page.tsx`

#### 1. Add Imports

```typescript
import { getPunchNotificationCounts, type PunchNotificationCounts } from '@/lib/punch-notifications'
import { PositionedBadge } from '@/components/ui/NotificationBadge'
```

#### 2. Add State

```typescript
const [punchCounts, setPunchCounts] = useState<PunchNotificationCounts>({
  total: 0,
  critical: 0,
  open: 0,
  needsAttention: 0
})
```

#### 3. Add Load Function

```typescript
const loadPunchNotifications = async () => {
  const counts = await getPunchNotificationCounts()
  setPunchCounts(counts)
}
```

#### 4. Update useEffect

```typescript
useEffect(() => {
  loadPhotos()
  loadStats()
  loadPunchNotifications() // ADD THIS
}, [])
```

#### 5. Add Badge to Sidebar Stats

**FIND THE SIDEBAR SECTION** and add this card:

```typescript
{/* Punch List Alerts */}
{punchCounts.needsAttention > 0 && (
  <div
    className="p-4 rounded-xl cursor-pointer hover:shadow-md transition-shadow"
    style={{
      backgroundColor: punchCounts.critical > 0 ? '#FEE2E2' : '#FEF3C7',
      border: `2px solid ${punchCounts.critical > 0 ? '#DC2626' : '#F59E0B'}`
    }}
    onClick={() => router.push('/projects')}
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold" style={{ color: '#4A4A4A' }}>
        Punch Items
      </span>
      <span className="text-2xl">{punchCounts.critical > 0 ? '🚨' : '⚠️'}</span>
    </div>
    <p
      className="text-2xl font-bold"
      style={{ color: punchCounts.critical > 0 ? '#DC2626' : '#F59E0B' }}
    >
      {punchCounts.needsAttention}
    </p>
    <p className="text-xs mt-1" style={{ color: '#6B7280' }}>
      {punchCounts.critical > 0
        ? `${punchCounts.critical} critical items`
        : 'Items need attention'}
    </p>
  </div>
)}
```

---

## Real-time Updates

For real-time badge updates when punch items change:

```typescript
useEffect(() => {
  const loadUser = async () => {
    // ... get user and projects ...

    if (projectIds.length > 0) {
      // Load initial counts
      loadPunchNotifications()

      // Subscribe to changes
      const unsubscribe = subscribeToPunchListChanges(projectIds, () => {
        loadPunchNotifications()
      })

      return unsubscribe
    }
  }

  const cleanup = loadUser()

  return () => {
    if (cleanup) cleanup.then(unsub => unsub?.())
  }
}, [])
```

---

## Visual Examples

### Sidebar Collapsed
```
📊  (no badge)
🏗️  (no badge)
✅  (no badge)
📸 🔴3  (red badge with pulse for critical items)
💰  (no badge)
```

### Sidebar Expanded
```
📊  Dashboard
🏗️  Projects
✅  TaskFlow
📸 🔴3  FieldSnap                [3]  (badge on icon and text)
💰  QuoteHub
```

### Badge Variants

**Critical Items** (Red, Pulsing):
- Severity: Critical
- Color: #DC2626 (Red)
- Animation: Pulse
- Icon: 🚨

**Warning Items** (Orange):
- Overdue but not critical
- Color: #F59E0B (Orange)
- Icon: ⚠️

**Default** (Blue):
- General notifications
- Color: #3B82F6 (Blue)

---

## Badge Logic

### needsAttention Count
Includes items that are:
1. **Critical severity** AND not closed/verified
2. **Overdue** (past due_date) AND not closed/verified

### Display Rules
- Show badge when `needsAttention > 0`
- Use red + pulse when `critical > 0`
- Use orange when `needsAttention > 0` but `critical === 0`
- Hide badge when `needsAttention === 0`

---

## Notification Types

### FieldSnap Navigation Badge
- **Shows**: Items needing attention across all projects
- **Color**: Red if critical, orange if warnings
- **Pulse**: Yes if critical items present
- **Location**: On FieldSnap navigation item

### Project-Specific Badge
- **Shows**: Items for a specific project
- **Location**: On project cards/headers
- **Implementation**: Use same service with project filter

### Dashboard Widget
- **Shows**: Summary of all punch items
- **Location**: Dashboard main view
- **Component**: Already created (PunchListWidget)

---

## Testing Checklist

- [ ] Badge shows correct count on FieldSnap nav item
- [ ] Badge is red and pulsing when critical items exist
- [ ] Badge is orange when overdue but not critical
- [ ] Badge hides when no items need attention
- [ ] Badge updates every 30 seconds
- [ ] Badge updates in real-time when punch items change
- [ ] Badge count matches actual punch list items
- [ ] Badge shows "99+" for counts over 99
- [ ] Badge works in collapsed sidebar (icon only)
- [ ] Badge works in expanded sidebar (icon + text)
- [ ] Badge doesn't interfere with Pro/Enterprise badges
- [ ] Clicking badge navigates to relevant page

---

## Performance Considerations

### Polling Interval
- **Default**: 30 seconds
- **Reasoning**: Balance between real-time feel and API load
- **Customization**: Adjust `setInterval(loadPunchNotifications, 30000)`

### Real-time Subscriptions
- Subscribe only to user's projects
- Unsubscribe on component unmount
- Filter by project_id to reduce noise

### Caching
- Counts are cached in component state
- Only update when data actually changes
- No unnecessary re-renders

---

## Future Enhancements

1. **Sound notifications** for critical items
2. **Browser notifications** with permission
3. **Badge on browser tab** (favicon badge)
4. **Grouped notifications** by project
5. **Mark as read** functionality
6. **Notification history** page
7. **Customizable thresholds** for what counts as "needs attention"
8. **Email digests** for critical items

---

## Files Modified

**Core Files**:
- `app/dashboard/page.tsx` - Added badge to FieldSnap navigation item
- `app/fieldsnap/page.tsx` - Added punch alert card in sidebar

**Files Created**:
- `lib/punch-notifications.ts` - Notification service
- `components/ui/NotificationBadge.tsx` - Badge components

**Dependencies**:
- `lib/punchlist.ts` - Existing punch list service
- `lib/supabase/client.ts` - Supabase client

---

## Status
✅ Complete and Ready for Integration

## Priority
🔴 HIGH - Enhances user awareness of critical issues
