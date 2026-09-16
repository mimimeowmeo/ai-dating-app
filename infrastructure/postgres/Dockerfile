# PostgreSQL 18 + pgvector + PostGIS
#
# Why not postgis/postgis? That image is amd64-only and would run under emulation on Apple Silicon.
# pgvector/pgvector is multi-arch (amd64 + arm64) and is built on the official postgres image,
# which already has the PostgreSQL apt repository (apt.postgresql.org) configured.
FROM pgvector/pgvector:0.8.6-pg18-trixie

ARG POSTGIS_MAJOR=3

# Install PostGIS for this PostgreSQL major version, then clean the apt cache to keep the image small.
RUN apt-get update \
  && apt-get install -y --no-install-recommends "postgresql-${PG_MAJOR}-postgis-${POSTGIS_MAJOR}" \
  && rm -rf /var/lib/apt/lists/*

# Scripts in this folder run once, only when the data volume is empty (first start).
COPY init/ /docker-entrypoint-initdb.d/
