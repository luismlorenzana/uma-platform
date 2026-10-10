# Changesets

Every change to a published package (`packages/*`) needs a changeset: run `pnpm changeset`, pick the package and the
bump, and describe the change for game sessions that will upgrade.

For `@luismlorenzana/uma-data` the bump follows the schema rules in `AGENTS.md`: additive changes are a minor;
removing, renaming or changing the meaning of a field is a major (a new schema major, with a `docs/decisions.md` entry).

See the README's "Releasing a package" section for how versions reach GitHub Packages.
