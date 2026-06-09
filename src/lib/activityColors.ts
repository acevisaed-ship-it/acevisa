export function getActivityDotColor(actionType: string): string {
  if (actionType === 'panic_detected' || actionType === 'complaint_received') {
    return '#DC2626'
  }
  if (actionType.startsWith('meeting_')) {
    return '#2563EB'
  }
  if (actionType === 'brief_viewed') {
    return '#16A34A'
  }
  if (actionType.startsWith('task_')) {
    return '#EA580C'
  }
  if (actionType.startsWith('profile_update_')) {
    return '#E48328'
  }
  if (actionType === 'counselor_assigned' || actionType === 'counselor_transferred') {
    return '#7C3AED'
  }
  return 'rgba(10, 63, 58, 0.4)'
}
