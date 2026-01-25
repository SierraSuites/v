"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ToastNotification'

interface Comment {
  id: string
  task_id: string
  user_id: string
  user_name: string
  user_avatar?: string
  content: string
  mentions: string[]
  created_at: string
  updated_at: string
}

interface TaskCommentsPanelProps {
  taskId: string
  taskTitle: string
  onClose: () => void
}

export default function TaskCommentsPanel({ taskId, taskTitle, onClose }: TaskCommentsPanelProps) {
  const toast = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUser()
    loadComments()
    subscribeToComments()
  }, [taskId])

  const loadUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const loadComments = async () => {
    setLoading(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true })

    if (error) {
      toast.error('Failed to load comments')
      console.error(error)
    } else {
      setComments(data || [])
    }

    setLoading(false)
  }

  const subscribeToComments = () => {
    const supabase = createClient()

    const channel = supabase
      .channel(`task_comments:${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        (payload) => {
          setComments(prev => [...prev, payload.new as Comment])
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        (payload) => {
          setComments(prev =>
            prev.map(c => c.id === payload.new.id ? payload.new as Comment : c)
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`
        },
        (payload) => {
          setComments(prev => prev.filter(c => c.id !== payload.old.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newComment.trim() || !user) {
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    // Extract mentions from comment (@username)
    const mentions = (newComment.match(/@(\w+)/g) || []).map(m => m.substring(1))

    const { error } = await supabase
      .from('task_comments')
      .insert({
        task_id: taskId,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email || 'User',
        content: newComment.trim(),
        mentions
      })

    if (error) {
      toast.error('Failed to post comment')
      console.error(error)
    } else {
      setNewComment('')
      toast.success('Comment posted')
    }

    setSubmitting(false)
  }

  const handleDelete = async (commentId: string) => {
    if (!confirm('Delete this comment?')) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('task_comments')
      .delete()
      .eq('id', commentId)

    if (error) {
      toast.error('Failed to delete comment')
      console.error(error)
    } else {
      toast.success('Comment deleted')
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-1" style={{ color: '#1A1A1A' }}>
              Comments
            </h2>
            <p className="text-sm" style={{ color: '#6B7280' }}>
              {taskTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <span className="text-2xl" style={{ color: '#4A4A4A' }}>×</span>
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-gray-200 rounded-full mx-auto" style={{ borderTopColor: '#FF6B6B' }} />
              <p className="mt-2 text-sm" style={{ color: '#6B7280' }}>Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-6xl">💬</span>
              <p className="mt-4 font-semibold" style={{ color: '#1A1A1A' }}>No comments yet</p>
              <p className="text-sm" style={{ color: '#6B7280' }}>Be the first to comment on this task</p>
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                  style={{ backgroundColor: '#FF6B6B' }}
                >
                  {comment.user_name.charAt(0).toUpperCase()}
                </div>

                {/* Comment Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm" style={{ color: '#1A1A1A' }}>
                      {comment.user_name}
                    </span>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>
                      {formatTime(comment.created_at)}
                    </span>
                  </div>
                  <div
                    className="text-sm p-3 rounded-lg"
                    style={{ backgroundColor: '#F8F9FA', color: '#1A1A1A' }}
                  >
                    {comment.content}
                  </div>
                  {user && user.id === comment.user_id && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs mt-1 hover:underline"
                      style={{ color: '#DC2626' }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <form onSubmit={handleSubmit} className="p-6 border-t" style={{ borderColor: '#E0E0E0' }}>
          <div className="flex gap-3">
            {user && (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                style={{ backgroundColor: '#FF6B6B' }}
              >
                {(user.user_metadata?.full_name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment... (Use @username to mention someone)"
                className="w-full p-3 rounded-lg border resize-none focus:outline-none focus:ring-2"
                style={{
                  borderColor: '#E0E0E0',
                  focusRingColor: '#FF6B6B'
                }}
                rows={3}
                disabled={submitting}
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs" style={{ color: '#6B7280' }}>
                  Tip: Use @ to mention team members
                </p>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="px-4 py-2 rounded-lg text-white font-semibold transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: '#FF6B6B' }}
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
