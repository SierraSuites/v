"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (message: string, type: ToastType, duration?: number) => void
  removeToast: (id: string) => void
  success: (message: string, duration?: number) => void
  error: (message: string, duration?: number) => void
  warning: (message: string, duration?: number) => void
  info: (message: string, duration?: number) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const addToast = useCallback((message: string, type: ToastType, duration = 5000) => {
    const id = Math.random().toString(36).substring(7)
    const toast: Toast = { id, message, type, duration }

    setToasts(prev => [...prev, toast])

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [removeToast])

  const success = useCallback((message: string, duration?: number) => {
    addToast(message, 'success', duration)
  }, [addToast])

  const error = useCallback((message: string, duration?: number) => {
    addToast(message, 'error', duration)
  }, [addToast])

  const warning = useCallback((message: string, duration?: number) => {
    addToast(message, 'warning', duration)
  }, [addToast])

  const info = useCallback((message: string, duration?: number) => {
    addToast(message, 'info', duration)
  }, [addToast])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  removeToast: (id: string) => void
}

function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: Toast
  onRemove: () => void
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const getToastStyles = () => {
    switch (toast.type) {
      case 'success':
        return { bg: '#E6F9EA', border: '#6BCB77', icon: '✅' }
      case 'error':
        return { bg: '#FEE2E2', border: '#DC2626', icon: '🚨' }
      case 'warning':
        return { bg: '#FEF3C7', border: '#F59E0B', icon: '⚠️' }
      case 'info':
        return { bg: '#E5F4FF', border: '#6A9BFD', icon: 'ℹ️' }
      default:
        return { bg: '#F8F9FA', border: '#E0E0E0', icon: '📢' }
    }
  }

  const styles = getToastStyles()

  return (
    <div
      className="rounded-lg p-4 shadow-lg animate-slide-in-right flex items-start gap-3 min-w-[320px]"
      style={{
        backgroundColor: styles.bg,
        border: `2px solid ${styles.border}`,
        animation: 'slideInRight 0.3s ease-out'
      }}
    >
      <span className="text-xl flex-shrink-0">{styles.icon}</span>
      <p className="flex-1 text-sm font-medium" style={{ color: '#1A1A1A' }}>
        {toast.message}
      </p>
      <button
        onClick={onRemove}
        className="text-xl font-bold hover:opacity-70 transition-opacity flex-shrink-0"
        style={{ color: '#4A4A4A' }}
      >
        ×
      </button>
      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  )
}

// Construction-specific toast presets
export const constructionToasts = {
  taskCreated: (taskTitle: string) => `✅ Task "${taskTitle}" created successfully`,
  taskUpdated: (taskTitle: string) => `📝 Task "${taskTitle}" updated`,
  taskDeleted: (taskTitle: string) => `🗑️ Task "${taskTitle}" deleted`,
  taskCompleted: (taskTitle: string) => `🎉 Task "${taskTitle}" completed!`,
  taskBlocked: (taskTitle: string) => `🚫 Task "${taskTitle}" is blocked`,
  inspectionScheduled: (taskTitle: string) => `🔍 Inspection scheduled for "${taskTitle}"`,
  weatherAlert: (taskTitle: string) => `🌤️ Weather alert for "${taskTitle}"`,
  safetyWarning: (message: string) => `⚠️ Safety Warning: ${message}`,
  permissionDenied: () => `🔒 You don't have permission to perform this action`,
  saveFailed: () => `❌ Failed to save changes. Please try again.`,
  connectionLost: () => `📡 Connection lost. Reconnecting...`,
  connectionRestored: () => `✅ Connection restored`,
}

export default ToastProvider
