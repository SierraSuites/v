'use client'

import { useThemeColors } from '@/lib/hooks/useThemeColors'
import { BellIcon } from '@heroicons/react/24/outline'

export default function NotificationsPage() {
  const { colors, darkMode } = useThemeColors()

  const sectionStyle = {
    backgroundColor: colors.bg,
    border: colors.border,
    borderRadius: '0.5rem',
    padding: '1.5rem',
    marginBottom: '1rem',
  }

  const labelStyle = {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: colors.text,
    marginBottom: '0.25rem',
  }

  const descStyle = {
    fontSize: '0.8125rem',
    color: colors.textMuted,
  }

  return (
    <div className="max-w-2xl mx-auto px-10 py-8" style={{ color: colors.text }}>
      <h1 className="text-xl font-bold mb-1" style={{ color: colors.text }}>Notifications</h1>
      <p className="text-sm mb-6" style={{ color: colors.textMuted }}>
        Control which notifications you receive and how they're delivered.
      </p>

      {/* Email Notifications */}
      <h2 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: colors.textMuted }}>
        Email Notifications
      </h2>
      <div style={sectionStyle}>
        {[
          { label: 'Project updates', desc: 'When a project you\'re on is updated' },
          { label: 'Task assignments', desc: 'When a task is assigned to you' },
          { label: 'RFI responses', desc: 'When an RFI you submitted gets a response' },
          { label: 'Change order approvals', desc: 'Status changes on change orders' },
          { label: 'Team invitations', desc: 'When someone is invited to your company' },
        ].map((item, i, arr) => (
          <div
            key={item.label}
            className="flex items-center justify-between"
            style={{
              paddingTop: i === 0 ? 0 : '1rem',
              paddingBottom: i === arr.length - 1 ? 0 : '1rem',
              borderBottom: i < arr.length - 1 ? colors.borderBottom : 'none',
            }}
          >
            <div>
              <div style={labelStyle}>{item.label}</div>
              <div style={descStyle}>{item.desc}</div>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-500" />
          </div>
        ))}
      </div>

      {/* Push Notifications */}
      <h2 className="text-xs font-semibold uppercase tracking-wide mb-3 mt-6" style={{ color: colors.textMuted }}>
        Push Notifications
      </h2>
      <div style={sectionStyle}>
        {[
          { label: 'All activity', desc: 'Notify me about all activity on my projects' },
          { label: 'Mentions only', desc: 'Only notify when I\'m directly mentioned' },
        ].map((item, i, arr) => (
          <div
            key={item.label}
            className="flex items-center justify-between"
            style={{
              paddingTop: i === 0 ? 0 : '1rem',
              paddingBottom: i === arr.length - 1 ? 0 : '1rem',
              borderBottom: i < arr.length - 1 ? colors.borderBottom : 'none',
            }}
          >
            <div>
              <div style={labelStyle}>{item.label}</div>
              <div style={descStyle}>{item.desc}</div>
            </div>
            <input type="radio" name="push" defaultChecked={i === 0} className="w-4 h-4 accent-blue-500" />
          </div>
        ))}
      </div>

      <p className="text-xs mt-4" style={{ color: colors.textMuted }}>
        Full notification configuration coming soon.
      </p>
    </div>
  )
}
