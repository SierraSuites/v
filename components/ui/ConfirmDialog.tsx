'use client'

import { createContext, useContext, useRef, useState, useCallback } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface ConfirmOptions {
  title?: string
  description: string
  confirmLabel?: string
  destructive?: boolean
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState<ConfirmOptions>({ description: '' })
  const resolveRef = useRef<(value: boolean) => void>(() => {})

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    setOptions(opts)
    setOpen(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const handleConfirm = () => {
    setOpen(false)
    resolveRef.current(true)
  }

  const handleCancel = () => {
    setOpen(false)
    resolveRef.current(false)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={(v) => { if (!v) handleCancel() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options.title ?? 'Are you sure?'}</AlertDialogTitle>
            <AlertDialogDescription>{options.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={options.destructive ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
            >
              {options.confirmLabel ?? 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider')
  return ctx.confirm
}
