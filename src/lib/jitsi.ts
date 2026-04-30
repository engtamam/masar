// Jitsi Meet Integration
// Generates video call links for booking consultations

import { getConfig } from './config'

/**
 * Generate a Jitsi Meet room link
 * Room name format: platformname-milestoneId-timestamp
 */
export async function generateJitsiLink(milestoneId?: string): Promise<string> {
  const domain = await getConfig('JITSI_DOMAIN') || 'meet.jit.si'
  const platformName = await getConfig('PLATFORM_NAME') || 'incubator'

  // Clean platform name for URL usage
  const cleanName = platformName.toLowerCase().replace(/[^a-z0-9]/g, '')
  const timestamp = Date.now()

  let roomName: string
  if (milestoneId) {
    // Clean milestone ID for URL
    const cleanMilestone = milestoneId.replace(/[^a-z0-9]/g, '')
    roomName = `${cleanName}-${cleanMilestone}-${timestamp}`
  } else {
    roomName = `${cleanName}-meeting-${timestamp}`
  }

  return `https://${domain}/${roomName}`
}
