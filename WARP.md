# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is Brandon Williams' personal website (bmwilly.github.io) built with Jekyll and hosted on GitHub Pages. The site uses the jekyll-theme-hacker theme and includes Google Analytics tracking. The codebase has a hybrid Ruby/Python setup with Docker for local development.

## Development Commands

### Jekyll Site Development

```bash
# Build and serve the site locally using Docker
make serve                    # Build Docker image and serve Jekyll site at localhost:4000

# Interactive Docker development
make run                      # Build and run Docker container in interactive mode

# Build Docker image only
make build                    # Build the bmwilly.github.io Docker image

# Update Ruby dependencies (requires local bundler)
make update                   # Run bundle update locally
```

### Python Development

The project includes minimal Python tooling with uv for package management:

```bash
# Install Python dependencies
uv sync                       # Install dependencies from uv.lock

# Run the minimal Python script
python main.py               # Prints "Hello from bmwilly-github-io!"

# Development tools
ruff check                   # Lint Python code
ruff format                  # Format Python code
```

### Manual Jekyll Commands (if working without Docker)

```bash
bundle install               # Install Ruby dependencies
bundle exec jekyll serve     # Serve site locally
bundle exec jekyll build     # Build the site
```

## Architecture

### Jekyll Structure

- `_config.yml`: Site configuration with theme, plugins, and metadata
- `index.md`: Main homepage content with personal information and links
- `_includes/`: Reusable template components (analytics, head)
  - `analytics.html`: Google Analytics tracking code
  - `head.html`: HTML head includes for analytics

### Hybrid Tooling Setup

The project uniquely combines Ruby (Jekyll) and Python toolchains:

- **Ruby/Jekyll**: Primary website framework with GitHub Pages deployment
- **Python**: Minimal auxiliary tooling (currently just a placeholder script)
- **Docker**: Development environment for consistent Jekyll serving
- **uv**: Modern Python package management (replaces pip/poetry)

### Dependencies

- **Jekyll Plugins**: jekyll-feed, jekyll-analytics, jekyll-target-blank, jekyll-resize
- **Theme**: jekyll-theme-hacker (GitHub's hacker theme)
- **Python**: loguru for logging, ruff for linting/formatting

### Deployment

The site deploys automatically to GitHub Pages when changes are pushed to the main branch. The `github-pages` gem ensures local development matches the GitHub Pages environment.

## Key Files

- `Dockerfile`: Ruby 3.4.2-based container for Jekyll development
- `Makefile`: Convenient commands for Docker-based development workflow
- `Gemfile`: Ruby dependencies and Jekyll plugins
- `pyproject.toml`: Python project configuration with minimal dependencies
- `_config.yml`: Jekyll site configuration
