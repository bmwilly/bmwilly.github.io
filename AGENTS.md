# AGENTS.md

Guidance for AI coding agents working in this repository.

Human setup, CLI details, and snapshot secrets live in [CONTRIBUTING.md](CONTRIBUTING.md).

## Project Overview

Brandon Williams' personal website ([bmwilly.github.io](https://bmwilly.github.io)) built with Jekyll and hosted on GitHub Pages. The site uses the jekyll-theme-hacker theme. The codebase has a hybrid Ruby/Python setup with Docker for local development.

## Development Commands

The project CLI is [Task](https://taskfile.dev) (`Taskfile.yml`). List tasks with `task` or `task --list`.

### Jekyll Site Development

```bash
task serve                    # Build Docker image and serve Jekyll at localhost:4000
task run                      # Build and run Docker container in interactive mode
task build                    # Build the bmwilly.github.io Docker image
task update                   # Run bundle update locally (requires bundler)
```

### Python Development

Python tooling uses uv:

```bash
uv sync                       # Install dependencies from uv.lock
python main.py                # Prints "Hello from bmwilly-github-io!"
ruff check                    # Lint Python code
ruff format                   # Format Python code
```

### Manual Jekyll Commands (if working without Docker)

```bash
bundle install                # Install Ruby dependencies
bundle exec jekyll serve      # Serve site locally
bundle exec jekyll build      # Build the site
```

## Architecture

### Jekyll Structure

- `_config.yml`: Site configuration with theme, plugins, and metadata
- `index.md`: Homepage content with personal information, links, and widgets
- `_includes/`: Reusable template components (analytics, homepage widgets)
- `_data/`: Committed JSON snapshots inlined at Jekyll build time (browser never calls third-party APIs)

### Hybrid Tooling Setup

- **Ruby/Jekyll**: Primary website framework with GitHub Pages deployment
- **Python**: Auxiliary scripts (e.g. Last.fm snapshot fetch) plus a placeholder `main.py`
- **Docker**: Development environment for consistent Jekyll serving
- **uv**: Python package management

### Dependencies

- **Jekyll Plugins**: jekyll-feed, jekyll-target-blank, jekyll-resize
- **Theme**: jekyll-theme-hacker
- **Python**: loguru for logging, ruff for linting/formatting

### Deployment

The site deploys automatically to GitHub Pages when changes are pushed to the main branch. The `github-pages` gem keeps local development aligned with GitHub Pages. Snapshot workflows commit `_data` JSON; `jekyll-gh-pages.yml` also rebuilds via `workflow_run` after those jobs (their `GITHUB_TOKEN` pushes do not trigger other `push` workflows).

### Homepage snapshots

Widgets read committed `_data` JSON. There is no local crontab. GitHub Actions workflows under `.github/workflows/` refresh those files on a schedule. `LICHESS_TOKEN` and `LASTFM_API_KEY` are GitHub Actions repo secrets only; they are not required for `task serve`. If a snapshot file is missing, the widget must fail loudly rather than calling the third-party API from the browser.

## Key Files

- `Dockerfile`: Ruby 3.4.2-based container for Jekyll development
- `Taskfile.yml`: Project CLI for Docker-based development
- `Gemfile`: Ruby dependencies and Jekyll plugins
- `pyproject.toml`: Python project configuration
- `_config.yml`: Jekyll site configuration
