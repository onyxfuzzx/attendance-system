const IST_TIME_ZONE = 'Asia/Kolkata';
const IST_LOCALE = 'en-IN';

export function formatISTDate(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(IST_LOCALE, {
    timeZone: IST_TIME_ZONE,
    ...options
  }).format(date);
}

export function formatISTTime(date: Date, options: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat(IST_LOCALE, {
    timeZone: IST_TIME_ZONE,
    ...options
  }).format(date);
}
