package util

type TDFObjectSearchAttributes struct {
	Classification []string `json:"attrClassification,omitempty"`
	NeedToKnow     []string `json:"attrNeedToKnow,omitempty"`
	RelTo          []string `json:"attrRelTo,omitempty"`
}
