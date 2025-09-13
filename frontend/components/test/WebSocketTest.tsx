'use client'

import { useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useConnectionStore } from '@/store/index'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ConnectionStatus } from '@/components/connection/ConnectionStatus'
import { TestTube, Send, Activity } from 'lucide-react'

export function WebSocketTest() {
  const { sendMessage, lastMessage, subscribeToJob, unsubscribeFromJob } = useWebSocket()
  const { status } = useConnectionStore()
  const [testJobId] = useState('test-job-' + Date.now())

  const handlePing = () => {
    sendMessage({
      type: 'ping',
      payload: { timestamp: new Date().toISOString() }
    })
  }

  const handleSubscribe = () => {
    subscribeToJob(testJobId)
  }

  const handleUnsubscribe = () => {
    unsubscribeFromJob(testJobId)
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          WebSocket Connection Test
        </CardTitle>
        <CardDescription>
          Test real-time WebSocket communication with the backend
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <span className="font-medium">Connection Status:</span>
          <ConnectionStatus compact showText />
        </div>

        {/* Test Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button 
            onClick={handlePing}
            disabled={status !== 'connected'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send Ping
          </Button>
          
          <Button 
            onClick={handleSubscribe}
            disabled={status !== 'connected'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Subscribe
          </Button>
          
          <Button 
            onClick={handleUnsubscribe}
            disabled={status !== 'connected'}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Unsubscribe
          </Button>
        </div>

        {/* Test Job Info */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Test Job ID:
            </span>
            <Badge variant="secondary" className="font-mono text-xs">
              {testJobId}
            </Badge>
          </div>
        </div>

        {/* Last Message */}
        {lastMessage && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Last Received Message:</h4>
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="outline">{lastMessage.type}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(lastMessage.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <pre className="text-xs overflow-x-auto text-slate-700 dark:text-slate-300">
                {JSON.stringify(lastMessage.payload, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2">
            Test Instructions:
          </h4>
          <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
            <li>• <strong>Send Ping:</strong> Test basic WebSocket communication</li>
            <li>• <strong>Subscribe:</strong> Subscribe to job updates for the test job ID</li>
            <li>• <strong>Unsubscribe:</strong> Stop receiving updates for the test job</li>
            <li>• Watch the connection status indicator in the bottom right</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}