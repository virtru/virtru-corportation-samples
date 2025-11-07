package main

import (
	"io/fs"
	"log/slog"

	"github.com/virtru-corp/dsp-cop/cmd"
	"github.com/virtru-corp/dsp-cop/pkg/config"
)

const subDir = "ui/dist"

func main() {
	// Mount the embedded file or mock file system
	var staticFiles fs.FS
	if _, err := DistFS.ReadFile("isMock"); err == nil {
		slog.Warn("RUNNING IN MOCK MODE: build with `-tags embedfiles` to use the embedded files.")
		staticFiles = fs.FS(DistFS)
	} else {
		staticFiles, err = fs.Sub(DistFS, subDir)
		if err != nil {
			panic("could not read embedded files: " + err.Error())
		}
	}

	slog.Info("About to start listing files:")
	entries, err := fs.ReadDir(staticFiles, ".")
	if err != nil {
		slog.Error("Failed to read static files directory", slog.String("error", err.Error()))
	} else {
		for _, entry := range entries {
			slog.Info("Static file found", slog.String("name", entry.Name()), slog.Bool("isDir", entry.IsDir()))
		}
	}
	slog.Info("Finished listing files.")

	fs.WalkDir(staticFiles, ".", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		slog.Info("Embedded file", "path", path)
		return nil
	})


	// Read the config file
	cfg, err := config.New()
	if err != nil {
		panic("could not read config: " + err.Error())
	}
	
	slog.Info("Launching DSP COP with config and static files:", slog.Any("staticFiles:", staticFiles), slog.Any("config:", cfg))
	cmd.Execute(cfg, staticFiles)
}
