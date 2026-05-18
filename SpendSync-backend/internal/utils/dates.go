package utils

import (
	"time"
)

func ParseTime(raw string) (time.Time, error) {
	if raw == "" {
		return time.Time{}, nil
	}
	if t, err := time.Parse(time.RFC3339, raw); err == nil {
		return t.UTC(), nil
	}
	if t, err := time.Parse("2006-01-02", raw); err == nil {
		return t.UTC(), nil
	}
	return time.Parse(time.RFC3339Nano, raw)
}

func MonthRange(year int, month time.Month) (time.Time, time.Time) {
	start := time.Date(year, month, 1, 0, 0, 0, 0, time.UTC)
	return start, start.AddDate(0, 1, 0)
}

func CurrentMonthRange() (time.Time, time.Time) {
	now := time.Now().UTC()
	return MonthRange(now.Year(), now.Month())
}

func WeekRange(t time.Time) (time.Time, time.Time) {
	utc := t.UTC()
	weekday := int(utc.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	start := time.Date(utc.Year(), utc.Month(), utc.Day()-weekday+1, 0, 0, 0, 0, time.UTC)
	return start, start.AddDate(0, 0, 7)
}

func YearRange(year int) (time.Time, time.Time) {
	start := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC)
	return start, start.AddDate(1, 0, 0)
}
