"use client"

import { usePermissions } from '@/hooks/usePermissions'
import type { PermissionSet } from '@/lib/permissions'
import { Button, type ButtonProps } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface PermissionButtonProps extends ButtonProps {
  permission: keyof PermissionSet | (keyof PermissionSet)[]
  requireAll?: boolean
  projectId?: string
  deniedMessage?: string
  showTooltip?: boolean
}

/**
 * Button that is automatically disabled when user lacks permission
 */
export function PermissionButton({
  permission,
  requireAll = false,
  projectId,
  deniedMessage = 'You do not have permission to perform this action',
  showTooltip = true,
  disabled,
  children,
  ...props
}: PermissionButtonProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } = usePermissions(projectId)

  // Check permission
  let hasAccess = false
  if (!loading) {
    if (typeof permission === 'string') {
      hasAccess = hasPermission(permission)
    } else {
      hasAccess = requireAll
        ? hasAllPermissions(permission)
        : hasAnyPermission(permission)
    }
  }

  const isDisabled = disabled || loading || !hasAccess

  const button = (
    <Button disabled={isDisabled} {...props}>
      {children}
    </Button>
  )

  // Show tooltip when disabled due to permissions
  if (showTooltip && !hasAccess && !loading && !disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent>
            <p>{deniedMessage}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return button
}

/**
 * Icon button variant
 */
export function PermissionIconButton({
  permission,
  projectId,
  deniedMessage,
  showTooltip = true,
  ...props
}: PermissionButtonProps) {
  return (
    <PermissionButton
      permission={permission}
      projectId={projectId}
      deniedMessage={deniedMessage}
      showTooltip={showTooltip}
      variant="ghost"
      size="icon"
      {...props}
    />
  )
}
