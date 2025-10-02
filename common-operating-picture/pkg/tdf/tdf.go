package tdf

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"log/slog"

	"github.com/opentdf/platform/sdk"
)

const (
	_ = iota
	ZTDF
	NanoTDF
)

type Handler struct {
	SDK              *sdk.SDK
	PlatformEndpoint string
}

// Encrypt bytes as a TDF of the specified type.
// NOTE: due to the KASUrl issue [https://github.com/opentdf/platform/issues/945], there are known issues with TDF decryption in the server if the encryption
// was with an http path KASUrl and decryption is over gRPC or vice versa. This function uses the http KASUrl path since COP decryption is in-browser.
func (h Handler) EncryptBytes(b []byte, attrValues []string, TDFType int) (*bytes.Buffer, error) {
	var encrypted []byte
	enc := bytes.NewBuffer(encrypted)

	r := bytes.NewReader(b)
	var err error

	switch TDFType {
	case ZTDF:
		slog.Debug("Encrypting bytes as ZTDF")
		_, err = h.SDK.CreateTDF(enc, r,
			sdk.WithDataAttributes(attrValues...),
			sdk.WithKasInformation(sdk.KASInfo{
				URL:       h.PlatformEndpoint + "/kas", // add http path to kas for browser-based decrypt [https://github.com/opentdf/platform/issues/945]
				PublicKey: "",                          // use the platform public key
			}),
		)
	case NanoTDF:
		slog.Debug("Encrypting bytes as NanoTDF")
		nanoCfg, e := h.SDK.NewNanoTDFConfig()
		if e != nil {
			return nil, fmt.Errorf("failed to create NanoTDF config: %w", err)
		}
		nanoCfg.SetAttributes(attrValues)
		nanoCfg.SetKasURL(h.PlatformEndpoint + "/kas") // add http path to kas for browser-based decrypt [https://github.com/opentdf/platform/issues/945]
		_, err = h.SDK.CreateNanoTDF(enc, r,
			*nanoCfg,
		)
	default:
		return nil, errors.New("failed to encrypt bytes: invalid TDF type")
	}
	return enc, err
}

// Detect the TDF type of the given bytes and decrypt it.
// NOTE: due to the KASUrl issue [https://github.com/opentdf/platform/issues/945], there are known issues with TDF decryption in the server if the encryption
// was with an http path KASUrl and decryption is over gRPC or vice versa. The EncryptBytes function uses an http KASUrl path since COP decryption is in-browser.
func (h Handler) DecryptTDF(toDecrypt []byte) (*bytes.Buffer, error) {
	if len(toDecrypt) < 3 {
		return nil, errors.New("failed to decrypt TDF: invalid TDF")
	}
	buf := new(bytes.Buffer)

	// Expected bytes corresponding to Magic Number 'L1L' ASCII characters
	// For more info, see: https://github.com/opentdf/spec/tree/main/schema/nanotdf#3311-magic-number--version
	magicNumberBytes := []byte{0x4c, 0x31, 0x4c}

	// Check if the first three bytes match the magic header bytes
	foundZTDF := false
	for i := 0; i < 3; i++ {
		if toDecrypt[i] != magicNumberBytes[i] {
			foundZTDF = true
			break
		}
	}
	if foundZTDF {
		slog.Debug("Detected ZTDF and decrypting")
		sdkReader, err := h.SDK.LoadTDF(bytes.NewReader(toDecrypt))
		if err != nil {
			return nil, fmt.Errorf("failed to load detected ZTDF: %w", err)
		}
		_, err = io.Copy(buf, sdkReader)
		if err != nil && err != io.EOF {
			return nil, fmt.Errorf("failed to write loaded ZTDF: %w", err)
		}
	} else {
		slog.Debug("Detected NanoTDF and decrypting")
		_, err := h.SDK.ReadNanoTDF(io.Writer(buf), bytes.NewReader(toDecrypt))
		if err != nil {
			return nil, fmt.Errorf("failed to read detected NanoTDF: %w", err)
		}
	}

	return buf, nil
}
