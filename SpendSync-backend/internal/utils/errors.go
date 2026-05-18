package utils

import "fmt"

type AppError struct {
	Status  int    `json:"-"`
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

func (e *AppError) Error() string {
	if e == nil {
		return ""
	}
	return e.Message
}

func NewAppError(status int, code, message string, details any) *AppError {
	return &AppError{Status: status, Code: code, Message: message, Details: details}
}

func BadRequest(message string, details any) *AppError {
	return NewAppError(400, "BAD_REQUEST", message, details)
}

func Unauthorized(message string) *AppError {
	return NewAppError(401, "UNAUTHORIZED", message, nil)
}

func Forbidden(message string) *AppError {
	return NewAppError(403, "FORBIDDEN", message, nil)
}

func NotFound(resource string) *AppError {
	return NewAppError(404, "NOT_FOUND", fmt.Sprintf("%s not found", resource), nil)
}

func Conflict(message string) *AppError {
	return NewAppError(409, "CONFLICT", message, nil)
}

func Internal(message string) *AppError {
	return NewAppError(500, "INTERNAL_ERROR", message, nil)
}
