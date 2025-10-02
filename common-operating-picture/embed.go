//go:build embedfiles

package main

import "embed"

//go:embed all:ui/dist/*
var DistFS embed.FS

func init() {
}
