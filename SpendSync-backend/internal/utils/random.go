package utils

import (
	"crypto/rand"
	"encoding/base64"
)

func SecureToken(byteLength int) (string, error) {
	if byteLength < 32 {
		byteLength = 32
	}
	buf := make([]byte, byteLength)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
