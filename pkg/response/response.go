package response

import (
	"encoding/json"
	"net/http"
)

type ApiResponse struct {
	Status     bool   `json:"status"`
	StatusCode int    `json:"statusCode"`
	Message    string `json:"message,omitempty"`
	Data       any    `json:"data,omitempty"`
}

func write(w http.ResponseWriter, statusCode int, body ApiResponse) {
	data, err := json.Marshal(body)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte(`{"status":false,"statusCode":500,"message":"Internal Server Error"}`))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	w.Write(data)
}

// Success gửi response thành công với data
func Success(w http.ResponseWriter, statusCode int, data any) {
	write(w, statusCode, ApiResponse{
		Status:     true,
		StatusCode: statusCode,
		Data:       data,
	})
}

// Error gửi response lỗi với message
func Error(w http.ResponseWriter, statusCode int, message string) {
	write(w, statusCode, ApiResponse{
		Status:     false,
		StatusCode: statusCode,
		Message:    message,
	})
}
