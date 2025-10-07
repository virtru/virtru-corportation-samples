package api

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"connectrpc.com/connect"
	"github.com/dgraph-io/ristretto"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/opentdf/platform/sdk"

	geos "github.com/twpayne/go-geos"
	tdf_objectv1 "github.com/virtru-corp/dsp-cop/api/proto/tdf_object/v1"
	"github.com/virtru-corp/dsp-cop/db"
	activeclients "github.com/virtru-corp/dsp-cop/pkg/activeClients"
	"github.com/virtru-corp/dsp-cop/pkg/config"
	"github.com/virtru-corp/dsp-cop/pkg/dspClient"
	"github.com/virtru-corp/dsp-cop/pkg/util"
)

type TdfObjectServer struct {
	ActiveClients *activeclients.ActiveClients
	Config        *config.Config
	DBQueries     *db.Queries
	SDK           *sdk.SDK

	cache *ristretto.Cache
}

func (s *TdfObjectServer) CreateTdfObject(
	ctx context.Context,
	req *connect.Request[tdf_objectv1.CreateTdfObjectRequest],
) (*connect.Response[tdf_objectv1.CreateTdfObjectResponse], error) {

	// For development, uncomment the below to test various serverside encryption and decryption scenarios.
	// Update the TdfBlob saved to the database with the encrypted bytes below for browser-based decryption of server-encryption.

	// h := tdf.Handler{SDK: s.SDK, PlatformEndpoint: s.Config.PlatformEndpoint}
	// b, e := h.DecryptTDF(req.Msg.TdfBlob)
	// if e != nil {
	// 	return nil, fmt.Errorf("error decrypting TDF: %w", e)
	// }
	// decrypted := b.String()
	// slog.DebugContext(ctx, "Decrypted TDF", slog.String("tdf_blob", decrypted))

	// b, e = h.EncryptBytes([]byte(decrypted), []string{"https://demo.com/attr/classification/value/unclassified"}, tdf.NanoTDF)
	// if e != nil || b == nil {
	// 	return nil, fmt.Errorf("error encrypting bytes: %w", e)
	// }
	// encrypted := b.String()
	// slog.DebugContext(ctx, "Encrypted bytes", slog.String("bytes", encrypted))

	geo, err := geos.NewGeomFromGeoJSON(req.Msg.Geo)
	if err != nil {
		return nil, fmt.Errorf("error creating geometry from GeoJSON: %w", err)
	}

	search := []byte(req.Msg.Search)
	if len(search) == 0 {
		// todo: figure out how to use with NULL db type
		search = []byte("null")
	}

	var ts pgtype.Timestamp
	if req.Msg.Ts != nil {
		ts = pgtype.Timestamp{Time: req.Msg.GetTs().AsTime().UTC(), Valid: true}
	} else {
		ts = pgtype.Timestamp{Time: time.Now().UTC(), Valid: true}
	}

	var newId uuid.UUID
	var respErr *connect.Error
	s.DBQueries.CreateTdfObjects(ctx, []db.CreateTdfObjectsParams{
		{
			SrcType: strings.ToLower(req.Msg.SrcType),
			Ts:      ts,
			Geo:     geo,
			Search:  search,
			TdfBlob: req.Msg.TdfBlob,
		},
	}).QueryRow(func(i int, id uuid.UUID, err error) {
		if err != nil {
			slog.ErrorContext(ctx, "Error inserting record", slog.String("error", err.Error()))
			respErr = db.StatusifyError(err, db.ErrCreateFailure, slog.String("src_type", req.Msg.SrcType))
		}
		newId = id
	})

	if respErr != nil {
		return nil, respErr
	}

	res := connect.NewResponse(&tdf_objectv1.CreateTdfObjectResponse{
		Id: newId.String(),
	})
	res.Header().Set("TdfObject-Version", "v1")

	return res, nil
}

func (s *TdfObjectServer) GetTdfObject(
	ctx context.Context,
	req *connect.Request[tdf_objectv1.GetTdfObjectRequest],
) (*connect.Response[tdf_objectv1.GetTdfObjectResponse], error) {

	uuid, err := uuid.Parse(req.Msg.Id)
	if err != nil {
		return nil, err
	}

	tdfObject, err := s.DBQueries.GetTdfObject(ctx, uuid)
	if err != nil {
		return nil, err
	}

	res := connect.NewResponse(&tdf_objectv1.GetTdfObjectResponse{
		TdfObject: prepObjForResponse(db.TdfObject{
			ID:      uuid,
			Ts:      tdfObject.Ts,
			SrcType: tdfObject.SrcType,
			Geo:     tdfObject.Geo.(*geos.Geom),
			TdfBlob: tdfObject.TdfBlob,
			TdfUri:  tdfObject.TdfUri,
		}),
	})
	res.Header().Set("TdfObject-Version", "v1")

	return res, nil
}

func (s *TdfObjectServer) GetEntitlements(
	ctx context.Context,
	req *connect.Request[tdf_objectv1.GetEntitlementsRequest],
) (*connect.Response[tdf_objectv1.GetEntitlementsResponse], error) {
	token := req.Header().Get("Authorization")

	entitlements, err := s.getEntitlements(token)
	if err != nil {
		return nil, err
	}

	res := connect.NewResponse(&tdf_objectv1.GetEntitlementsResponse{
		Entitlements: entitlements,
	})
	res.Header().Set("TdfObject-Version", "v1")

	return res, nil
}

