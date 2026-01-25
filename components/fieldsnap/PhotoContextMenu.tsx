"use client"

import { useState, useRef, useEffect } from 'react'

interface PhotoContextMenuProps {
  children: React.ReactNode
  onCreatePunchItem: () => void
  onViewDetails: () => void
  onShare?: () => void
  onDelete?: () => void
}

export default function PhotoContextMenu({
  children,
  onCreatePunchItem,
  onViewDetails,
  onShare,
  onDelete
}: PhotoContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Calculate position
    const x = e.clientX
    const y = e.clientY

    setPosition({ x, y })
    setIsOpen(true)
  }

  const handleClick = (e: React.MouseEvent) => {
    // Allow left-click to open menu on mobile
    if (e.detail === 2) { // Double-click
      e.preventDefault()
      e.stopPropagation()
      const x = e.clientX
      const y = e.clientY
      setPosition({ x, y })
      setIsOpen(true)
    }
  }

  const handleMenuItemClick = (callback: () => void) => {
    callback()
    setIsOpen(false)
  }

  return (
    <div onContextMenu={handleContextMenu} onClick={handleClick} className="relative">
      {children}

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{ backgroundColor: 'transparent' }}
          />

          {/* Context Menu */}
          <div
            ref={menuRef}
            className="fixed z-50 rounded-lg shadow-2xl overflow-hidden"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              backgroundColor: '#FFFFFF',
              border: '1px solid #E0E0E0',
              minWidth: '220px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
            }}
          >
            {/* Quick Actions Header */}
            <div className="px-4 py-2 border-b" style={{ borderColor: '#E0E0E0', backgroundColor: '#F8F9FA' }}>
              <p className="text-xs font-bold" style={{ color: '#6B7280' }}>QUICK ACTIONS</p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <button
                onClick={() => handleMenuItemClick(onCreatePunchItem)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <span className="text-xl">🚨</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>Create Punch Item</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>Flag issue from this photo</p>
                </div>
              </button>

              <button
                onClick={() => handleMenuItemClick(onViewDetails)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <span className="text-xl">🔍</span>
                <div>
                  <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>View Details</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>See full photo info</p>
                </div>
              </button>

              {onShare && (
                <button
                  onClick={() => handleMenuItemClick(onShare)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                >
                  <span className="text-xl">📤</span>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>Share Photo</p>
                    <p className="text-xs" style={{ color: '#6B7280' }}>Send to team</p>
                  </div>
                </button>
              )}

              {onDelete && (
                <>
                  <div className="border-t my-1" style={{ borderColor: '#E0E0E0' }} />
                  <button
                    onClick={() => handleMenuItemClick(onDelete)}
                    className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-3"
                  >
                    <span className="text-xl">🗑️</span>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#DC2626' }}>Delete Photo</p>
                      <p className="text-xs" style={{ color: '#EF4444' }}>Remove permanently</p>
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* Hint */}
            <div className="px-4 py-2 border-t" style={{ borderColor: '#E0E0E0', backgroundColor: '#F8F9FA' }}>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                💡 Right-click or double-click photos
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
