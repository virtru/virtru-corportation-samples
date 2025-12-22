-- name: CreateTdfObjects :batchone
INSERT INTO tdf_objects (ts, src_type, geo, search, metadata, tdf_blob, tdf_uri)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING id;

-- name: UpdateTdfObject :one
UPDATE tdf_objects
SET ts = COALESCE(sqlc.narg('ts'), ts),
    src_type = COALESCE(sqlc.narg('src_type'), src_type),
    geo = COALESCE(sqlc.narg('geo'), geo),
    search = COALESCE(sqlc.narg('search'), search),
    metadata = COALESCE(sqlc.narg('metadata'), metadata),
    tdf_blob = COALESCE(sqlc.narg('tdf_blob'), tdf_blob),
    tdf_uri = COALESCE(sqlc.narg('tdf_uri'), tdf_uri)
WHERE id = $1
RETURNING id, src_type, ts;

-- name: DeleteTdfObject :one
DELETE FROM tdf_objects
WHERE id = $1
RETURNING *;

-- name: GetTdfObject :one
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, metadata, tdf_blob, tdf_uri
FROM tdf_objects
WHERE
  id = $1
LIMIT 1;

-- name: ListTdfObjects :many
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, metadata, tdf_blob, tdf_uri
FROM tdf_objects
WHERE src_type = sqlc.arg('SourceType')::TEXT AND ts >= sqlc.arg('StartTime')::TIMESTAMP AND ts <= sqlc.arg('EndTime')::TIMESTAMP
ORDER BY ts DESC;

-- name: ListTdfObjectsWithGeo :many
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, metadata, tdf_blob, tdf_uri
FROM tdf_objects
WHERE src_type = sqlc.arg('SourceType')::TEXT AND ts >= sqlc.arg('StartTime')::TIMESTAMP AND ts <= sqlc.arg('EndTime')::TIMESTAMP
  AND ST_Within(geo, sqlc.arg('Geometry')::GEOMETRY)
ORDER BY ts DESC;

-- name: ListTdfObjectsWithSearch :many
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, metadata, tdf_blob, tdf_uri
FROM tdf_objects
WHERE src_type = sqlc.arg('SourceType')::TEXT AND ts >= sqlc.arg('StartTime')::TIMESTAMP AND ts <= sqlc.arg('EndTime')::TIMESTAMP
  AND search @> sqlc.arg('Search')::JSONB
ORDER BY ts DESC;

-- name: ListTdfObjectsWithMetadata :many
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, metadata, tdf_blob, tdf_uri
FROM tdf_objects
WHERE src_type = sqlc.arg('SourceType')::TEXT AND ts >= sqlc.arg('StartTime')::TIMESTAMP AND ts <= sqlc.arg('EndTime')::TIMESTAMP
  AND metadata @> sqlc.arg('Metadata')::JSONB
ORDER BY ts DESC;

-- name: ListTdfObjectsWithSearchAndGeo :many
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, metadata, tdf_blob, tdf_uri
FROM tdf_objects
WHERE src_type = sqlc.arg('SourceType')::TEXT AND ts >= sqlc.arg('StartTime')::TIMESTAMP AND ts <= sqlc.arg('EndTime')::TIMESTAMP
  AND search @> sqlc.arg('Search')::JSONB
  AND ST_Within(geo, sqlc.arg('Geometry')::GEOMETRY)
ORDER BY ts DESC;

-- name: GetSrcType :one
SELECT id, form_schema, ui_schema, metadata
FROM src_types
WHERE id = $1;

-- name: GetNotesFromPar :many
SELECT id, ts, parent_id, search, tdf_blob, tdf_uri
FROM tdf_notes
WHERE parent_id = $1;

-- name: ListSrcTypes :many
SELECT id
FROM src_types;

-- name: getNotesByParent :many
SELECT id, ts, parent_id, tdf_blob, search, tdf_uri
FROM tdf_notes
WHERE parent_id = $1
ORDER BY ts DESC;

-- name: GetNoteByID :one
SELECT id, ts, parent_id, tdf_blob, search, tdf_uri
FROM tdf_notes
where id = $1;

-- name: CreateNoteObject :batchone
INSERT INTO tdf_notes (ts, parent_id, search, tdf_blob, tdf_uri)
VALUES ($1, $2, $3, $4, $5)
RETURNING id;
