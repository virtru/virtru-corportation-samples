package config

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/creasty/defaults"
	validator "github.com/go-playground/validator/v10"
	"github.com/spf13/viper"
	"github.com/virtru-corp/dsp-cop/pkg/logger"
)

const AppName = "dsp-cop"

const validatorErrMsg = `

#######################
# NOTE: Validator error messages are in the format of the Go struct field name.
# 
# These can be transformed to the config key by converting to snake_case and replacing "." with "_".
# Examples:
#  - "OIDCClientIdForServer" corresponds to the config key "oidc_client_id_for_server"
#  - "Service.GrpcPort" corresponds to the config key "service_grpc_port"
#  - etc
#######################

`

type Config struct {
	////////////////////////
	//// Required
	////////////////////////

	// DB connection string and pool settings https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING
	// Pool settings https://pkg.go.dev/github.com/jackc/pgx/v5@v5.5.5/pgxpool#ParseConfig
	DBUrl string `mapstructure:"db_url" validate:"required"`

	// DSP platform endpoint
	PlatformEndpoint string `mapstructure:"platform_endpoint" validate:"required"`

	// OIDC configuration for the COP server
	OIDCClientIdForServer     string `mapstructure:"oidc_client_id_for_server" validate:"required"`
	OIDCClientSecretForServer string `mapstructure:"oidc_client_secret_for_server" validate:"required"`

	// OIDC configuration for the web based password flow
	OIDCClientIdForWebPasswordFlow string `mapstructure:"oidc_client_id_for_web_password_flow" validate:"required"`

	// @deprecated KAS url which will be replaced by fetching from DSP wellknown
	DeprecatedKASUrl string `mapstructure:"deprecated_kas_url"`

	// @deprecated IDP url which will be replaced by fetching from DSP wellknown
	DeprecatedIdpUrl string `mapstructure:"deprecated_idp_url"`

	////////////////////////
	//// Optional
	////////////////////////
	LogLevel string `mapstructure:"log_level" default:"INFO"`

	Service struct {
		// The public host and port is used by the web interface to connect to the server. In many
		// environments this will not be the same as the hostname and port the server is listening on.
		PublicServerHost string `mapstructure:"public_server_host" default:"local-dsp.virtru.com:5002"`
		PublicStaticHost string `mapstructure:"public_static_host" default:"local-dsp.virtru.com:5001"`

		GrpcPort         string `mapstructure:"grpc_port" default:"5002"`
		GrpcWriteTimeout int    `mapstructure:"grpc_write_timeout" default:"60"`
		GrpcReadTimeout  int    `mapstructure:"grpc_read_timeout" default:"60"`
		GrpcIdleTimeout  int    `mapstructure:"grpc_idle_timeout" default:"300"`

		StaticPort         string `mapstructure:"static_port" default:"5001"`
		StaticWriteTimeout int    `mapstructure:"static_write_timeout" default:"60"`
		StaticReadTimeout  int    `mapstructure:"static_read_timeout" default:"60"`

		StreamHeartbeatInterval int `mapstructure:"stream_heartbeat_interval" default:"5"`

		// CORS configuration (an empty string will default to the hostname)
		CORSOrigin string `mapstructure:"cors_origin" default:"*"`

		// TLS configuration
		TLS struct {
			Enabled  bool   `mapstructure:"enabled" default:"true"`
			CertFile string `mapstructure:"cert_file" default:"dsp-keys/local-dsp.virtru.com.pem"`
			KeyFile  string `mapstructure:"key_file" default:"dsp-keys/local-dsp.virtru.com.key.pem"`
		} `mapstructure:"tls"`
	} `mapstructure:"service"`

	// UI configuration
	UI struct {
		// Tile server URL for the map
		TileServerURL string `mapstructure:"tile_server_url" default:"https://tile.openstreetmap.org/{z}/{x}/{y}.png"`

		// Override TDF3/ZTDF default and encrypt forms as NanoTDFs
		FormSubmitNanoTDF bool `mapstructure:"form_submit_nano_tdf" default:"true"`
	}
}

func New() (*Config, error) {
	c := &Config{}

	v := viper.NewWithOptions(viper.WithLogger(slog.Default()))

	v.SetConfigName("config")
	v.SetConfigType("yaml")

	// Config search paths (see https://clig.dev/#configuration)
	v.AddConfigPath("/etc/" + AppName + "/")    // System-wide config: /etc/dsp-cop/config.yaml
	v.AddConfigPath("$HOME/.config/" + AppName) // User-level via XDG-spec: ~/.config/dsp-cop/config.yaml
	v.AddConfigPath(".")                        // Project-level config: ./config.yaml

	// Environment variables
	v.SetEnvPrefix(AppName)
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Read the config file
	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("fatal error config file: %w", err)
	}

	if err := defaults.Set(c); err != nil {
		return nil, fmt.Errorf("fatal error setting defaults: %w", err)
	}

	if err := v.Unmarshal(c); err != nil {
		return nil, fmt.Errorf("fatal error unmarshalling config: %w", err)
	}

	validate := validator.New()
	if err := validate.Struct(c); err != nil {
		fmt.Print(validatorErrMsg)
		return nil, fmt.Errorf("fatal error validating config: %w", err)
	}

	// Set the CORS origin if it's empty
	if c.Service.CORSOrigin == "" {
		c.Service.CORSOrigin = c.Service.PublicStaticHost
	}

	// Set the log level from the config so we can log the config
	logger.SetLevel(c.LogLevel)

	slog.Info("config loaded", slog.String("file", v.ConfigFileUsed()))
	slog.Debug("config data", slog.Any("config", c))

	return c, nil
}
