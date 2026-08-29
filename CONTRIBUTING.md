# Contributing Guide

## Prerequisites

This guide assumes you are on macOS and have homebrew installed.

Install docker:

```shell
brew install --cask docker
```

Install Python 3. We recommend using [uv](https://docs.astral.sh/uv/#installation) to manage
Python and Python virtual environments:

```shell
curl -LsSf https://astral.sh/uv/install.sh | sh
uv python install 3.12 --default --preview
uv venv .venv/
source .venv/bin/activate
uv sync
```

Install Ruby. We recommend using `rbenv` to manage Ruby versions:

```shell
brew install rbenv
rbenv install 3.4.2
rbenv local 3.4.2
```

Install Ruby dependencies:

```shell
sudo gem install bundler
bundle install
```

## CLI

We use [Task](https://taskfile.dev) as the project CLI.

List commands with `task` or `task --list`:

```shell
$ task
task: Available tasks for this project:
* default:       list all tasks
* build:         build docker image
* run:           run docker image in interactive mode
* serve:         serve jekyll site
* update:        update Ruby dependencies locally (requires bundler)
```

## Lichess ratings snapshot

The homepage Blitz/Rapid charts read [`assets/data/lichess-rating-history.json`](assets/data/lichess-rating-history.json), refreshed by [`.github/workflows/lichess-ratings-snapshot.yml`](.github/workflows/lichess-ratings-snapshot.yml). Lichess only computes rating history for authenticated API calls, so the workflow uses a personal access token.

`LICHESS_TOKEN` is a **GitHub Actions repo secret only**. It is not a local env var and is **not** required for `task serve`: Jekyll serves the committed snapshot (or the browser falls back to the public games API if the file is missing).

1. Create a token at [lichess.org/account/oauth/token](https://lichess.org/account/oauth/token) (no special scopes required).
2. Add it as the repo secret `LICHESS_TOKEN` (Settings → Secrets and variables → Actions).
3. Run **Snapshot Lichess rating history** once from the Actions tab (`workflow_dispatch`), then daily cron keeps it fresh.

## Update Ruby dependencies

```shell
bundle update
```
