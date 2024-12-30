export const formatUtcOffset = (offsetMinutes: number) => {
  const hours = Math.floor(offsetMinutes / 60)
  const minutes = Math.abs(offsetMinutes % 60)
    .toString()
    .padStart(2, '0')
  return `UTC ${offsetMinutes >= 0 ? '+' : ''}${hours}:${minutes}`
}
