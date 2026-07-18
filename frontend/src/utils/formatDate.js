export const formatIndianTime = (time) => {
  if (!time) return '—';
  const [hours, minutes = '00'] = String(time).split(':');
  const hour = Number(hours);
  if (Number.isNaN(hour)) return time;
  const period = hour >= 12 ? 'PM' : 'AM';
  const twelveHour = hour % 12 || 12;
  return `${twelveHour}:${minutes} ${period}`;
};

export const getIndianTimeParts = (time) => {
  const [storedHour = '09', minute = '00'] = String(time || '09:00').split(':');
  const hour = Number(storedHour);
  const meridiem = hour >= 12 ? 'PM' : 'AM';
  return { hour: String(hour % 12 || 12), minute, meridiem };
};

export const toIndianStoredTime = (hour, minute, meridiem) => {
  let normalizedHour = Number(hour) % 12;
  if (meridiem === 'PM') normalizedHour += 12;
  return `${String(normalizedHour).padStart(2, '0')}:${String(minute || '00').padStart(2, '0')}`;
};

export const formatIndianDateTime = (date) => {
  if (!date) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

export const toIndianDateTimeInput = (date) => {
  if (!date) return '';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(date)).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};
