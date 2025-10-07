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

	// Read the config file
	cfg, err := config.New()
	if err != nil {
		panic("could not read config: " + err.Error())
	}

	cmd.Execute(cfg, staticFiles)
}
