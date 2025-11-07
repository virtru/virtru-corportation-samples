package util

import (
	"errors"
)

var ErrTrimTDFVisibility = errors.New("error trimming TDF visibility")

// TODO: add support for entitlement rules
func TrimTDFVisibility(searchAttributes TDFObjectSearchAttributes, entitlements map[string]bool) (bool, error) {
	// if there are classifications (HIERARCHY), check if the entity has entitlements to view
	if len(searchAttributes.Classification) > 0 {
		visible := true

		for _, classification := range searchAttributes.Classification {
			if !entitlements[classification] {
				visible = false
				break
			}
		}

		if !visible {
			return false, nil
		}
	}

	// if there are need-to-knows (ALL_OF), check if the entity has entitlements to view
	if len(searchAttributes.NeedToKnow) > 0 {
		visible := true

		for _, classification := range searchAttributes.NeedToKnow {
			if !entitlements[classification] {
				visible = false
				break
			}
		}

		if !visible {
			return false, nil
		}
	}

	// if there are rel-tos (ANY_OF), check if the entity has entitlements to view
	if len(searchAttributes.RelTo) > 0 {
		visible := false

		for _, classification := range searchAttributes.RelTo {
			if entitlements[classification] {
				visible = true
				break
			}
		}

		if !visible {
			return false, nil
		}
	}

	return true, nil
}
