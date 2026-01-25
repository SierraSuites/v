'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'

/**
 * Global Command Palette (Cmd+K / Ctrl+K)
 *
 * Power user feature for quick navigation and actions
 *
 * Install: Already using cmdk (check package.json)
 *
 * Usage: Add <CommandPalette /> to root layout
 */

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: string
  shortcut?: string[]
  action: () => void
  category: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const router = useRouter()

  // Toggle with Cmd+K or Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Close on escape
  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  // Define all available commands
  const commands: CommandItem[] = [
    // Quick Actions
    {
      id: 'create-project',
      label: 'Create New Project',
      description: 'Start a new construction project',
      icon: '🏗️',
      shortcut: ['c', 'p'],
      action: () => {
        router.push('/projects/new')
        setOpen(false)
      },
      category: 'Quick Actions'
    },
    {
      id: 'create-task',
      label: 'Add Task',
      description: 'Create a new task',
      icon: '✅',
      shortcut: ['c', 't'],
      action: () => {
        router.push('/taskflow?create=true')
        setOpen(false)
      },
      category: 'Quick Actions'
    },
    {
      id: 'upload-photos',
      label: 'Upload Photos',
      description: 'Upload photos to FieldSnap',
      icon: '📸',
      shortcut: ['u', 'p'],
      action: () => {
        router.push('/fieldsnap?upload=true')
        setOpen(false)
      },
      category: 'Quick Actions'
    },
    {
      id: 'create-quote',
      label: 'Create Quote',
      description: 'Generate a new quote',
      icon: '💰',
      shortcut: ['c', 'q'],
      action: () => {
        router.push('/quotes/new')
        setOpen(false)
      },
      category: 'Quick Actions'
    },
    {
      id: 'add-contact',
      label: 'Add Contact',
      description: 'Add new contact to CRM',
      icon: '👤',
      action: () => {
        router.push('/crm/contacts?create=true')
        setOpen(false)
      },
      category: 'Quick Actions'
    },
    {
      id: 'generate-report',
      label: 'Generate Report',
      description: 'Create a new report',
      icon: '📊',
      action: () => {
        router.push('/reports/new')
        setOpen(false)
      },
      category: 'Quick Actions'
    },

    // Navigation
    {
      id: 'nav-dashboard',
      label: 'Dashboard',
      description: 'Go to main dashboard',
      icon: '🏠',
      shortcut: ['g', 'd'],
      action: () => {
        router.push('/dashboard')
        setOpen(false)
      },
      category: 'Navigation'
    },
    {
      id: 'nav-projects',
      label: 'Projects',
      description: 'View all projects',
      icon: '🏗️',
      shortcut: ['g', 'p'],
      action: () => {
        router.push('/projects')
        setOpen(false)
      },
      category: 'Navigation'
    },
    {
      id: 'nav-taskflow',
      label: 'TaskFlow',
      description: 'Manage tasks',
      icon: '✅',
      shortcut: ['g', 't'],
      action: () => {
        router.push('/taskflow')
        setOpen(false)
      },
      category: 'Navigation'
    },
    {
      id: 'nav-fieldsnap',
      label: 'FieldSnap',
      description: 'Photo management',
      icon: '📸',
      shortcut: ['g', 'f'],
      action: () => {
        router.push('/fieldsnap')
        setOpen(false)
      },
      category: 'Navigation'
    },
    {
      id: 'nav-quotehub',
      label: 'QuoteHub',
      description: 'Quotes and proposals',
      icon: '💰',
      shortcut: ['g', 'q'],
      action: () => {
        router.push('/quotes')
        setOpen(false)
      },
      category: 'Navigation'
    },
    {
      id: 'nav-reports',
      label: 'ReportCenter',
      description: 'View reports and analytics',
      icon: '📊',
      shortcut: ['g', 'r'],
      action: () => {
        router.push('/reports')
        setOpen(false)
      },
      category: 'Navigation'
    },
    {
      id: 'nav-crm',
      label: 'CRM',
      description: 'Customer relationship management',
      icon: '🤝',
      shortcut: ['g', 'c'],
      action: () => {
        router.push('/crm')
        setOpen(false)
      },
      category: 'Navigation'
    },
    {
      id: 'nav-ai',
      label: 'AI Command Center',
      description: 'AI-powered insights',
      icon: '🤖',
      shortcut: ['g', 'a'],
      action: () => {
        router.push('/ai')
        setOpen(false)
      },
      category: 'Navigation'
    },
    {
      id: 'nav-sustainability',
      label: 'Sustainability Hub',
      description: 'ESG tracking',
      icon: '🌱',
      action: () => {
        router.push('/sustainability')
        setOpen(false)
      },
      category: 'Navigation'
    },
    {
      id: 'nav-teams',
      label: 'Teams',
      description: 'Manage team members',
      icon: '👥',
      action: () => {
        router.push('/teams')
        setOpen(false)
      },
      category: 'Navigation'
    },

    // Settings
    {
      id: 'settings-profile',
      label: 'Profile Settings',
      description: 'Update your profile',
      icon: '⚙️',
      action: () => {
        router.push('/settings/profile')
        setOpen(false)
      },
      category: 'Settings'
    },
    {
      id: 'settings-company',
      label: 'Company Settings',
      description: 'Manage company details',
      icon: '🏢',
      action: () => {
        router.push('/settings/company')
        setOpen(false)
      },
      category: 'Settings'
    },
    {
      id: 'settings-billing',
      label: 'Billing & Plans',
      description: 'Manage subscription',
      icon: '💳',
      action: () => {
        router.push('/settings/billing')
        setOpen(false)
      },
      category: 'Settings'
    },

    // Help
    {
      id: 'help-docs',
      label: 'Documentation',
      description: 'View help docs',
      icon: '📖',
      shortcut: ['?'],
      action: () => {
        window.open('https://docs.sierrasuites.com', '_blank')
        setOpen(false)
      },
      category: 'Help'
    },
    {
      id: 'help-shortcuts',
      label: 'Keyboard Shortcuts',
      description: 'View all shortcuts',
      icon: '⌨️',
      action: () => {
        // Could open a modal with all shortcuts
        alert('Keyboard shortcuts coming soon!')
        setOpen(false)
      },
      category: 'Help'
    },
    {
      id: 'help-support',
      label: 'Contact Support',
      description: 'Get help from our team',
      icon: '💬',
      action: () => {
        router.push('/support')
        setOpen(false)
      },
      category: 'Help'
    }
  ]

  // Group commands by category
  const categories = Array.from(new Set(commands.map((c) => c.category)))

  return (
    <>
      <Command.Dialog
        open={open}
        onOpenChange={setOpen}
        label="Global Command Menu"
        className="fixed inset-0 z-50"
      >
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

        <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl">
          <Command className="bg-white rounded-lg shadow-2xl border overflow-hidden">
            <div className="flex items-center border-b px-4">
              <span className="text-gray-400 mr-2">🔍</span>
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Type a command or search..."
                className="flex-1 py-4 outline-none text-base"
              />
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[400px] overflow-y-auto p-2">
              <Command.Empty className="py-8 text-center text-sm text-gray-500">
                No results found.
              </Command.Empty>

              {categories.map((category) => (
                <Command.Group key={category} heading={category} className="mb-2">
                  <div className="text-xs font-semibold text-gray-500 px-2 py-2">
                    {category}
                  </div>

                  {commands
                    .filter((c) => c.category === category)
                    .map((command) => (
                      <Command.Item
                        key={command.id}
                        onSelect={command.action}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-100 data-[selected=true]:bg-blue-50 data-[selected=true]:text-blue-600 transition-colors"
                      >
                        <span className="text-xl">{command.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{command.label}</div>
                          {command.description && (
                            <div className="text-xs text-gray-500 truncate">
                              {command.description}
                            </div>
                          )}
                        </div>
                        {command.shortcut && (
                          <div className="flex gap-1">
                            {command.shortcut.map((key, i) => (
                              <kbd
                                key={i}
                                className="px-2 py-0.5 text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 rounded"
                              >
                                {key}
                              </kbd>
                            ))}
                          </div>
                        )}
                      </Command.Item>
                    ))}
                </Command.Group>
              ))}
            </Command.List>

            <div className="border-t px-4 py-2 text-xs text-gray-500 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px]">
                    ↑↓
                  </kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px]">
                    ↵
                  </kbd>
                  Select
                </span>
              </div>
              <span>
                Press{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-[10px]">
                  {navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'} K
                </kbd>{' '}
                anytime
              </span>
            </div>
          </Command>
        </div>
      </Command.Dialog>

      {/* Keyboard shortcut hint (optional) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 hidden lg:flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow text-sm text-gray-600"
      >
        <span>Search</span>
        <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-200 rounded text-xs">
          {navigator.platform.toLowerCase().includes('mac') ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </button>
    </>
  )
}

/*
USAGE IN ROOT LAYOUT:

// app/layout.tsx
import { CommandPalette } from '@/components/CommandPalette'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <CommandPalette />
      </body>
    </html>
  )
}

KEYBOARD SHORTCUTS SUMMARY:

Global:
- Cmd/Ctrl + K: Open command palette
- ?: Show keyboard shortcuts
- /: Focus search
- Esc: Close modals

Navigation:
- g → d: Go to Dashboard
- g → p: Go to Projects
- g → t: Go to TaskFlow
- g → f: Go to FieldSnap
- g → q: Go to QuoteHub
- g → r: Go to Reports
- g → c: Go to CRM
- g → a: Go to AI

Create:
- c → p: Create Project
- c → t: Create Task
- c → q: Create Quote
- u → p: Upload Photos
*/
