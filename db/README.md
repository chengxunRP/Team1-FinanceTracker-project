# Database initialization (`db/`)

This folder holds the MySQL initialization file used by Docker Compose when the `spendwise-mysql` container is created for the first time.

## Export your database

Export your current `finance_tracker` database into:

```
db/init.sql
```

Example command:

```bash
mysqldump -u finance_user -p finance_tracker > db/init.sql
```

Use the same database user and credentials you use locally, or adjust the command if your setup differs.

## How Docker Compose uses this file

When you run:

```bash
docker compose up -d --build
```

Docker Compose starts:

- **mysql** — MySQL 8.0 (`spendwise-mysql`)
- **app** — SpendWise application (`spendwise-container`)

On the **first** startup of a new MySQL volume, MySQL runs scripts in `/docker-entrypoint-initdb.d/`. This project mounts `db/init.sql` there, so your schema and data are loaded automatically.

If the MySQL volume already exists, `init.sql` is **not** run again. To re-initialize from scratch:

```bash
docker compose down -v
docker compose up -d --build
```

## Notes

- Create `db/init.sql` before the first `docker compose up` so the mount points to a real SQL file.
- Do not commit `app/.env` — it contains secrets such as `GROQ_API_KEY`.
- Jenkins is separate from Docker Compose; Compose is only for running the SpendWise app and MySQL together locally or on a host.
