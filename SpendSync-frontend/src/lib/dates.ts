const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatLocalDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayDateInputValue() {
  return formatLocalDate(new Date());
}

export function parseApiDate(value: string) {
  const match = DATE_ONLY_RE.exec(value);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, month, day, 12, 0, 0, 0);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

export function formatDateInputValue(value?: string | Date | null) {
  if (!value) return "";
  if (value instanceof Date) return formatLocalDate(value);

  const match = DATE_ONLY_RE.exec(value);
  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  return formatLocalDate(new Date(value));
}

export function formatDisplayDate(value: string, locales?: Intl.LocalesArgument) {
  return parseApiDate(value).toLocaleDateString(locales, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function compareApiDatesDesc(left: string, right: string) {
  return parseApiDate(right).getTime() - parseApiDate(left).getTime();
}
