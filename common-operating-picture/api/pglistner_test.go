package api

import (
	"testing"
	"time"

	"github.com/google/uuid"
	geos "github.com/twpayne/go-geos"
)

var Test_parsePgNotifyPayloadTests = []struct {
	test string

	id             string
	ts             string
	srcType        string
	geojson        string
	search         string
	tdfblob        string
	tdfblobDecoded string
}{
	{
		test:    "valid payload",
		id:      uuid.New().String(),
		ts:      time.Now().Format(pgTimeFormat),
		srcType: "test",
		geojson: `{"type":"Point","crs":{"type":"name","properties":{"name":"EPSG:4326"}},"coordinates":[-89.247895,23.741408]}`,
		search:  `{"terms": ["example", "mock", "fake"], "weight": 5, "flagged": true}`,
		tdfblob: "\\\\x65794a30615852735a534936496c526f5a5342306147567549474e68626934694c434a6a623235305a573530496a6f6956" +
			"3268686443426b6279426a624856746343427a627942756232356c49475a7663694276646d56794948526f61584d67636d566e64577868636d7" +
			"835494735705a32683062486b75496977695958563061473979496a6f6952475673624745675447566f626d56794969776963323931636d4e6c" +
			"496a6f6952334a685a5731686448526c636977675357356a4c694973496d646c6279493665333139",
		tdfblobDecoded: "eyJ0aXRsZSI6IlRoZSB0aGVuIGNhbi4iLCJjb250ZW50IjoiV2hhdCBkbyBjbHVtcCBzbyBub25lIGZvciBvdmVyIHRoaXM" +
			"gcmVndWxhcmx5IG5pZ2h0bHkuIiwiYXV0aG9yIjoiRGVsbGEgTGVobmVyIiwic291cmNlIjoiR3JhZW1hdHRlciwgSW5jLiIsImdlbyI6e319",
	},
	{
		test:           "valid payload with emptys",
		id:             uuid.New().String(),
		ts:             time.Now().Format(pgTimeFormat),
		srcType:        "test",
		geojson:        "null",
		search:         "null",
		tdfblob:        "null",
		tdfblobDecoded: "",
	},
}

func Test_parsePgNotifyPayload(t *testing.T) {
	for _, tt := range Test_parsePgNotifyPayloadTests {
		t.Run(tt.test, func(t *testing.T) {
			payload := `
				{
					"id": "` + tt.id + `",
					"ts":"` + tt.ts + `",
					"src_type":"` + tt.srcType + `",
					"geo":` + tt.geojson + `,
					"search":` + tt.search + `,
					"tdf_blob":"` + tt.tdfblob + `",
					"tdf_uri":null
				}
			`
			object, err := parsePgNotifyPayload(payload)
			if err != nil {
				t.Fatalf("parsePgNotifyPayload failed: %v", err)
			}
			if object.ID.String() != tt.id {
				t.Errorf("object.ID = %v; want %s", object.ID.String(), tt.id)
			}
			if object.Ts.Time.Format(pgTimeFormat) != tt.ts {
				t.Errorf("object.Ts = %v; want %s", object.Ts.Time.Format(time.RFC3339), tt.ts)
			}
			if object.SrcType != tt.srcType {
				t.Errorf("object.SrcType = %v; want %s", object.SrcType, tt.srcType)
			}

			if tt.geojson != "null" && tt.geojson != "" {
				ttgeom, err := geos.NewGeomFromGeoJSON(tt.geojson)
				if err != nil {
					ttgeom, _ = geos.NewGeomFromGeoJSON(`{"type":"Point","coordinates":[0,0]}`)
				}
				if object.Geo.ToGeoJSON(0) != ttgeom.ToGeoJSON(0) {
					t.Errorf("object.Geo = %v; want %s", object.Geo.ToGeoJSON(0), ttgeom.ToGeoJSON(0))
				}
			} else {
				if object.Geo != nil {
					t.Errorf("object.Geo = %v; want nil", object.Geo)
				}
			}

			if string(object.Search) != tt.search {
				t.Errorf("object.Search = %v; want %s", string(object.Search), tt.search)
			}
			if string(object.TdfBlob) != tt.tdfblobDecoded {
				t.Errorf("object.TdfBlob = %s; want %s", object.TdfBlob, tt.tdfblobDecoded)
			}
		})
	}
}
