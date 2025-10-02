package cmd

import (
	"github.com/spf13/cobra"
	"github.com/virtru-corp/dsp-cop/api"
)

var (
	serveCmd = &cobra.Command{
		Use:     "serve",
		Aliases: []string{"server", "start"},
		Short:   "Start the DSP COP server",
		Long:    "Start the Virtru Data Security Platform COP server",
		Run: func(cmd *cobra.Command, args []string) {
			server := api.NewCopServer(cfg, staticDir)
			server.Start()
			defer server.Stop()
		},
	}
)

func init() {
	rootCmd.AddCommand(serveCmd)
}
