import { io, type Socket } from 'socket.io-client'

export const ContentEvent = {
  ContentCreated: 'content:created',
  ContentUpdated: 'content:updated',
  ContentDeleted: 'content:deleted',
  AiDraftGenerated: 'ai:draft_generated',
  ReviewStateChanged: 'review:state_changed',
} as const

let socketInstance: Socket | null = null

export function getSocket(): Socket {
  if (!socketInstance) {
    const baseUrl =
      (import.meta.env.VITE_WS_URL as string | undefined) ??
      (import.meta.env.VITE_API_URL as string | undefined) ??
      'http://localhost:4000'
    socketInstance = io(baseUrl, { transports: ['websocket'] })
  }

  return socketInstance
}

export function disconnectSocket() {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}
