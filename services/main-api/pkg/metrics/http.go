package metrics

import (
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

// HTTPMetrics exposes a compact Prometheus-compatible view without adding a
// runtime dependency. Route patterns are used instead of raw paths to avoid
// unbounded label cardinality from room/user IDs.
type HTTPMetrics struct {
	mu       sync.Mutex
	inFlight int
	requests map[string]uint64
	duration map[string]time.Duration
}

func NewHTTPMetrics() *HTTPMetrics {
	return &HTTPMetrics{requests: make(map[string]uint64), duration: make(map[string]time.Duration)}
}

func (m *HTTPMetrics) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started := time.Now()
		m.mu.Lock()
		m.inFlight++
		m.mu.Unlock()

		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		route := r.Pattern
		if route == "" {
			route = "unmatched"
		}
		key := fmt.Sprintf("%s|%s|%d", r.Method, route, recorder.status)

		m.mu.Lock()
		m.inFlight--
		m.requests[key]++
		m.duration[key] += time.Since(started)
		m.mu.Unlock()
	})
}

func (m *HTTPMetrics) Handler(w http.ResponseWriter, _ *http.Request) {
	m.mu.Lock()
	defer m.mu.Unlock()
	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	fmt.Fprintln(w, "# HELP gostream_http_requests_in_flight Current HTTP requests being served.")
	fmt.Fprintln(w, "# TYPE gostream_http_requests_in_flight gauge")
	fmt.Fprintf(w, "gostream_http_requests_in_flight %d\n", m.inFlight)
	fmt.Fprintln(w, "# HELP gostream_http_requests_total Completed HTTP requests.")
	fmt.Fprintln(w, "# TYPE gostream_http_requests_total counter")
	fmt.Fprintln(w, "# HELP gostream_http_request_duration_seconds Total HTTP handler time.")
	fmt.Fprintln(w, "# TYPE gostream_http_request_duration_seconds counter")
	keys := make([]string, 0, len(m.requests))
	for key := range m.requests {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	for _, key := range keys {
		parts := strings.Split(key, "|")
		if len(parts) != 3 {
			continue
		}
		fmt.Fprintf(w, "gostream_http_requests_total{method=%q,route=%q,status=%q} %d\n", parts[0], parts[1], parts[2], m.requests[key])
		fmt.Fprintf(w, "gostream_http_request_duration_seconds{method=%q,route=%q,status=%q} %.6f\n", parts[0], parts[1], parts[2], m.duration[key].Seconds())
	}
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (w *statusRecorder) WriteHeader(status int) {
	w.status = status
	w.ResponseWriter.WriteHeader(status)
}
func (w *statusRecorder) Flush() {
	if flusher, ok := w.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}
