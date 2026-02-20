#!/usr/bin/env bash
# Generate a self-signed TLS certificate for local/development use.
# For production, replace with certs from Let's Encrypt or your CA.
set -euo pipefail

CERT_DIR="${1:-/etc/nginx/certs}"
mkdir -p "$CERT_DIR"

openssl req -x509 -newkey rsa:2048 -days 365 -nodes \
  -keyout "$CERT_DIR/vibemap.key" \
  -out    "$CERT_DIR/vibemap.crt" \
  -subj   "/CN=localhost/O=VibeMap" \
  -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"

echo "Cert written to $CERT_DIR"
openssl x509 -noout -subject -dates -in "$CERT_DIR/vibemap.crt"
