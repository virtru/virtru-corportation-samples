package ui

import (
	"bytes"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"strconv"

	"github.com/psanford/memfs"
	"github.com/virtru-corp/dsp-cop/pkg/config"
	"golang.org/x/net/html"
)

const (
	globalNamespace     = "window.VIRTRU_DSP_COP_ENV"
	platformEndpoint    = globalNamespace + ".platformEndpoint"
	dspCopUrl           = globalNamespace + ".copUrl"
	oidcClientId        = globalNamespace + ".oidcClientId"
	keycloakDirectAuth  = globalNamespace + ".keycloakDirectAuth"
	tileServerUrl       = globalNamespace + ".tileServerUrl"
	formSubmitNanoTdf   = globalNamespace + ".formSubmitNanoTdf"
	kasUrl              = globalNamespace + ".kasUrl"
	idpUrl              = globalNamespace + ".idpUrl"
)

func InjectWindowVars(c *config.Config, staticFs fs.FS) (*memfs.FS, error) {
	slog.Info("injecting env vars into index.html")
	ierr := fmt.Errorf("failed to inject env vars into index.html")

	// create script body
	scriptBody := ""
	scriptBody += globalNamespace + ` = {};`
	scriptBody += platformEndpoint + ` = "` + c.PlatformEndpoint + `";`
	scriptBody += dspCopUrl + ` = "` + c.Service.PublicServerHost + `";`
	scriptBody += tileServerUrl + ` = "` + c.UI.TileServerURL + `";`
	scriptBody += oidcClientId + ` = "` + c.OIDCClientIdForWebPasswordFlow + `";`
	scriptBody += formSubmitNanoTdf + ` = ` + strconv.FormatBool(c.UI.FormSubmitNanoTDF) + `;`
	scriptBody += kasUrl + ` = "` + c.DeprecatedKASUrl + `";`
	scriptBody += idpUrl + ` = "` + c.DeprecatedIdpUrl + `";`

	// create script tag
	scriptTag := &html.Node{
		Type: html.ElementNode,
		Data: "script",
		Attr: []html.Attribute{{Key: "type", Val: "text/javascript"}},
	}
	scriptTag.AppendChild(&html.Node{
		Type: html.TextNode,
		Data: scriptBody,
	})

	// check if index.html exists
	slog.Debug("checking if index.html exists in staticFs")
	if _, err := staticFs.Open("index.html"); err != nil {
		return nil, errors.Join(ierr, err)
	}

	// create memfs and walk staticFs
	mfs := memfs.New()
	err := fs.WalkDir(staticFs, ".", func(path string, d fs.DirEntry, err error) error {
		slog.Debug("walking staticFs", slog.String("path", path))
		if err != nil {
			return errors.Join(ierr, err)
		}

		// create dir and continue
		if d.IsDir() {
			mfs.MkdirAll(path, 0o755)
			return nil
		}

		// open file
		f, err := staticFs.Open(path)
		if err != nil {
			return errors.Join(ierr, err)
		}
		defer f.Close()

		data, err := io.ReadAll(f)
		if err != nil {
			return errors.Join(ierr, err)
		}

		if path == "index.html" {
			slog.Debug("injecting env vars into index.html", slog.String("path", path))
			data, err = appendToIndex(data, scriptTag)
			if err != nil {
				return errors.Join(ierr, err)
			}
		}

		// write file to memfs
		if err := mfs.WriteFile(path, data, fs.ModeAppend); err != nil {
			return errors.Join(ierr, err)
		}

		return nil
	})

	return mfs, err
}

func appendToIndex(d []byte, t *html.Node) ([]byte, error) {
	// parse index.html
	doc, err := html.Parse(bytes.NewReader(d))
	if err != nil {
		return []byte{}, err
	}

	headTag := findHead(doc)
	if headTag == nil {
		return []byte{}, fmt.Errorf("head not found in index.html or is not first child of html tag")
	}

	// insert script before first child of head
	headTag.InsertBefore(t, headTag.FirstChild)

	// render doc to bytes
	var b bytes.Buffer
	if err := html.Render(&b, doc); err != nil {
		return []byte{}, err
	}
	return b.Bytes(), nil
}

func findHead(n *html.Node) *html.Node {
	if n.Type == html.ElementNode && n.Data == "head" {
		return n
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if head := findHead(c); head != nil {
			return head
		}
	}
	return nil
}
