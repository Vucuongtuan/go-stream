package main

import "testing"

func TestIsAllowedOrigin(t *testing.T) {
	t.Run("matches configured origins", func(t *testing.T) {
		if !isAllowedOrigin("http://localhost:3000", "http://localhost:3000,http://127.0.0.1:3000") {
			t.Fatalf("expected localhost origin to be allowed")
		}
		if !isAllowedOrigin("http://127.0.0.1:3000", "http://localhost:3000,http://127.0.0.1:3000") {
			t.Fatalf("expected 127.0.0.1 origin to be allowed")
		}
	})

	t.Run("rejects unexpected origins", func(t *testing.T) {
		if isAllowedOrigin("https://evil.example", "http://localhost:3000,http://127.0.0.1:3000") {
			t.Fatalf("expected evil origin to be rejected")
		}
	})
}
