package api

import (
	"encoding/base64"
	"encoding/json"

	"github.com/brianvoe/gofakeit/v7"
	tdf_objectv1 "github.com/virtru-corp/dsp-cop/api/proto/tdf_object/v1"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"
	"google.golang.org/protobuf/types/known/timestamppb"
)

type LatLng struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type Sitrep struct {
	Misson      string `json:"mission"`
	Reporter    string `json:"reporter"`
	Description string `json:"description"`
	Location    LatLng `json:"location"`
}

func GetMockDataObjects(size int) []*tdf_objectv1.TdfObject {
	var dataObjects []*tdf_objectv1.TdfObject

	for i := 0; i < size; i++ {
		geo := LatLng{
			Lat: gofakeit.Latitude(),
			Lng: gofakeit.Longitude(),
		}

		geoJson, err := json.Marshal(geo)
		if err != nil {
			panic(err)
		}

		sitrep := Sitrep{
			Misson: cases.Caser.String(
				cases.Title(language.English),
				gofakeit.Phrase(),
			),
			Reporter:    gofakeit.Name(),
			Description: gofakeit.Sentence(10),
			Location: LatLng{
				Lat: gofakeit.Latitude(),
				Lng: gofakeit.Longitude(),
			},
		}

		sitrepJson, err := json.Marshal(sitrep)
		if err != nil {
			panic(err)
		}

		// base64 encoding used as a TDF encryption simulation
		tdfBase64 := base64.StdEncoding.EncodeToString(sitrepJson)

		dataObjects = append(dataObjects, &tdf_objectv1.TdfObject{
			Id:      gofakeit.UUID(),
			Geo:     string(geoJson),
			Ts:      timestamppb.Now(),
			SrcType: "NiFi",
			TdfBlob: []byte(tdfBase64),
		})
	}
	return dataObjects
}
