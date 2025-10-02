-- name: CreateTdfObjects :batchone
INSERT INTO tdf_objects (ts, src_type, geo, search, tdf_blob, tdf_uri)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- name: UpdateTdfObject :one
UPDATE tdf_objects
SET ts = $2,
    src_type = $3,
    geo = $4,
    search = $5,
    tdf_blob = $6,
    tdf_uri = $7
WHERE id = $1
RETURNING id, src_type, ts;

-- name: DeleteTdfObject :one
DELETE FROM tdf_objects
WHERE id = $1
RETURNING *;

-- name: GetTdfObject :one
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, tdf_blob, tdf_uri
FROM tdf_objects 
WHERE
  id = $1
LIMIT 1;

-- name: ListTdfObjects :many
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, tdf_blob, tdf_uri
FROM tdf_objects
WHERE src_type = sqlc.arg('SourceType')::TEXT AND ts >= sqlc.arg('StartTime')::TIMESTAMP AND ts <= sqlc.arg('EndTime')::TIMESTAMP
ORDER BY ts DESC;

-- name: ListTdfObjectsWithGeo :many
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, tdf_blob, tdf_uri
FROM tdf_objects
WHERE src_type = sqlc.arg('SourceType')::TEXT AND ts >= sqlc.arg('StartTime')::TIMESTAMP AND ts <= sqlc.arg('EndTime')::TIMESTAMP
  AND ST_Within(geo, sqlc.arg('Geometry')::GEOMETRY)
ORDER BY ts DESC;

-- name: ListTdfObjectsWithSearch :many
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, tdf_blob, tdf_uri
FROM tdf_objects
WHERE src_type = sqlc.arg('SourceType')::TEXT AND ts >= sqlc.arg('StartTime')::TIMESTAMP AND ts <= sqlc.arg('EndTime')::TIMESTAMP
  AND search @> sqlc.arg('Search')::JSONB
ORDER BY ts DESC;

-- name: ListTdfObjectsWithSearchAndGeo :many
SELECT id, ts, src_type, ST_Centroid(geo)::GEOMETRY AS geo, search, tdf_blob, tdf_uri
FROM tdf_objects
WHERE src_type = sqlc.arg('SourceType')::TEXT AND ts >= sqlc.arg('StartTime')::TIMESTAMP AND ts <= sqlc.arg('EndTime')::TIMESTAMP
  AND search @> sqlc.arg('Search')::JSONB
  AND ST_Within(geo, sqlc.arg('Geometry')::GEOMETRY)
ORDER BY ts DESC;

-- name: GetSrcType :one
SELECT id, form_schema, ui_schema, metadata
FROM src_types
WHERE id = $1;

-- name: ListSrcTypes :many
SELECT id
FROM src_types;
