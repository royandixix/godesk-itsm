package sla

import (
	"testing"
	"time"
)

func TestStatus(t *testing.T) {
	start := time.Date(
		2026, 10, 11, 9, 0, 0, 0, time.UTC,
	)

	due := start.Add(time.Hour)
	onTime := start.Add(45 * time.Minute)
	late := start.Add(65 * time.Minute)

	yes, no := true, false

	tests := []struct {
		name      string
		completed *time.Time
		met       *bool
		now       time.Time
		want      string
	}{
		{"On track", nil, nil, start.Add(10 * time.Minute), "ON_TRACK"},
		{"At risk", nil, nil, start.Add(49 * time.Minute), "AT_RISK"},
		{"Breached", nil, nil, due, "BREACHED"},
		{"Met", &onTime, &yes, due.Add(time.Hour), "MET"},
		{"Late completion", &late, &no, due.Add(time.Hour), "BREACHED"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := status(
				due,
				tt.completed,
				tt.met,
				tt.now,
				start,
			)

			if got != tt.want {
				t.Fatalf(
					"status = %s, expected %s",
					got,
					tt.want,
				)
			}
		})
	}
}

func TestPolicyValidation(t *testing.T) {
	tests := []struct {
		response   int
		resolution int
		valid      bool
	}{
		{15, 240, true},
		{60, 480, true},
		{0, 240, false},
		{60, 30, false},
		{1, 525601, false},
	}

	for _, tt := range tests {
		got := validPolicyMinutes(
			tt.response,
			tt.resolution,
		)

		if got != tt.valid {
			t.Fatalf("Validasi kebijakan tidak sesuai")
		}
	}
}
