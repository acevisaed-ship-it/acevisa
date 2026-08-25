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
  if (actionType === 'counselor_note' || actionType === 'counselor_update') {
    return '#2083B9'
  }
  if (actionType.startsWith('task_')) {
    return '#EA580C'
  }
  if (actionType.startsWith('profile_update_') || actionType.startsWith('correction_')) {
    return '#E48328'
  }
  if (actionType === 'counselor_assigned' || actionType === 'counselor_transferred') {
    return '#7C3AED'
  }
  if (actionType === 'walk_in') {
    return '#0D9488'
  }
  if (actionType.startsWith('attendance_')) {
    return '#4F46E5'
  }
  return 'rgba(10, 63, 58, 0.4)'
}
