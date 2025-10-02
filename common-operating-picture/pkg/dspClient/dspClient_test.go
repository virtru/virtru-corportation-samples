package dspClient

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"
)

func getToken() string {

  url := "https://local-dsp.virtru.com:8443/auth/realms/opentdf/protocol/openid-connect/token"
  method := "POST"

  payload := strings.NewReader("grant_type=password&client_id=dsp-cop-client&username=secret-usa-aaa&password=testuser123&scope=openid")

  client := &http.Client {
  }
  req, err := http.NewRequest(method, url, payload)

  if err != nil {
    fmt.Println(err)
    return ""
  }
  req.Header.Add("X-VirtruPubKey", "")
  req.Header.Add("Content-Type", "application/x-www-form-urlencoded")

  res, err := client.Do(req)
  if err != nil {
    fmt.Println(err)
    return ""
  }
  defer res.Body.Close()

  body, err := io.ReadAll(res.Body)
  if err != nil {
    fmt.Println(err)
    return ""
  }
	type Token struct {
		AccessToken string `json:"access_token"`
		ExpiresIn int `json:"expires_in"`
		TokenType string `json:"token_type"`
		RefreshExpiresIn int `json:"refresh_expires_in"`
		RefreshToken string `json:"refresh_token"`
		IdToken string `json:"id_token"`
		NotBeforePolicy int `json:"not-before-policy"`
		SessionState string `json:"session_state"`
		Scope string `json:"scope"`
	}
	var token Token
  failed := json.Unmarshal(body, &token)
	if failed != nil {
		fmt.Println(failed)
		return ""
	}
	return token.AccessToken
}

func TestGetEntitlements(t *testing.T) {
	endpoint := "https://local-dsp.virtru.com:8080/shared/entitlements"
	token := getToken()

	entitlements, err := GetEntitlements(endpoint, token)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if len(entitlements) <= 0 {
		t.Fatalf("expected entitlements to contain at least one attribute")
	}
}