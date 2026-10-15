// Package errtypes contains custom error types
package errtypes

import (
	"fmt"
	"strings"
)

const (
	UnknownOWNKeyErrMsg = "unknown own key"
	InvalidModelNameErrMsg = "invalid model name"
)

// TODO: This should have a structured response from the API
type UnknownOWNKey struct {
	Key string
}

func (e *UnknownOWNKey) Error() string {
	return fmt.Sprintf("unauthorized: %s %q", UnknownOWNKeyErrMsg, strings.TrimSpace(e.Key))
}
