"use client"

interface NotificationBadgeProps {
  count: number
  variant?: 'default' | 'critical' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  showZero?: boolean
}

export default function NotificationBadge({
  count,
  variant = 'default',
  size = 'md',
  pulse = false,
  showZero = false
}: NotificationBadgeProps) {
  // Don't show badge if count is 0 and showZero is false
  if (count === 0 && !showZero) {
    return null
  }

  // Limit display to 99+
  const displayCount = count > 99 ? '99+' : count.toString()

  // Size styles
  const sizeStyles = {
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    md: 'min-w-[20px] h-5 text-xs px-1.5',
    lg: 'min-w-[24px] h-6 text-sm px-2'
  }

  // Variant styles
  const variantStyles = {
    default: {
      backgroundColor: '#3B82F6', // Blue
      color: '#FFFFFF'
    },
    critical: {
      backgroundColor: '#DC2626', // Red
      color: '#FFFFFF'
    },
    warning: {
      backgroundColor: '#F59E0B', // Orange
      color: '#FFFFFF'
    }
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <span
        className={`
          ${sizeStyles[size]}
          ${pulse ? 'animate-pulse' : ''}
          inline-flex items-center justify-center
          rounded-full
          font-bold
          leading-none
          transition-all
        `}
        style={variantStyles[variant]}
      >
        {displayCount}
      </span>
    </div>
  )
}

/**
 * Positioned badge (absolute positioning for overlaying on icons)
 */
interface PositionedBadgeProps extends NotificationBadgeProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

export function PositionedBadge({
  count,
  variant = 'default',
  size = 'sm',
  pulse = false,
  showZero = false,
  position = 'top-right'
}: PositionedBadgeProps) {
  if (count === 0 && !showZero) {
    return null
  }

  const positionStyles = {
    'top-right': '-top-1 -right-1',
    'top-left': '-top-1 -left-1',
    'bottom-right': '-bottom-1 -right-1',
    'bottom-left': '-bottom-1 -left-1'
  }

  const displayCount = count > 99 ? '99+' : count.toString()

  const sizeStyles = {
    sm: 'min-w-[16px] h-4 text-[10px] px-1',
    md: 'min-w-[20px] h-5 text-xs px-1.5',
    lg: 'min-w-[24px] h-6 text-sm px-2'
  }

  const variantStyles = {
    default: {
      backgroundColor: '#3B82F6',
      color: '#FFFFFF',
      border: '2px solid #FFFFFF'
    },
    critical: {
      backgroundColor: '#DC2626',
      color: '#FFFFFF',
      border: '2px solid #FFFFFF'
    },
    warning: {
      backgroundColor: '#F59E0B',
      color: '#FFFFFF',
      border: '2px solid #FFFFFF'
    }
  }

  return (
    <span
      className={`
        absolute ${positionStyles[position]}
        ${sizeStyles[size]}
        ${pulse ? 'animate-pulse' : ''}
        inline-flex items-center justify-center
        rounded-full
        font-bold
        leading-none
        transition-all
        shadow-sm
      `}
      style={variantStyles[variant]}
    >
      {displayCount}
    </span>
  )
}
