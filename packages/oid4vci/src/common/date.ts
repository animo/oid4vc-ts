/**
 * Get the time in seconds since epoch for a date.
 * If date is not provided the current time will be used.
 */
export function dateToSeconds(date?: Date) {
  const milliseconds = date?.getTime() ?? Date.now()

  return Math.floor(milliseconds / 1000)
}
