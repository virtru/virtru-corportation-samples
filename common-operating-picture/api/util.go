package api

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/mitchellh/mapstructure"
	geos "github.com/twpayne/go-geos"
	tdf_notev1 "github.com/virtru-corp/dsp-cop/api/proto/tdf_note/v1"
	tdf_objectv1 "github.com/virtru-corp/dsp-cop/api/proto/tdf_object/v1"
	"github.com/virtru-corp/dsp-cop/db"
	"google.golang.org/protobuf/types/known/structpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func prepObjForResponse(in db.TdfObject) *tdf_objectv1.TdfObject {
	geo := ""
	if in.Geo != nil {
		geo = in.Geo.ToGeoJSON(0)
	}

	return &tdf_objectv1.TdfObject{
		Id:       in.ID.String(),
		Ts:       timestamppb.New(in.Ts.Time),
		SrcType:  in.SrcType,
		Geo:      geo,
		Search:   string(in.Search),
		Metadata: string(in.Metadata),
		TdfBlob:  in.TdfBlob,
		TdfUri:   in.TdfUri.String,
	}
}

func prepNoteForResponse(in db.TdfNote) *tdf_notev1.TdfNote {

	return &tdf_notev1.TdfNote{
		Id:       in.ID.String(),
		Ts:       timestamppb.New(in.Ts.Time),
		ParentId: in.ParentID.String(),
		Search:   string(in.Search),
		TdfBlob:  in.TdfBlob,
		TdfUri:   in.TdfUri.String,
	}
}

func queryTdfObjectSwitch(ctx context.Context, q *db.Queries, p *tdf_objectv1.QueryTdfObjectsRequest) ([]*tdf_objectv1.TdfObject, error) {
	srcType := p.GetSrcType()
	startTime := pgtype.Timestamp{Time: p.GetTsRange().GreaterOrEqualTo.AsTime(), Valid: true}
	endTime := pgtype.Timestamp{Time: time.Now().UTC(), Valid: true}
	if p.GetTsRange().LesserOrEqualTo != nil {
		endTime = pgtype.Timestamp{Time: p.GetTsRange().LesserOrEqualTo.AsTime(), Valid: true}
	}
	geometry := p.GetGeoLocation()

	if geometry != "" {
		geo, err := geos.NewGeomFromGeoJSON(geometry)
		if err != nil {
			return nil, fmt.Errorf("error creating geometry from GeoJSON: %w", err)
		}
		geometry = geo.String()
	}

	search := []byte(p.Search)

	if geometry != "" && len(search) > 0 {
		return dbQuerySearchAndGeo(ctx, q, db.ListTdfObjectsWithSearchAndGeoParams{
			SourceType: srcType,
			StartTime:  startTime,
			EndTime:    endTime,
			Search:     search,
			Geometry:   geometry,
		})
	} else if len(search) > 0 {
		return dbQuerySearch(ctx, q, db.ListTdfObjectsWithSearchParams{
			SourceType: srcType,
			StartTime:  startTime,
			EndTime:    endTime,
			Search:     search,
		})
	} else if geometry != "" {
		return dbQueryGeo(ctx, q, db.ListTdfObjectsWithGeoParams{
			SourceType: srcType,
			StartTime:  startTime,
			EndTime:    endTime,
			Geometry:   geometry,
		})
	} else {
		return dbQuery(ctx, q, db.ListTdfObjectsParams{
			SourceType: srcType,
			StartTime:  startTime,
			EndTime:    endTime,
		})

	}
}

func dbQuerySearchAndGeo(ctx context.Context, query *db.Queries, params db.ListTdfObjectsWithSearchAndGeoParams) ([]*tdf_objectv1.TdfObject, error) {
	items, err := query.ListTdfObjectsWithSearchAndGeo(ctx, params)
	if err != nil {
		return nil, err
	}
	objs := make([]*tdf_objectv1.TdfObject, 0, len(items))
	for _, item := range items {
		objs = append(objs, prepObjForResponse(db.TdfObject{
			ID:       item.ID,
			Ts:       item.Ts,
			SrcType:  item.SrcType,
			Geo:      item.Geo.(*geos.Geom),
			Search:   item.Search,
			Metadata: item.Metadata,
			TdfBlob:  item.TdfBlob,
		}))
	}
	return objs, nil
}