func (s *TdfObjectServer) getEntitlements(token string) (dspClient.Entitlements, error) {
	// check the cache first
	cacheKey := EntitlementCacheKey + token
	entitlements, found := s.cache.Get(cacheKey)
	if found {
		return entitlements.(dspClient.Entitlements), nil
	}

	entitlements, err := dspClient.GetEntitlements(s.Config.PlatformEndpoint+"/shared/entitlements", token)
	if err != nil {
		return nil, err
	}

	// cache the entitlements
	s.cache.SetWithTTL(cacheKey, entitlements, EntitlementCacheWeight, EntitlementCacheTTL)

	return entitlements.(dspClient.Entitlements), nil
}

func (s *TdfObjectServer) QueryTdfObjects(
	ctx context.Context,
	req *connect.Request[tdf_objectv1.QueryTdfObjectsRequest],
) (*connect.Response[tdf_objectv1.QueryTdfObjectsResponse], error) {
	token := req.Header().Get("Authorization")
	entitlements, err := s.getEntitlements(token)
	if err != nil {
		return nil, err
	}

	tdfObjects, err := queryTdfObjectSwitch(ctx, s.DBQueries, req.Msg)
	if err != nil {
		return nil, err
	}
	// TODO: additional work is needed here to get the attributes for the TDFs
	// filter out TDFs that the user does not have access to
	filteredTdfObjects := make([]*tdf_objectv1.TdfObject, 0, len(tdfObjects))
	for _, t := range tdfObjects {
		if t.Search != "" {
			// unmarshal the search string into a map
			var searchAttributes util.TDFObjectSearchAttributes
			if err := json.Unmarshal([]byte(t.Search), &searchAttributes); err != nil {
				slog.Error("error unmarshalling search string", slog.String("error", err.Error()))
				continue
			}

			// remove plaintext from results to reduce risk of leaking sensitive data
			if v, err := util.TrimTDFVisibility(searchAttributes, entitlements); !v {
				if err != nil {
					slog.Error("error trimming TDF visibility", slog.String("error", err.Error()))
				}
				continue
			}
		}

		// remove search string from results to reduce risk of leaking sensitive data
		t.Search = ""
		filteredTdfObjects = append(filteredTdfObjects, t)
	}

	res := connect.NewResponse(&tdf_objectv1.QueryTdfObjectsResponse{
		TdfObjects: filteredTdfObjects,
	})
	res.Header().Set("TdfObject-Version", "v1")

	return res, nil
}

func (s *TdfObjectServer) StreamTdfObjects(
	ctx context.Context,
	req *connect.Request[tdf_objectv1.StreamTdfObjectsRequest],
	stream *connect.ServerStream[tdf_objectv1.StreamTdfObjectsResponse],
) error {
	// generate a unique ID for the client
	clientId := uuid.New()

	slog.InfoContext(ctx, "StreamTdfObject request received",
		slog.Any("client_id", clientId.String()),
	)

	slog.InfoContext(ctx, "client connected to StreamTdfObjects", slog.Any("client_id", clientId.String()))
	s.ActiveClients.Add(clientId.String(), req.Peer(), stream)

	// remove client from activeClients when context is done (aka client disconnects)
	go func() {
		<-ctx.Done()
		slog.InfoContext(ctx, "client disconnected from StreamTdfObjects", slog.Any("client_id", clientId.String()))
		s.ActiveClients.Remove(clientId.String())
	}()

	stream.ResponseHeader().Set("TdfObject-Version", "v1")
	s.ActiveClients.Emit(
		clientId.String(),
		tdf_objectv1.StreamEventType_STREAM_EVENT_TYPE_CONNECTED,
		"connected on "+time.Now().String(),
	)

	// endless loop to keep the stream open
	startTime := time.Now()
	for {
		// TODO maybe make the sleep time configurable
		time.Sleep(1 * time.Second)

		// send heartbeat to client
		if int(time.Since(startTime).Seconds())%s.Config.Service.StreamHeartbeatInterval == 0 {
			s.ActiveClients.Emit(
				clientId.String(), tdf_objectv1.StreamEventType_STREAM_EVENT_TYPE_HEARTBEAT,
				"alive:"+time.Since(startTime).String(),
			)
		}
		// TODO maybe check if we want to force the client to reconnect
		// TODO enhance the stream proto to support messages to the client to force a reconnect
	}
}

func (s *TdfObjectServer) GetSrcType(
	ctx context.Context,
	req *connect.Request[tdf_objectv1.GetSrcTypeRequest],
) (*connect.Response[tdf_objectv1.GetSrcTypeResponse], error) {

	srcType, err := dbQuerySrcType(ctx, s.DBQueries, req.Msg.SrcType)
	if err != nil {
		return nil, err
	}

	res := connect.NewResponse(&tdf_objectv1.GetSrcTypeResponse{
		SrcType: srcType,
	})
	res.Header().Set("TdfObject-Version", "v1")

	return res, nil
}

func (s *TdfObjectServer) ListSrcTypes(
	ctx context.Context,
	req *connect.Request[tdf_objectv1.ListSrcTypesRequest],
) (*connect.Response[tdf_objectv1.ListSrcTypesResponse], error) {

	srcTypes, err := s.DBQueries.ListSrcTypes(ctx)
	if err != nil {
		return nil, err
	}

	res := connect.NewResponse(&tdf_objectv1.ListSrcTypesResponse{
		SrcTypes: srcTypes,
	})
	res.Header().Set("TdfObject-Version", "v1")

	return res, nil
}
