package api

import (
	"context"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	pgx "github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgxlisten"
	"github.com/twpayne/go-geos"
	tdf_objectv1 "github.com/virtru-corp/dsp-cop/api/proto/tdf_object/v1"
	"github.com/virtru-corp/dsp-cop/db"
	activeclients "github.com/virtru-corp/dsp-cop/pkg/activeClients"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func connectPgxListener(pool *pgxpool.Pool, clients *activeclients.ActiveClients, channel string) *pgxlisten.Listener {
	slog.Info("starting pgx listener")
	l := &pgxlisten.Listener{
		Connect: func(ctx context.Context) (*pgx.Conn, error) {
			slog.Debug("pgx listener aquired connection")
			conn, err := pool.Acquire(ctx)
			if err != nil {
				return nil, err
			}
			return conn.Hijack(), nil
		},

		LogError: func(ctx context.Context, err error) {
			slog.ErrorContext(ctx, "pgx listener error", slog.String("error", err.Error()))
		},
	}

	slog.Info("subscribing to channel", slog.String("channel", channel))
	l.Handle(channel, pgxlisten.HandlerFunc(func(ctx context.Context, notification *pgconn.Notification, conn *pgx.Conn) error {
		slog.InfoContext(ctx, "notification received", slog.String("channel", notification.Channel), slog.String("payload", notification.Payload))

		obj, err := parsePgNotifyPayload(notification.Payload)
		if err != nil {
			slog.ErrorContext(ctx, "failed to parse payload", slog.String("error", err.Error()))
			return nil
		}

		clients.BroadcastTdfObjects([]*tdf_objectv1.TdfObject{
			{
				Id:      obj.ID.String(),
				Ts:      timestamppb.New(obj.Ts.Time),
				SrcType: obj.SrcType,
				Geo:     obj.Geo.String(),
				Search:  string(obj.Search),
				TdfBlob: obj.TdfBlob,
			},
		})

		return nil
	}))

	return l
}

type tmpTdfObject struct {
	Id       string          `json:"id"`
	Ts       string          `json:"ts"`
	SrcType  string          `json:"src_type"`
	Geo      json.RawMessage `json:"geo"`
	Search   json.RawMessage `json:"search"`
	TdfBlob string          `json:"tdf_blob"`
	TdfUri  string          `json:"tdf_uri"`
}

const pgTimeFormat = "2006-01-02T15:04:05"

func parsePgNotifyPayload(payload string) (*db.TdfObject, error) {
	tmp := tmpTdfObject{}
	object := &db.TdfObject{}

	err := json.Unmarshal([]byte(payload), &tmp)
	if err != nil {
		return nil, fmt.Errorf("failed to unmarshal payload: %w", err)
	}

	id, err := uuid.Parse(tmp.Id)
	if err != nil {
		return nil, fmt.Errorf("failed to parse UUID: %w", err)
	}
	object.ID = id

	// Remove the nanoseconds from the timestamp (Postgres returns inconsistent lengths)
	ts, err := time.Parse(pgTimeFormat, strings.Split(tmp.Ts, ".")[0])
	if err != nil {
		return nil, fmt.Errorf("failed to parse timestamp: %w", err)
	}
	object.Ts = pgtype.Timestamp{Time: ts, Valid: true}

	object.SrcType = tmp.SrcType

	if tmp.Geo != nil && string(tmp.Geo) != "null" && string(tmp.Geo) != "" {
		geojson, err := tmp.Geo.MarshalJSON()
		if err != nil {
			geojson = []byte("")
		}
		geo, err := geos.NewGeomFromGeoJSON(string(geojson))
		if err != nil {
			return nil, fmt.Errorf("failed to create geom from geojson: %w", err)
		}
		object.Geo = geo
	}

	search, err := tmp.Search.MarshalJSON()
	if err != nil {
		search = []byte("")
	}
	object.Search = search

	// postgres converts bytea to a hex string when jsonified
	if tmp.TdfBlob[:2] == "\\x" {
		// remove the leading \x
		tmp.TdfBlob = tmp.TdfBlob[2:]
		// decode the hex string
		decoded, err := hex.DecodeString(tmp.TdfBlob)
		if err != nil {
			return nil, fmt.Errorf("failed to decode hex string: %w", err)
		}
		object.TdfBlob = decoded
	}

	return object, nil
}
