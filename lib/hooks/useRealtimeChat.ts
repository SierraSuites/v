// Hook for real-time chat functionality using Supabase Realtime
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export interface ChatMessage {
  id: string
  channel_id: string
  user_id: string
  content: string
  message_type: 'text' | 'file' | 'system' | 'mention'
  parent_message_id?: string | null
  file_url?: string | null
  file_name?: string | null
  file_size?: number | null
  file_type?: string | null
  mentioned_users?: string[] | null
  edited_at?: string | null
  created_at: string
  user?: {
    id: string
    profiles: {
      full_name: string
      avatar_url?: string
    }[]
  }
  message_reactions?: {
    id: string
    emoji: string
    user_id: string
  }[]
}

export interface Channel {
  id: string
  name: string
  description?: string
  channel_type: 'public' | 'private' | 'direct' | 'project'
  project_id?: string | null
  created_at: string
  updated_at: string
  unreadCount?: number
}

export function useRealtimeChat(channelId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()
  let realtimeChannel: RealtimeChannel | null = null

  // Fetch initial messages
  const fetchMessages = useCallback(async () => {
    if (!channelId) {
      setMessages([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/chat/messages?channelId=${channelId}`)
      const data = await response.json()

      if (response.ok) {
        setMessages(data.messages || [])
        setError(null)
      } else {
        setError(data.error || 'Failed to load messages')
      }
    } catch (err) {
      setError('Failed to load messages')
      console.error('Error fetching messages:', err)
    } finally {
      setLoading(false)
    }
  }, [channelId])

  // Send a new message
  const sendMessage = useCallback(
    async (
      content: string,
      options?: {
        parentMessageId?: string
        mentionedUsers?: string[]
        fileUrl?: string
        fileName?: string
        fileSize?: number
        fileType?: string
      }
    ) => {
      if (!channelId || !content.trim()) return

      try {
        const response = await fetch('/api/chat/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId,
            content,
            ...options,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to send message')
        }

        return data.data
      } catch (err: any) {
        console.error('Error sending message:', err)
        throw err
      }
    },
    [channelId]
  )

  // Subscribe to real-time updates
  useEffect(() => {
    if (!channelId) return

    fetchMessages()

    // Subscribe to new messages
    realtimeChannel = supabase
      .channel(`chat:${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the full message with user data
          const { data: newMessage } = await supabase
            .from('chat_messages')
            .select(
              `
              id,
              content,
              message_type,
              parent_message_id,
              file_url,
              file_name,
              file_size,
              file_type,
              mentioned_users,
              edited_at,
              created_at,
              user:user_id (
                id,
                profiles (
                  full_name,
                  avatar_url
                )
              ),
              message_reactions (
                id,
                emoji,
                user_id
              )
            `
            )
            .eq('id', payload.new.id)
            .single()

          if (newMessage) {
            setMessages((prev) => [...prev, newMessage as ChatMessage])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          // Fetch the updated message with user data
          const { data: updatedMessage } = await supabase
            .from('chat_messages')
            .select(
              `
              id,
              content,
              message_type,
              parent_message_id,
              file_url,
              file_name,
              file_size,
              file_type,
              mentioned_users,
              edited_at,
              created_at,
              user:user_id (
                id,
                profiles (
                  full_name,
                  avatar_url
                )
              ),
              message_reactions (
                id,
                emoji,
                user_id
              )
            `
            )
            .eq('id', payload.new.id)
            .single()

          if (updatedMessage) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === updatedMessage.id
                  ? (updatedMessage as ChatMessage)
                  : msg
              )
            )
          }
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [channelId, fetchMessages])

  return {
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
  }
}
