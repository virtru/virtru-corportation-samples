package mock

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"time"

	"github.com/brianvoe/gofakeit/v7"
	geos "github.com/twpayne/go-geos"
	"github.com/virtru-corp/dsp-cop/pkg/geo"
)

type MockSearch struct {
	Terms   []string `json:"terms"`
	Weight  int      `json:"weight"`
	Flagged bool     `json:"flagged"`
}

type MockTdf struct {
	Title   string     `json:"title"`
	Content string     `json:"content"`
	Author  string     `json:"author"`
	Source  string     `json:"source"`
	Geo     *geos.Geom `json:"geo"`
}

type MockRecord struct {
	Ts      time.Time
	SrcType string
	Geo     *geos.Geom
	Search  []byte // json encoded MockSearch
	TdfBlob []byte // base64 encoded MockTdf
}

var tsEarliest = time.Date(2000, 1, 1, 0, 0, 0, 0, time.UTC)

var minSharedTerms = 1
var maxSharedTerms = 3
var sharedTerms = []string{"test", "data", "example", "mock", "fake", "record"}

var minWeight = 0
var maxWeight = 10

func CreateMockRecord(sourceType string) MockRecord {
	faker := gofakeit.New(0)

	// choose range of sharedTerms
	terms := []string{}
	for i := 0; i < faker.Number(minSharedTerms, maxSharedTerms); i++ {
		// choose a term that hasn't been used yet
		for {
			termIndex := faker.Number(0, len(sharedTerms)-1)
			if slices.IndexFunc(terms, func(t string) bool { return t == sharedTerms[termIndex] }) == -1 {
				terms = append(terms, sharedTerms[termIndex])
				break
			}
		}
	}

	search := MockSearch{
		Terms:   terms,
		Weight:  faker.Number(minWeight, maxWeight),
		Flagged: faker.Bool(),
	}
	searchJSON, err := json.Marshal(search)
	if err != nil {
		panic(errors.Join(fmt.Errorf("error marshaling search json"), err))
	}

	tdf := MockTdf{
		Title:   faker.Sentence(3),
		Content: faker.Sentence(10),
		Author:  faker.Name(),
		Source:  faker.Company(),
		Geo:     geos.NewPoint([]float64{faker.Latitude(), faker.Longitude()}).SetSRID(geo.DEFAULT_SRID),
	}
	tdfJSON, err := json.Marshal(tdf)
	if err != nil {
		panic(errors.Join(fmt.Errorf("error marshaling tdf json"), err))
	}
	tdfBlob := []byte(base64.StdEncoding.EncodeToString(tdfJSON))

	ts := faker.DateRange(tsEarliest, time.Now())

	return MockRecord{
		Ts:       ts,
		SrcType:  strings.ToLower(sourceType),
		Geo:      tdf.Geo,
		Search:   searchJSON,
		TdfBlob: tdfBlob,
	}
}
