# uma-platform — working notes for Claude

- `AGENTS.md` holds the shared rules. `docs/architecture.md` and `docs/roadmap.md` are the cross-game plan that every
  Uma repo follows.
- Claude drives the roadmap across all the repos (uma-platform, uma-racer, uma-rpg, uma-puzzle, uma-quest, uma-farm). Keep the roadmap's
  status current when a phase starts or ends.
- The owner prefers **no open questions**: when a sensible default exists, decide with a recommendation and log it in
  `docs/decisions.md`.
- The master data pipeline starts as a port of uma-racer's `scripts/data` and `scripts/assets` (on `origin/main`;
  the local uma-racer checkout may sit on an old branch). Check how uma-racer solved something before inventing a new
  pattern.
- **Local gcloud has two accounts, and the active one is the owner's work account. Never change it.** Scope every
  command with `CLOUDSDK_ACTIVE_CONFIG_NAME` and `CLOUDSDK_CORE_PROJECT`. Never run `gcloud config set …`.
- Never type credentials into sign-in pages.
- **"Both apps:" requests run here** ([docs/change-protocol.md](docs/change-protocol.md)): change the kit, test it locally in both
  games (their checks and dev servers; never the iOS Simulator, P60), release, then message the uma-rpg and
  uma-racer sessions to pin it, or pin a game yourself when its session isn't running.
- **Claude commits and pushes to `main`** in Conventional Commits style (owner, 2026-10-10). Delegated agents use a branch and a pull request. Check `git status` before every commit: no original-game content.

## The current work

- **The new apps:** [docs/new-apps/README.md](docs/new-apps/README.md) (P97, NA1–NA11) is what uma-quest's first slice and
  uma-farm's first playable farm need from here, in order: UA5 and UA6 first, then UA8 and UA10, then KL1 and PO1 when
  their requests arrive. The [handoff](docs/handoff/README.md) has the packets; write the missing ones from the brief.
- **Uma sprites:** [docs/sprites/format.md](docs/sprites/format.md) and [pipeline.md](docs/sprites/pipeline.md) (CR1–CR34).
  Uma sprites derive from original art, so they're private: `content/authoring/sprites/` and master data's private
  release only, never git or uma-art. Props, bubbles, kits and foes are original and go to uma-art.
- New decisions go in `docs/decisions.md` from P99 (fetch `main` first).

## Autonomy: what you do without asking

The owner gave every session full autonomy to commit, publish and deploy (2026-11-08). Do the work end to end:
- **Commit and push to `main`**, then watch CI (`gh run watch <id> -R luismlorenzana/uma-platform --exit-status`) and fix
  forward if it fails.
- **Release packages:** a changeset with the change; on `main`, `pnpm version-packages`, commit and push; the release
  workflow publishes. Then tell the games' sessions to pin it, or pin a game yourself (the "Both apps" flow).
- **Publish master data** with `pnpm release:publish`: `--channel candidate` first, read it back with the client, then
  `latest`. Sprites publish sprite-only (UA5), and only sets whose `reviews.json` approval matches their current hashes.
  The owner's set approval is the go.
- **Back up** `content/authoring/` with `pnpm sprites:backup` to `gs://uma-platform-authoring`.
- **Write packets ahead,** work them in order, flag each done and log its P-decision. Merge your own pull requests;
  review ChatGPT's with must-fixes only (a broken rule, original-game content, a failing check, a real bug), and take a
  ChatGPT code packet that blocks a release.
- **Read and change sibling repos** (`~/workspace/uma-rpg`, `uma-racer`, `uma-quest`, `uma-farm`) for a step a packet or a
  "Both apps" request names, following that repo's CLAUDE.md. Keep `docs/roadmap.md` current when a phase moves.

**Ask in one line, then do it yourself:**
- creating or deleting cloud resources, or changing IAM, beyond what a packet already lists, with a free-tier cost
  table;
- making anything public: a repo, a bucket, a URL to private data;
- a master data release that removes or renames anything a live game reads (a schema major).

**Never:** publish uma-art (ChatGPT's, end to end), put Uma art in uma-art or git, change the active gcloud account, or
type credentials into a sign-in page. Scope gcloud with `CLOUDSDK_ACTIVE_CONFIG_NAME=default` and
`CLOUDSDK_CORE_PROJECT=uma-platform-lm` here (the master and authoring buckets), or `uma-rpg` for the games' project.

## How the owner works

- **No open questions:** decide with a recommendation when a sensible default exists, and log it.
- **Plain answers:** answer the literal question first. Prefer the smallest fix over a redesign, and use a task table
  when work spreads.
- **Scope:** build the owner's spec literally, with no inherited filters. Deferred topics are discussion only.
- **The owner runs nothing:** never hand them a command. Their steps are only what needs their hands: a review, a play, a
  console entry with no API. Ask for one in one line, with the link.
- **Packets ahead:** keep the queue written ahead of the work, so a session can always pick up the next one.
- **Reviews and status messages:**
  - list every HTML page and doc as a clickable link;
  - present every call (its id and one line), not highlights.
- **Docs:** clear, visual, full depth, each with a desktop HTML page. uma-rpg's
  `docs/design/tier-rework/class-progression.md` is the bar.
- **Lean assets:** features first, and the cheapest art that looks fine; no heavy pipelines.
- **Cloud cost up front:** a free-tier cost table whenever a cloud resource is added.
- **Art is ChatGPT's end to end:** every art packet goes to ChatGPT, which draws, merges, versions and publishes the
  uma-art release. The game's packet that first uses the art pins it.

## Building and running

The commands are in [README.md](README.md) ("Develop", "Make a master data release", "Releasing a package"):
`NODE_AUTH_TOKEN=$(gh auth token) pnpm install`, `pnpm lint`, `pnpm test`, `pnpm build`, and the `sprites:*` tools.
The Uma Studio runs locally with `pnpm studio` (http://127.0.0.1:4318): the tier boards ([docs/authoring/tiers.md](docs/authoring/tiers.md))
and the sprite tools.
