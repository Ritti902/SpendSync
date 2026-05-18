package validators

import (
	"errors"
	"fmt"
	"strings"

	"github.com/go-playground/validator/v10"
)

type Validator struct {
	validate *validator.Validate
}

func New() *Validator {
	v := validator.New()
	_ = v.RegisterValidation("month", func(fl validator.FieldLevel) bool {
		value := fl.Field().String()
		if len(value) != 7 || value[4] != '-' {
			return false
		}
		month := value[5:]
		return month >= "01" && month <= "12"
	})
	return &Validator{validate: v}
}

func (v *Validator) Struct(value any) error {
	err := v.validate.Struct(value)
	if err == nil {
		return nil
	}
	var validationErrs validator.ValidationErrors
	if !errors.As(err, &validationErrs) {
		return err
	}
	fields := make(map[string]string, len(validationErrs))
	for _, fieldErr := range validationErrs {
		name := strings.ToLower(fieldErr.Field()[:1]) + fieldErr.Field()[1:]
		fields[name] = fmt.Sprintf("failed %s validation", fieldErr.Tag())
	}
	return ValidationError{Fields: fields}
}

type ValidationError struct {
	Fields map[string]string
}

func (e ValidationError) Error() string {
	return "validation failed"
}
