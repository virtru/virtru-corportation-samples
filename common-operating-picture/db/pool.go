package db

import (
	"context"
	"errors"
	"log/slog"
	"strings"

	"connectrpc.com/connect"
	"github.com/jackc/pgerrcode"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	geos "github.com/twpayne/go-geos"
	pgxgeos "github.com/twpayne/pgx-geos"
	"github.com/virtru-corp/dsp-cop/pkg/config"
)

func NewPool(ctx context.Context, cfg *config.Config) (*pgxpool.Pool, error) {
	pgxcfg, err := pgxpool.ParseConfig(cfg.DBUrl)
	if err != nil {
		slog.ErrorContext(ctx, "Error parsing database URL", err)
		return nil, err
	}

	pgxcfg.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		if err := pgxgeos.Register(ctx, conn, geos.NewContext()); err != nil {
			return err
		}
		return nil
	}

	pool, err := pgxpool.NewWithConfig(ctx, pgxcfg)
	if err != nil {
		slog.ErrorContext(ctx, "Error connecting to database", err)
		return nil, err
	}

	slog.InfoContext(ctx, "Verifying database connection")
	if err := pool.Ping(ctx); err != nil {
		slog.ErrorContext(ctx, "Error verifying database connection", err)
		return nil, err
	}

	return pool, nil
}

var ErrCreateFailure = errors.New("failed to create new record")

func StatusifyError(err error, fallbackErr error, log ...any) *connect.Error {
	l := append([]any{"error", err}, log...)

	if err == nil {
		return nil
	}
	if strings.Contains(err.Error(), pgerrcode.UndefinedTable) {
		l = append(l, "check README steps to set up database schema")
		slog.Error(err.Error(), l...)
		return connect.NewError(
			connect.CodeInternal,
			ErrCreateFailure,
		)
	}

	slog.Error(err.Error(), l...)
	return connect.NewError(connect.CodeInternal, fallbackErr)
}
