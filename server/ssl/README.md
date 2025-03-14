# PostgreSQL SSL Configuration

This directory should contain your SSL certificates for PostgreSQL when running in secure mode.

## For Development

In development, you can use the `DB_SSL_MODE=disable` in your `.env` file to disable SSL requirements.

## For Production

For production deployments, you should generate proper SSL certificates and enable SSL:

1. Generate self-signed certificates (for testing):

```bash
# Generate a self-signed certificate
openssl req -new -x509 -days 365 -nodes -text -out server.crt \
  -keyout server.key -subj "/CN=postgres"

# Set permissions
chmod 600 server.key
```

2. Update your `.env` file:

```
DB_SSL_MODE=require
```

3. Uncomment the SSL-related lines in `docker-compose.yml`:

```yaml
volumes:
  - ./ssl/server.crt:/var/lib/postgresql/server.crt:ro
  - ./ssl/server.key:/var/lib/postgresql/server.key:ro
command: >
  -c ssl=on
  -c ssl_cert_file=/var/lib/postgresql/server.crt
  -c ssl_key_file=/var/lib/postgresql/server.key
```

For more advanced SSL configurations, see the PostgreSQL documentation:
https://www.postgresql.org/docs/current/ssl-tcp.html