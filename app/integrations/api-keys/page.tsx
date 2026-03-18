'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

// ============================================
// TYPES
// ============================================

interface ApiKey {
  id: string
  key_name: string
  api_key: string
  description?: string | null
  scopes: string[]
  allowed_ips?: string[] | null
  rate_limit_per_hour: number
  rate_limit_per_day: number
  last_used_at?: string | null
  total_requests: number
  failed_requests: number
  is_active: boolean
  expires_at?: string | null
  created_at: string
  revoked_at?: string | null
  creator?: {
    id: string
    profiles: {
      full_name: string
    }[]
  }[]
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newKeyData, setNewKeyData] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    keyName: '',
    description: '',
    scopes: [] as string[],
    rateLimitPerHour: 1000,
    rateLimitPerDay: 10000
  })

  const availableScopes = [
    'read:projects',
    'write:projects',
    'read:invoices',
    'write:invoices',
    'read:quotes',
    'write:quotes',
    'read:reports',
    'write:reports',
    'read:contacts',
    'write:contacts',
    'read:tasks',
    'write:tasks'
  ]

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/integrations/api-keys')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch API keys')
      }

      setApiKeys(data.apiKeys || [])
    } catch (error: any) {
      console.error('Error fetching API keys:', error)
      toast.error('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateKey = async () => {
    try {
      if (!formData.keyName || formData.scopes.length === 0) {
        toast.error('Please provide a name and select at least one scope')
        return
      }

      const response = await fetch('/api/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create API key')
      }

      setNewKeyData(JSON.stringify({
        api_key: data.apiKey.api_key,
        api_secret: data.apiKey.api_secret
      }, null, 2))

      toast.success('API key created successfully')
      fetchApiKeys()

      // Reset form
      setFormData({
        keyName: '',
        description: '',
        scopes: [],
        rateLimitPerHour: 1000,
        rateLimitPerDay: 10000
      })
    } catch (error: any) {
      console.error('Error creating API key:', error)
      toast.error(error.message || 'Failed to create API key')
    }
  }

  const toggleScope = (scope: string) => {
    setFormData(prev => ({
      ...prev,
      scopes: prev.scopes.includes(scope)
        ? prev.scopes.filter(s => s !== scope)
        : [...prev.scopes, scope]
    }))
  }

  const revokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch(`/api/integrations/api-keys/${keyId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to revoke API key')
      }

      toast.success('API key revoked successfully')
      fetchApiKeys()
    } catch (error: any) {
      console.error('Error revoking API key:', error)
      toast.error('Failed to revoke API key')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">API Keys</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage API keys for third-party integrations
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create API Key
            </button>
          </div>
        </div>

        {/* API Keys List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No API keys</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating an API key.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      API Key
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scopes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {apiKeys.map((key) => (
                    <tr key={key.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{key.key_name}</div>
                        {key.description && (
                          <div className="text-sm text-gray-500">{key.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <code className="text-sm font-mono text-gray-600">{key.api_key}</code>
                          <button
                            onClick={() => copyToClipboard(key.api_key)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {key.scopes.slice(0, 2).map(scope => (
                            <span key={scope} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              {scope}
                            </span>
                          ))}
                          {key.scopes.length > 2 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              +{key.scopes.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{key.total_requests.toLocaleString()} requests</div>
                        {key.last_used_at && (
                          <div className="text-xs text-gray-500">
                            Last used: {new Date(key.last_used_at).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {key.revoked_at ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Revoked
                          </span>
                        ) : key.is_active ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {!key.revoked_at && (
                          <button
                            onClick={() => revokeKey(key.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create API Key Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Create API Key</h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false)
                      setNewKeyData(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {newKeyData ? (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Save these credentials now
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>The API secret will not be shown again. Make sure to copy and save it securely.</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        API Credentials
                      </label>
                      <pre className="bg-gray-50 border border-gray-200 rounded-md p-4 text-sm font-mono overflow-x-auto">
                        {newKeyData}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(newKeyData)}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        Copy to clipboard
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        setShowCreateModal(false)
                        setNewKeyData(null)
                      }}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key Name <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.keyName}
                        onChange={(e) => setFormData({ ...formData, keyName: e.target.value })}
                        placeholder="e.g., Production API Key"
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Scopes <span className="text-red-600">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {availableScopes.map(scope => (
                          <label key={scope} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.scopes.includes(scope)}
                              onChange={() => toggleScope(scope)}
                              className="h-4 w-4 border-gray-300 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">{scope}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rate Limit (per hour)
                        </label>
                        <input
                          type="number"
                          value={formData.rateLimitPerHour}
                          onChange={(e) => setFormData({ ...formData, rateLimitPerHour: parseInt(e.target.value) || 0 })}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rate Limit (per day)
                        </label>
                        <input
                          type="number"
                          value={formData.rateLimitPerDay}
                          onChange={(e) => setFormData({ ...formData, rateLimitPerDay: parseInt(e.target.value) || 0 })}
                          className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        onClick={() => setShowCreateModal(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreateKey}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Create API Key
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
