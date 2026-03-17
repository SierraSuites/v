'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AppShell from '@/components/dashboard/AppShell'
import { useRealtimeChat } from '@/lib/hooks/useRealtimeChat'
import { usePresence } from '@/lib/hooks/usePresence'
import {
  PaperAirplaneIcon,
  PlusIcon,
  HashtagIcon,
  UserGroupIcon,
  BellIcon,
} from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'

interface Channel {
  id: string
  name: string
  description?: string
  channel_type: string
  unreadCount?: number
}

export default function ChatPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [channels, setChannels] = useState<Channel[]>([])
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, loading: messagesLoading } = useRealtimeChat(selectedChannel)
  const { presence } = usePresence()

  // Load user and channels
  useEffect(() => {
    const loadUser = async () => {
      const supabase = createClient()
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession()

      if (error || !session) {
        router.push('/login')
        return
      }

      setUser(session.user)
      setLoading(false)

      // Fetch channels
      const response = await fetch('/api/chat/channels')
      const data = await response.json()
      if (response.ok) {
        setChannels(data.channels || [])
        // Select first channel by default
        if (data.channels && data.channels.length > 0) {
          setSelectedChannel(data.channels[0].id)
        }
      }
    }

    loadUser()
  }, [router])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Handle send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!messageInput.trim() || !selectedChannel) return

    try {
      await sendMessage(messageInput)
      setMessageInput('')
    } catch (err) {
      console.error('Failed to send message:', err)
    }
  }

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  // Get online users count
  const onlineCount = presence.filter((p) => p.status === 'online').length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const currentChannel = channels.find((c) => c.id === selectedChannel)

  return (
    <AppShell user={user}>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Channels List */}
        <div className="w-64 bg-gray-900 text-white flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold">Team Chat</h2>
              <button
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="New Channel"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
              {onlineCount} online
            </div>
          </div>

          {/* Channels */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-400 px-2 py-1 mb-1">
                CHANNELS
              </div>
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                  className={`w-full flex items-center justify-between px-2 py-2 rounded-lg mb-1 transition-colors ${
                    selectedChannel === channel.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center">
                    <HashtagIcon className="h-4 w-4 mr-2" />
                    <span className="text-sm">{channel.name}</span>
                  </div>
                  {channel.unreadCount && channel.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {channel.unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Online Users */}
          <div className="p-4 border-t border-gray-700">
            <div className="text-xs font-semibold text-gray-400 mb-2">
              ONLINE NOW
            </div>
            <div className="space-y-2">
              {presence
                .filter((p) => p.status === 'online')
                .slice(0, 5)
                .map((p) => (
                  <div key={p.userId} className="flex items-center text-sm">
                    <div className="w-8 h-8 bg-gray-700 rounded-full mr-2 flex items-center justify-center">
                      {p.avatarUrl ? (
                        <img
                          src={p.avatarUrl}
                          alt={p.fullName}
                          className="w-full h-full rounded-full"
                        />
                      ) : (
                        <span className="text-xs font-semibold">
                          {p.fullName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-300">{p.fullName}</span>
                    <div className="w-2 h-2 bg-green-500 rounded-full ml-auto"></div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col bg-white">
          {/* Chat Header */}
          <div className="h-16 border-b border-gray-200 px-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                #{currentChannel?.name}
              </h3>
              {currentChannel?.description && (
                <p className="text-sm text-gray-500">
                  {currentChannel.description}
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <UserGroupIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <BellIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <HashtagIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No messages yet</p>
                  <p className="text-sm">Be the first to say something!</p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="flex space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                    {message.user?.profiles?.[0]?.avatar_url ? (
                      <img
                        src={message.user.profiles[0].avatar_url}
                        alt={message.user.profiles[0]?.full_name || 'User'}
                        className="w-full h-full rounded-full"
                      />
                    ) : (
                      <span className="text-sm font-semibold text-gray-600">
                        {message.user?.profiles?.[0]?.full_name
                          ?.charAt(0)
                          .toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline space-x-2">
                      <span className="font-semibold text-gray-900">
                        {message.user?.profiles?.[0]?.full_name || 'Unknown User'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatTime(message.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1">{message.content}</p>
                    {message.edited_at && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder={`Message #${currentChannel?.name || 'channel'}`}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                disabled={!messageInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
