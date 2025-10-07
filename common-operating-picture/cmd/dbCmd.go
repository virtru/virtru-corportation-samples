package cmd

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/spf13/cobra"
	"github.com/virtru-corp/dsp-cop/db"
	"github.com/virtru-corp/dsp-cop/pkg/geo"
	"github.com/virtru-corp/dsp-cop/pkg/mock"
)

const dbGetStreamByRangeCmdLong = `
List stream items between two timestamps.

If only one timestamp is provided, the command will list all stream items after that timestamp.
`

var reDateYYYYMM = regexp.MustCompile(`^\d{4}-\d{2}$`)
var reDateYYYYMMDD = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}$`)
var reDateYYYYMMDDHHMM = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$`)
var reDateYYYYMMDDHHMMSS = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?$`)

var (
	dbCtx context.Context
	dbQ   *db.Queries

	dbCmd = &cobra.Command{
		Use:   "db",
		Short: "Database operations",
	}

	dbGetStreamItemCmd = &cobra.Command{
		Use:   "get <id>",
		Args:  cobra.ExactArgs(1),
		Short: "Get stream item",
		Run:   dbGetStreamItem,
	}

	dbListStreamCmd = &cobra.Command{
		Use:   "list <source-type> <from-datetime> [<to-datetime>]",
		Short: "List stream items of a source-type between two timestamps",
		Long:  dbGetStreamByRangeCmdLong,
		Args:  cobra.RangeArgs(2, 3),
		Run:   dbListStream,
	}

	// unimplemented
	dbCreateStreamItemCmd = &cobra.Command{
		Hidden: true,
		Use:    "create <file>",
		Short:  "Create stream item",
		Args:   cobra.MaximumNArgs(1),
	}

	// unimplemented
	dbUpdateStreamItemCmd = &cobra.Command{
		Hidden: true,
		Use:    "update <id>",
		Args:   cobra.ExactArgs(1),
		Short:  "Update stream item",
	}

	dbDeleteStreamItemCmd = &cobra.Command{
		Use:   "delete <id>",
		Args:  cobra.ExactArgs(1),
		Short: "Delete stream item",
		Run:   dbDeleteStreamItem,
	}

	////////////////////////
	// Mock commands
	////////////////////////

	dbMockCmd = &cobra.Command{
		Use:   "mock",
		Short: "Mock database operations",
		Run:   dbMockCreateData,
	}

	dbMockCreateCmd = &cobra.Command{
		Use:   "create",
		Short: "Create mock data",
		Args:  cobra.ExactArgs(1),
		Run:   dbMockCreateData,
	}
)

func init() {
	var conn *pgxpool.Pool
	dbCmd.PersistentPreRun = func(cmd *cobra.Command, args []string) {
		slog.InfoContext(dbCtx, "Connecting to database")
		if conn == nil {
			dbCtx = cmd.Context()
			var err error

			conn, err = db.NewPool(dbCtx, cfg)
			if err != nil {
				slog.ErrorContext(dbCtx, "Error connecting to database", err)
				panic(err)
			}

			dbQ = db.New(conn)
		}
	}

	dbCmd.PersistentPostRun = func(cmd *cobra.Command, args []string) {
		if conn != nil {
			slog.InfoContext(dbCtx, "Closing database connection")
			conn.Close()
		}
	}

	dbMockCmd.AddCommand(dbMockCreateCmd)
	dbCmd.AddCommand(dbMockCmd)

	// C - Create
	dbCmd.AddCommand(dbCreateStreamItemCmd)
	// R - Read
	dbCmd.AddCommand(dbGetStreamItemCmd)
	dbCmd.AddCommand(dbListStreamCmd)
	dbListStreamCmd.Flags().StringP("geometry", "g", "", "Geometry to search for")
	dbListStreamCmd.Flags().StringP("search", "s", "", "JSON search query")
	// U - Update
	dbCmd.AddCommand(dbUpdateStreamItemCmd)
	// D - Delete
	dbCmd.AddCommand(dbDeleteStreamItemCmd)
	rootCmd.AddCommand(dbCmd)
}

func dbGetStreamItem(cmd *cobra.Command, args []string) {
	fmt.Println("Getting data from database")
	id, err := uuid.Parse(args[0])
	if err != nil {
		fmt.Printf("Error parsing UUID %s: %v\n", args[0], err)
		return
	}
	item, err := dbQ.GetTdfObject(dbCtx, id)
	if err != nil {
		fmt.Println("Error getting record", err)
		return
	}
	fmt.Printf("\tGot record %s: %s, %s\n", item.ID.String(), item.SrcType, item.Ts.Time)
}

func dbListStream(cmd *cobra.Command, args []string) {
	sourceType := args[0]
	startTimeInput := args[1]
	endTimeInput := ""
	if len(args) == 3 {
		endTimeInput = args[2]
	}

	parseTime := func(t string) (time.Time, error) {
		// handle short date formats
		if reDateYYYYMM.MatchString(t) {
			t = t + "-01T00:00:00Z"
		} else if reDateYYYYMMDD.MatchString(t) {
			t = t + "T00:00:00Z"
		} else if reDateYYYYMMDDHHMM.MatchString(t) {
			t = t + ":00Z"
		} else if reDateYYYYMMDDHHMMSS.MatchString(t) {
			t = t + "Z"
		}

		return time.Parse(time.RFC3339, t)
	}

	var parseErr error
	endTime := time.Now().UTC()
	startTime, err := parseTime(startTimeInput)
	if err != nil {
		parseErr = err
	}

	// use current time if only one timestamp is provided
	if endTimeInput != "" {
		endTime, err = parseTime(endTimeInput)
		if err != nil {
			parseErr = errors.Join(parseErr, err)
		}
	}

	if parseErr != nil {
		fmt.Printf("Error parsing timestamp(s): %v\n", parseErr)
		return
	}

	msg := fmt.Sprintf("Getting data for %s between %s and %s", sourceType, startTime.String(), endTime.String())

	includeGeo := false
	includeSearch := false
	// check flags

	geometry := cmd.Flag("geometry").Value.String()
	geoGeom := geometry
	if geometry != "" {
		slog.InfoContext(dbCtx, "Searching for geometry", "geometry", geometry)

		// validate the geom
		if !strings.HasPrefix(geometry, "SRID=") {
			geoGeom = "SRID=" + strconv.Itoa(geo.DEFAULT_SRID) + ";" + geometry
		}

		includeGeo = true
	}

	search := cmd.Flag("search").Value.String()
	if search != "" {
		msg += " " + fmt.Sprintf("filtering by search %s", search)
		includeSearch = true
	}

	fmt.Println(msg)

	var items []db.ListTdfObjectsRow
	if includeGeo && includeSearch {
		slog.DebugContext(dbCtx, "Searching for geometry and filtering by search")
		var rows []db.ListTdfObjectsWithSearchAndGeoRow
		rows, err = dbQ.ListTdfObjectsWithSearchAndGeo(dbCtx, db.ListTdfObjectsWithSearchAndGeoParams{
			SourceType: sourceType,
			StartTime:  pgtype.Timestamp{Time: startTime, Valid: true},
			EndTime:    pgtype.Timestamp{Time: endTime, Valid: true},
			Geometry:   geoGeom,
			Search:     []byte(search),
		})
		if err == nil {
			for _, r := range rows {
				items = append(items, db.ListTdfObjectsRow(r))
			}
		}
	} else if includeGeo {
		slog.DebugContext(dbCtx, "Searching for geometry")
		var rows []db.ListTdfObjectsWithGeoRow
		rows, err = dbQ.ListTdfObjectsWithGeo(dbCtx, db.ListTdfObjectsWithGeoParams{
			SourceType: sourceType,
			StartTime:  pgtype.Timestamp{Time: startTime, Valid: true},
			EndTime:    pgtype.Timestamp{Time: endTime, Valid: true},
			Geometry:   geoGeom,
		})
		if err == nil {
			for _, r := range rows {
				items = append(items, db.ListTdfObjectsRow(r))
			}
		}
	} else if includeSearch {
		slog.DebugContext(dbCtx, "Filtering by search")
		var rows []db.ListTdfObjectsWithSearchRow
		rows, err = dbQ.ListTdfObjectsWithSearch(dbCtx, db.ListTdfObjectsWithSearchParams{
			SourceType: sourceType,
			StartTime:  pgtype.Timestamp{Time: startTime, Valid: true},
			EndTime:    pgtype.Timestamp{Time: endTime, Valid: true},
			Search:     []byte(search),
		})
		if err == nil {
			for _, r := range rows {
				items = append(items, db.ListTdfObjectsRow(r))
			}
		}
	} else {
		slog.DebugContext(dbCtx, "Default search type")
		items, err = dbQ.ListTdfObjects(dbCtx, db.ListTdfObjectsParams{
			SourceType: sourceType,
			StartTime:  pgtype.Timestamp{Time: startTime, Valid: true},
			EndTime:    pgtype.Timestamp{Time: endTime, Valid: true},
		})
	}

	if err != nil {
		fmt.Println("Error getting records", err)
		return
	}

	fmt.Printf("...found %d record(s)\n", len(items))
	for _, r := range items {
		fmt.Printf("\t%s: %s, %s\n", r.ID.String(), r.SrcType, r.Ts.Time)
	}
}

func dbDeleteStreamItem(cmd *cobra.Command, args []string) {
	fmt.Println("Deleting data from database")
	id, err := uuid.Parse(args[0])
	if err != nil {
		fmt.Printf("Error parsing UUID %s: %v\n", args[0], err)
		return
	}

	item, err := dbQ.DeleteTdfObject(dbCtx, id)
	if err != nil {
		fmt.Println("Error deleting record", err)
		return
	}
	fmt.Printf("\tDeleted record %s: %s, %s\n", item.ID.String(), item.SrcType, item.Ts.Time)
}

func dbMockCreateData(cmd *cobra.Command, args []string) {
	num := 1
	if len(args) == 1 {
		if n, err := strconv.Atoi(args[0]); err != nil {
			fmt.Printf("Err: Invalid count %s, %v\n", args[0], err)
			return
		} else {
			num = n
		}
	}

	fmt.Printf("Inserting %d record(s) into database\n", num)
	params := make([]db.CreateTdfObjectsParams, num)
	for i := 0; i < num; i++ {
		r := mock.CreateMockRecord("test")
		params[i] = db.CreateTdfObjectsParams{
			SrcType: r.SrcType,
			Ts:      pgtype.Timestamp{Time: r.Ts, Valid: true},
			Geo:     r.Geo,
			Search:  r.Search,
			TdfBlob: r.TdfBlob,
		}
	}

	items := dbQ.CreateTdfObjects(dbCtx, params)
	items.QueryRow(func(i int, id uuid.UUID, err error) {
		if err != nil {
			fmt.Println("Error inserting record", err)
			return
		}
		fmt.Printf("\tInserted record %s\n", id.String())
	})
}
