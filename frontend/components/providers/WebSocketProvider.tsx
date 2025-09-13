'use client'

import { useEffect } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { ConnectionStatus } from '@/components/connection/ConnectionStatus'

interface WebSocketProviderProps {
  children: React.ReactNode
  showConnectionStatus?: boolean
}

export function WebSocketProvider({ 
  children, 
  showConnectionStatus = true 
}: WebSocketProviderProps) {
  // Initialize WebSocket connection
  const webSocket = useWebSocket({
    autoConnect: true,
    maxReconnectAttempts: 10,
    reconnectInterval: 1000,
    maxReconnectInterval: 30000
  })

  useEffect(() => {
    // WebSocket is automatically connected via the hook
    console.log('WebSocket provider initialized')
  }, [])

  return (
    <>
      {children}
      
      {/* Global connection status indicator */}
      {showConnectionStatus && (
        <div className="fixed bottom-4 right-4 z-50">
          <ConnectionStatus compact showText />
        </div>
      )}
    </>
  )
}