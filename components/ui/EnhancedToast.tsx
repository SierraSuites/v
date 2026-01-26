'use client'

import React from 'react'
import { toast as hotToast } from 'react-hot-toast'

/**
 * Enhanced Toast Notifications
 *
 * Better UX with action buttons, rich content, and smart positioning
 *
 * Install: npm install sonner (optional, for better toasts)
 * Current: Uses existing react-hot-toast with enhancements
 *
 * Usage:
 * import { toast } from '@/components/ui/EnhancedToast'
 *
 * toast.success('Project created!', { action: { label: 'View', onClick: () => {} } })
 * toast.error('Failed to save', { action: { label: 'Retry', onClick: () => {} } })
 */

interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastOptions {
  action?: ToastAction
  duration?: number
  icon?: string | React.ReactNode
  description?: string
}

// Enhanced success toast
export const success = (message: string, options?: ToastOptions) => {
  return hotToast.success(message, {
    duration: options?.duration || 4000,
    icon: options?.icon ? <span>{options.icon}</span> : <span>✅</span>,
    style: {
      background: '#10B981',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '500px'
    },
    ...(options?.action && {
      // @ts-ignore - react-hot-toast supports custom components
      custom: (t) => (
        <div
          className={`bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            t.visible ? 'animate-enter' : 'animate-leave'
          }`}
        >
          <span className="text-2xl">{options.icon || '✅'}</span>
          <div className="flex-1">
            <p className="font-medium">{message}</p>
            {options.description && (
              <p className="text-sm text-green-100 mt-1">{options.description}</p>
            )}
          </div>
          {options.action && (
            <button
              onClick={() => {
                options.action!.onClick()
                hotToast.dismiss(t.id)
              }}
              className="bg-white text-green-600 px-3 py-1 rounded font-medium text-sm hover:bg-green-50 transition-colors"
            >
              {options.action.label}
            </button>
          )}
          <button
            onClick={() => hotToast.dismiss(t.id)}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )
    })
  })
}

// Enhanced error toast
export const error = (message: string, options?: ToastOptions) => {
  return hotToast.error(message, {
    duration: options?.duration || 6000,
    icon: options?.icon ? <span>{options.icon}</span> : <span>❌</span>,
    style: {
      background: '#EF4444',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '500px'
    },
    ...(options?.action && {
      // @ts-ignore
      custom: (t) => (
        <div
          className={`bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            t.visible ? 'animate-enter' : 'animate-leave'
          }`}
        >
          <span className="text-2xl">{options.icon || '❌'}</span>
          <div className="flex-1">
            <p className="font-medium">{message}</p>
            {options.description && (
              <p className="text-sm text-red-100 mt-1">{options.description}</p>
            )}
          </div>
          {options.action && (
            <button
              onClick={() => {
                options.action!.onClick()
                hotToast.dismiss(t.id)
              }}
              className="bg-white text-red-600 px-3 py-1 rounded font-medium text-sm hover:bg-red-50 transition-colors"
            >
              {options.action.label}
            </button>
          )}
          <button
            onClick={() => hotToast.dismiss(t.id)}
            className="text-white/80 hover:text-white"
          >
            ✕
          </button>
        </div>
      )
    })
  })
}

// Enhanced info toast
export const info = (message: string, options?: ToastOptions) => {
  return hotToast(message, {
    duration: options?.duration || 4000,
    icon: options?.icon ? <span>{options.icon}</span> : <span>ℹ️</span>,
    style: {
      background: '#3B82F6',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '500px'
    }
  })
}

// Enhanced warning toast
export const warning = (message: string, options?: ToastOptions) => {
  return hotToast(message, {
    duration: options?.duration || 5000,
    icon: options?.icon ? <span>{options.icon}</span> : <span>⚠️</span>,
    style: {
      background: '#F59E0B',
      color: '#fff',
      padding: '16px',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      maxWidth: '500px'
    }
  })
}

// Loading toast with promise
export const promise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: Error) => string)
  },
  options?: ToastOptions
) => {
  return hotToast.promise(
    promise,
    {
      loading: messages.loading,
      success: (data) =>
        typeof messages.success === 'function' ? messages.success(data) : messages.success,
      error: (error) =>
        typeof messages.error === 'function' ? messages.error(error) : messages.error
    },
    {
      style: {
        padding: '16px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        maxWidth: '500px'
      }
    }
  )
}

// Upload progress toast
export const uploadProgress = (filename: string, progress: number) => {
  const toastId = `upload-${filename}`

  if (progress === 0) {
    return hotToast.loading(`Uploading ${filename}...`, {
      id: toastId,
      style: {
        padding: '16px',
        borderRadius: '8px',
        maxWidth: '400px'
      }
    })
  }

  if (progress === 100) {
    return hotToast.success(`${filename} uploaded!`, {
      id: toastId,
      icon: <span>✅</span>
    })
  }

  return hotToast.loading(
    // @ts-ignore
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span>Uploading {filename}</span>
        <span className="text-sm font-medium">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    </div>,
    {
      id: toastId
    }
  )
}

// Undo toast
export const undo = (
  message: string,
  onUndo: () => void,
  options?: { duration?: number }
) => {
  return hotToast(
    // @ts-ignore
    (t) => (
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          onClick={() => {
            onUndo()
            hotToast.dismiss(t.id)
          }}
          className="bg-blue-600 text-white px-3 py-1 rounded font-medium text-sm hover:bg-blue-700 transition-colors"
        >
          Undo
        </button>
      </div>
    ),
    {
      duration: options?.duration || 5000,
      icon: <span>↩️</span>
    }
  )
}

// Export as default toast object
export const toast = {
  success,
  error,
  info,
  warning,
  promise,
  uploadProgress,
  undo,
  dismiss: hotToast.dismiss,
  loading: hotToast.loading
}

// Usage examples:
/*
// Simple success
toast.success('Project created!')

// Success with action button
toast.success('Project created!', {
  action: {
    label: 'View',
    onClick: () => router.push('/projects/123')
  }
})

// Error with retry
toast.error('Failed to save project', {
  action: {
    label: 'Retry',
    onClick: () => saveProject()
  },
  description: 'Please check your connection'
})

// Promise toast
toast.promise(
  saveProject(),
  {
    loading: 'Saving project...',
    success: 'Project saved!',
    error: 'Failed to save'
  }
)

// Upload progress
toast.uploadProgress('photo.jpg', 45) // 45% complete

// Undo action
toast.undo('Project deleted', () => restoreProject())
*/
