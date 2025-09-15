import React from 'react'
import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationsPage() {
  const { items, unread, loading, markAllRead } = useNotifications()
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold">Notifications {unread > 0 && <span className="ml-2 text-sm text-blue-600">({unread} unread)</span>}</h1>
          <button onClick={markAllRead} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Mark all read</button>
        </div>
        {loading ? (
          <div>Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-gray-600">No notifications yet.</div>
        ) : (
          <div className="space-y-3">
            {items.map((n: any) => (
              <div key={n.id} className={`p-3 rounded border ${n.is_read ? 'bg-white' : 'bg-blue-50 border-blue-200'}`}>
                <div className="text-sm text-gray-800">{renderNotificationText(n)}</div>
                <div className="text-xs text-gray-500">{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function renderNotificationText(n: any) {
  switch (n.type) {
    case 'like': return `Someone liked your story`;
    case 'comment': return `New comment on your story`;
    case 'follow': return `You have a new follower`;
    default: return `Activity update`
  }
}

