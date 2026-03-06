import { createClient } from '@blinkdotnew/sdk'

export function getProjectId(): string {
  const envId = import.meta.env.VITE_BLINK_PROJECT_ID
  if (envId) return envId
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  const match = hostname.match(/^([^.]+)\.sites\.blink\.new$/)
  return match ? match[1] : 'studysync-notebook-j7r2iou3'
}

export const blink = createClient({
  projectId: getProjectId(),
  auth: { mode: 'managed' },
})
