package api

import (
	"errors"
	"io/fs"
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/virtru-corp/dsp-cop/pkg/config"
	"golang.org/x/exp/slog"
)

func staticFilesHandler(_ *config.Config, staticFs fs.FS) http.Handler {
	fileServer := http.FileServer(http.FS(staticFs))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// serve index.html for root path
		if r.URL.Path == "/" {
			fileServer.ServeHTTP(w, r)
			return
		}

		// clean path for security & strip leading slash to avoid FS.Open errors
		cleanedPath := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		//Added to logs
		//slog.Debug("Trimmed path", slog.Any("path", cleanedPath))
		// check if file exists or serve index.html unless it's a static file request
		if file, err := staticFs.Open(cleanedPath); err != nil {
			//slog.Debug("File and path requested from staticfileserver:", slog.Any("File", file), slog.Any("Serving from path:", cleanedPath))
			if errors.Is(err, os.ErrNotExist) && path.Ext(cleanedPath) != "" { // 404 for static files
				http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				return
			} else if errors.Is(err, os.ErrNotExist) { // serve index.html for non-static files
				r.URL.Path = "/"
			} else { // 500 for other errors
				slog.ErrorContext(r.Context(), "error opening file", slog.String("error", err.Error()))
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
				return
			}
		} else {
			file.Close()
		}

		// let fileServer handle valid requests
		fileServer.ServeHTTP(w, r)
	})
}
