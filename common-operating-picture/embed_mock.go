//go:build !embedfiles

package main

import "testing/fstest"

var DistFS fstest.MapFS

func init() {
	DistFS = fstest.MapFS{
		"isMock": {
			Data: []byte("hello, world"),
		},
		"index.html": {
			Data: []byte("<html><body>Running in mock mode.</body></html>"),
		},
	}
}
