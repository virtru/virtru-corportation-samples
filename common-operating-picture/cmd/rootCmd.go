package cmd

import (
	"io/fs"

	cosignCli "github.com/sigstore/cosign/v2/cmd/cosign/cli"
	"github.com/spf13/cobra"
	"github.com/virtru-corp/dsp-cop/pkg/config"
)

const rootCmdLong = `
	Virtru Data Security Platform - Common Operating Picture (DSP-COP) is a tool for managing and sharing sensitive information. 
`

var (
	cfg       *config.Config
	staticDir fs.FS
	rootCmd   = &cobra.Command{
		Use:   "dsp-cop",
		Short: "dsp-cop is the command line tool for running Virtru Data Security Platform COP",
		Long:  rootCmdLong,
	}
)

func init() {
	// Add Cosign Commands
	rootCmd.AddCommand(cosignCli.New())
}

func Execute(c *config.Config, s fs.FS) error {
	cfg = c
	staticDir = s
	return rootCmd.Execute()
}
