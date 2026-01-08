export function formatDuration(ms: number): string {
  // If ms is negative, the data is corrupted or timestamps are swapped
  if (ms < 0) {
    console.error("Warning: Negative duration detected. Check DB timestamps.");
    return "0m (Time Error)"; 
  }

  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}