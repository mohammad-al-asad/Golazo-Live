/**
 * Date utility helper functions.
 */

/**
 * Returns a YYYY-MM-DD date string in the local timezone.
 * @param {Date} date The date object to format (defaults to now)
 * @returns {string} The formatted YYYY-MM-DD string
 */
export const getLocalDateString = (date = new Date()) => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().slice(0, 10);
};

/**
 * Parses a YYYY-MM-DD date string as a local Date object.
 * @param {string} dateStr The YYYY-MM-DD string to parse
 * @returns {Date} The Date object in local time
 */
export const parseLocalDate = (dateStr) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};
