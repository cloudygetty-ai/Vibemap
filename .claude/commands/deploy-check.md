Check the Vibemap deployment readiness. Follow these steps in order:

1. **Run tests** — `npm test --prefix server`. All 18 must pass. Stop and report if any fail.

2. **Check services** — verify each is responding:
   - PostgreSQL: `pg_isready`
   - Redis: `redis-cli ping`
   - Server: `curl -s http://localhost:4000/health`
   - Client: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
   - HTTPS (nginx): `curl -sk https://localhost/health`

3. **If any service is down**, restart it natively (NEVER use Docker — see CLAUDE.md):
   - PostgreSQL: `pg_ctlcluster 16 main start`
   - Redis: `redis-server --daemonize yes`
   - Server: use the env vars in CLAUDE.md, start with `npm start --prefix server`
   - Client: `PORT=3000 npm start --prefix client`
   - nginx: `nginx -s reload` or `nginx`

4. **Re-verify** all endpoints after any restarts.

5. **Report** with a table:
   | Service | Status | Notes |
   |---------|--------|-------|
   | PostgreSQL | ✅/❌ | ... |
   | Redis | ✅/❌ | ... |
   | Server :4000 | ✅/❌ | ... |
   | Client :3000 | ✅/❌ | ... |
   | HTTPS :443 | ✅/❌ | ... |
   | Unit tests | ✅/❌ | N/18 pass |