func dbQuerySearch(ctx context.Context, query *db.Queries, params db.ListTdfObjectsWithSearchParams) ([]*tdf_objectv1.TdfObject, error) {
	items, err := query.ListTdfObjectsWithSearch(ctx, params)
	if err != nil {
		return nil, err
	}
	objs := make([]*tdf_objectv1.TdfObject, 0, len(items))
	for _, item := range items {
		objs = append(objs, prepObjForResponse(db.TdfObject{
			ID:       item.ID,
			Ts:       item.Ts,
			SrcType:  item.SrcType,
			Search:   item.Search,
			Metadata: item.Metadata,
			Geo:      item.Geo.(*geos.Geom),
			TdfBlob:  item.TdfBlob,
		}))
	}
	return objs, nil
}

func dbQueryGeo(ctx context.Context, query *db.Queries, params db.ListTdfObjectsWithGeoParams) ([]*tdf_objectv1.TdfObject, error) {
	items, err := query.ListTdfObjectsWithGeo(ctx, params)
	if err != nil {
		return nil, err
	}
	objs := make([]*tdf_objectv1.TdfObject, 0, len(items))
	for _, item := range items {
		objs = append(objs, prepObjForResponse(db.TdfObject{
			ID:       item.ID,
			Ts:       item.Ts,
			SrcType:  item.SrcType,
			Search:   item.Search,
			Metadata: item.Metadata,
			Geo:      item.Geo.(*geos.Geom),
			TdfBlob:  item.TdfBlob,
		}))
	}
	return objs, nil
}

func dbQuery(ctx context.Context, query *db.Queries, params db.ListTdfObjectsParams) ([]*tdf_objectv1.TdfObject, error) {
	items, err := query.ListTdfObjects(ctx, params)
	if err != nil {
		return nil, err
	}
	objs := make([]*tdf_objectv1.TdfObject, 0, len(items))
	for _, item := range items {
		objs = append(objs, prepObjForResponse(db.TdfObject{
			ID:       item.ID,
			Ts:       item.Ts,
			SrcType:  item.SrcType,
			Search:   item.Search,
			Metadata: item.Metadata,
			Geo:      item.Geo.(*geos.Geom),
			TdfBlob:  item.TdfBlob,
		}))
	}
	return objs, nil
}

// NOTE: These intermediary structs are required to parse the src_type table JSON fields in the database.
// The proto structs use snake_case fields for GO JSON marshalling, and seem to not be customizable.

type dbSrcTypeMetadata struct {
	GeoField      string   `json:"geoField"`
	SearchFields  []string `json:"searchFields"`
	AttrFields    []string `json:"attrFields"`
	TsField       string   `json:"tsField,omitempty"`
	DisplayFields struct {
		Header  string   `json:"header,omitempty"`
		Details []string `json:"details,omitempty"`
	} `json:"displayFields,omitempty"`
	MapFields struct {
		IconDefault  string                    `json:"iconDefault"`
		IconConfig   []dbSrcTypeMapFieldConfig `json:"iconConfig,omitempty"`
		ColorDefault string                    `json:"colorDefault"`
		ColorConfig  []dbSrcTypeMapFieldConfig `json:"colorConfig,omitempty"`
	} `json:"mapFields,omitempty"`
}

type dbSrcTypeMapFieldConfig struct {
	Field    string            `json:"field,omitempty"`
	ValueMap map[string]string `json:"valueMap,omitempty"`
}

type dbSrcTypeUiSchema struct {
	Order       []string               `json:"order"`
	FieldConfig map[string]interface{} `json:"-"`
}

