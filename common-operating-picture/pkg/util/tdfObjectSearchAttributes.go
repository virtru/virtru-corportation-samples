package util

import "encoding/json"

// StringOrArray is a custom type that can unmarshal from either a JSON string or a JSON array of strings
type StringOrArray []string

func (s *StringOrArray) UnmarshalJSON(data []byte) error {
	// Try to unmarshal as a string first
	var str string
	if err := json.Unmarshal(data, &str); err == nil {
		if str != "" {
			*s = []string{str}
		} else {
			*s = []string{}
		}
		return nil
	}

	// If that fails, try to unmarshal as an array of strings
	var arr []string
	if err := json.Unmarshal(data, &arr); err != nil {
		return err
	}
	*s = arr
	return nil
}

type TDFObjectSearchAttributes struct {
	Classification StringOrArray `json:"attrClassification,omitempty"`
	NeedToKnow     StringOrArray `json:"attrNeedToKnow,omitempty"`
	RelTo          StringOrArray `json:"attrRelTo,omitempty"`
}
