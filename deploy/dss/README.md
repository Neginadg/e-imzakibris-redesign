# Self-hosted DSS validation service

The signature verification feature on `/support/verify.html` calls `POST /api/verify-signature`,
which forwards uploaded files to a DSS (Digital Signature Service) REST validation endpoint.
By default it uses the EU's public demo instance, which is not meant for production traffic
(no SLA, can be rate-limited or change without notice).

This builds the official [esig/dss-demonstrations](https://github.com/esig/dss-demonstrations)
webapp (Tomcat, deployed at the container root) and exposes it on port 8080.

## Run it

Needs Docker with BuildKit (for the git build context).

```
cd deploy/dss
docker compose up -d --build
```

First build compiles the Java project with Maven, so it takes a while and needs outbound
network access. The service listens on `http://<host>:8080/`.

## Point the app at it

Put the container behind HTTPS (reverse proxy such as Caddy/Nginx/Traefik, or a platform
that terminates TLS for you), then in Vercel Project Settings -> Environment Variables set:

```
DSS_VALIDATION_URL=https://<your-dss-host>/services/rest/validation/validateSignature
```

`api/verify-signature.js` reads this env var and falls back to the public EU demo only when
it's unset.

## Verify it works

```
curl -X POST https://<your-dss-host>/services/rest/validation/validateSignature \
  -H "Content-Type: application/json" -H "Accept: application/json" \
  -d '{"signedDocument":{"bytes":"","name":"test.pdf"},"originalDocuments":[],"policy":null,"tokenExtractionStrategy":"NONE","signatureId":null}'
```

A response of `DSSDocument is null` (HTTP 500) means the endpoint is reachable and working —
that's the expected error for an empty/invalid document, not a routing failure.