type dbSrcTypeUiSchemaFieldConfig struct {
	Placeholder string `json:"placeholder,omitempty"`
	Widget      string `json:"widget,omitempty"`
	Multiple    bool   `json:"multiple,omitempty"`
}

func dbQuerySrcType(ctx context.Context, query *db.Queries, srcTypeId string) (*tdf_objectv1.SrcType, error) {
	srcType, err := query.GetSrcType(ctx, srcTypeId)
	if err != nil {
		return nil, err
	}

	var dbFormSchema map[string]interface{}
	err = json.Unmarshal(srcType.FormSchema, &dbFormSchema)
	if err != nil {
		return nil, err
	}

	formSchemaStruct, err := structpb.NewStruct(dbFormSchema)
	if err != nil {
		return nil, err
	}

	var dbUiSchema dbSrcTypeUiSchema
	// unmarshal the known order field first
	err = json.Unmarshal(srcType.UiSchema, &dbUiSchema)
	if err != nil {
		return nil, err
	}
	// unmarshal the unknown, dynamic field config
	err = json.Unmarshal(srcType.UiSchema, &dbUiSchema.FieldConfig)
	if err != nil {
		return nil, err
	}
	// remove the order field unmarshalled again due to the map[string]interface{} type
	delete(dbUiSchema.FieldConfig, "order")

	uiSchema := &tdf_objectv1.SrcTypeUiSchema{
		Order:       dbUiSchema.Order,
		FieldConfig: make(map[string]*tdf_objectv1.SrcTypeUiSchemaFieldConfig),
	}

	// convert the dynamic field configs to their proto struct equivalent
	for k, v := range dbUiSchema.FieldConfig {
		fieldConfig := &dbSrcTypeUiSchemaFieldConfig{}

		err := mapstructure.Decode(v, &fieldConfig)
		if err != nil {
			return nil, err
		}

		uiSchema.FieldConfig[k] = &tdf_objectv1.SrcTypeUiSchemaFieldConfig{
			Placeholder: fieldConfig.Placeholder,
			Widget:      fieldConfig.Widget,
			Multiple:    fieldConfig.Multiple,
		}
	}

	var metadata dbSrcTypeMetadata
	err = json.Unmarshal(srcType.Metadata, &metadata)
	if err != nil {
		return nil, err
	}

	var colorConfigs []*tdf_objectv1.SrcTypeMetadataMapFieldConfig
	for _, v := range metadata.MapFields.ColorConfig {
		colorConfigs = append(colorConfigs, &tdf_objectv1.SrcTypeMetadataMapFieldConfig{
			Field:    v.Field,
			ValueMap: v.ValueMap,
		})
	}

	var iconConfigs []*tdf_objectv1.SrcTypeMetadataMapFieldConfig
	for _, v := range metadata.MapFields.IconConfig {
		iconConfigs = append(iconConfigs, &tdf_objectv1.SrcTypeMetadataMapFieldConfig{
			Field:    v.Field,
			ValueMap: v.ValueMap,
		})
	}

	protoSrcType := &tdf_objectv1.SrcType{
		Id:         srcType.ID,
		FormSchema: formSchemaStruct,
		UiSchema:   uiSchema,
		Metadata: &tdf_objectv1.SrcTypeMetadata{
			GeoField:     metadata.GeoField,
			SearchFields: metadata.SearchFields,
			AttrFields:   metadata.AttrFields,
			TsField:      metadata.TsField,
			DisplayFields: &tdf_objectv1.SrcTypeMetadataDisplayFields{
				Header:  metadata.DisplayFields.Header,
				Details: metadata.DisplayFields.Details,
			},
			MapFields: &tdf_objectv1.SrcTypeMetadataMapFields{
				IconDefault:  metadata.MapFields.IconDefault,
				IconConfig:   iconConfigs,
				ColorDefault: metadata.MapFields.ColorDefault,
				ColorConfig:  colorConfigs,
			},
		},
	}

	return protoSrcType, nil
}
