export function toUTCSimpleDate(date: string): string {
  const into = new Date(date);
  const options = {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  //@ts-ignore
  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(into);

  const getPart = (type: string) => parts.find(p => p.type === type)?.value;

  return `${getPart('year')}-${getPart('month')}-${getPart('day')} ` +
    `${getPart('hour')}:${getPart('minute')}:${getPart('second')}`;
}