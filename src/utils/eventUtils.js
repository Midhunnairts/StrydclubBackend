/**
 * Accurately determines if an event has already concluded based on its date, start time, and end time.
 * @param {Object} event - The event document or object containing date, time, and optional endTime.
 * @param {Date} [now=new Date()] - Reference timestamp to compare against.
 * @returns {boolean} True if the event has ended, false otherwise.
 */
const isEventOver = (event, now = new Date()) => {
  if (!event || !event.date) return false;

  const cleanDate = (event.date || '').toString().trim();
  if (!cleanDate) return false;

  // 1. Determine end time string
  let targetTime = event.endTime && event.endTime.trim() ? event.endTime.trim() : '';

  // If no explicit endTime, check if time contains a range (e.g. "7:00 AM - 10:00 AM" or "7:00 AM to 10:00 AM")
  if (!targetTime && event.time) {
    const rangeMatch = event.time.match(/(?:-|to|–)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/i);
    if (rangeMatch) {
      targetTime = rangeMatch[1].trim();
    } else {
      targetTime = event.time.trim();
    }
  }

  const parseTimeParts = (tStr) => {
    if (!tStr) return null;
    const m = tStr.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (!m) return null;
    let hours = parseInt(m[1], 10);
    const minutes = m[2] ? parseInt(m[2], 10) : 0;
    const ampm = m[3] ? m[3].toUpperCase() : null;
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  };

  let d;
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    const [y, m, day] = cleanDate.split('-').map(Number);
    d = new Date(y, m - 1, day);
  } else {
    d = new Date(cleanDate);
  }
  if (isNaN(d.getTime())) return false;

  const timeParts = parseTimeParts(targetTime);
  if (timeParts) {
    d.setHours(timeParts.hours, timeParts.minutes, 0, 0);
    // If only start time was provided without endTime, add a 1-hour completion buffer
    if (!event.endTime || !event.endTime.trim()) {
      d.setHours(d.getHours() + 1);
    }
  } else {
    // If no time was specified, assume end of that calendar day
    d.setHours(23, 59, 59, 999);
  }

  return d < now;
};

module.exports = {
  isEventOver
};
