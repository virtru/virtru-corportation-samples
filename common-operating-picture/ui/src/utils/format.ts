export const formatDateTime = (dateString: string) => {
  // Parse the date string into a Date object
  const date = new Date(dateString);

  // Format the date part
  const readableDate = date.toLocaleDateString('en-US', {
    day: '2-digit', // "16"
    month: 'short', // "Feb"
    year: 'numeric', // "2024"
  }); // Convert the month to uppercase to match military style

  // Format the time part
  const readableTime = date.toLocaleTimeString('en-US', {
    hour: '2-digit', // "00"
    minute: '2-digit', // "00"
    hour12: false, // Use 24-hour time without AM/PM
  });

  // Combine date and time for the final output, e.g., "16 FEB 2024 00:00"
  return `${readableDate} ${readableTime}`;
};
