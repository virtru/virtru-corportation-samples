# check=skip=SecretsUsedInArgOrEnv
# Node 22.2.0
FROM node:22-alpine AS ui-builder
# Define frontend Vite build args and read them in from the environment
ARG VITE_TILE_SERVER_URL
ARG VITE_GRPC_SERVER_URL
ARG VITE_DSP_BASE_URL
ARG VITE_DSP_KAS_URL
ARG VITE_DSP_KC_SERVER_URL
ARG VITE_DSP_KC_CLIENT_ID
ARG VITE_DSP_KC_DIRECT_AUTH

ENV VITE_TILE_SERVER_URL=$VITE_TILE_SERVER_URL
ENV VITE_GRPC_SERVER_URL=https://local-dsp.virtru.com:5002
#ENV VITE_GRPC_SERVER_URL=$VITE_GRPC_SERVER_URL
ENV VITE_DSP_BASE_URL=$VITE_DSP_BASE_URL
ENV VITE_DSP_KAS_URL=$VITE_DSP_KAS_URL
ENV VITE_DSP_KC_SERVER_URL=$VITE_DSP_KC_SERVER_URL
ENV VITE_DSP_KC_CLIENT_ID=$VITE_DSP_KC_CLIENT_ID
ENV VITE_DSP_KC_DIRECT_AUTH=$VITE_DSP_KC_DIRECT_AUTH

WORKDIR /app
COPY ui/package.json ui/package-lock.json ./
RUN npm ci
COPY ui/ .

COPY /sample.federal_policy.yaml /sample.federal_policy.yaml
RUN npm run build

# Geos builder libgeos-dev
FROM cgr.dev/chainguard/wolfi-base@sha256:c519d1c81a18a5c752f701bc59ceddfa4bf1a44e9bb605c73856cef216f69f7b AS geos-builder

RUN apk add --no-cache geos geos-dev

# Go 1.24.2
FROM cgr.dev/chainguard/go@sha256:dc53da3597aa89079c0bd3f402738bf910f2aa635f23d42f29b7e534a61e8149 AS go-setup
ARG TARGETOS TARGETARCH

# Copy libgeos from the intermediate stage
COPY --from=geos-builder /usr/lib/libgeos* /usr/lib/
COPY --from=geos-builder /usr/include/geos/ /usr/include/geos/
COPY --from=geos-builder /usr/include/geos_c.h /usr/include/
COPY --from=geos-builder /usr/include/geos.h /usr/include/
COPY --from=geos-builder /usr/lib/pkgconfig/geos.pc /usr/lib/pkgconfig/geos.pc

WORKDIR /app
COPY --from=ui-builder /app/dist /app/ui/dist
COPY go.mod go.mod
COPY go.sum go.sum
COPY main.go main.go
COPY embed.go embed.go
COPY db/ db/
COPY api/ api/
COPY cmd/ cmd/
COPY pkg/ pkg/

FROM go-setup AS builder

RUN go mod download \
  && go mod verify

RUN GOOS=$TARGETOS GOARCH=$TARGETARCH go build -tags embedfiles -o dsp-cop .

# glic-dynamic 14.2
FROM cgr.dev/chainguard/glibc-dynamic@sha256:ef35f036cfe4d7ee20107ab358e038da0be69e93304c8c62dc8e5c0787d9a9c5

# Copy libgeos from the intermediate stage
COPY --from=geos-builder /usr/lib/libgeos* /usr/lib/
COPY --from=geos-builder /usr/include/geos/ /usr/include/geos/
COPY --from=geos-builder /usr/include/geos_c.h /usr/include/
COPY --from=geos-builder /usr/include/geos.h /usr/include/
COPY --from=geos-builder /usr/lib/pkgconfig/geos.pc /usr/lib/pkgconfig/geos.pc

COPY --from=builder /app /app

COPY --from=builder /app/dsp-cop /usr/bin/

ENTRYPOINT ["/usr/bin/dsp-cop", "serve"]
