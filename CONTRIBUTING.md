# Contributing Guide

## Prerequisites

This guide assumes you are on macOS and have homebrew installed.

Install docker:

```shell
brew install --cask docker
```

Install Python 3. We recommend using `pyenv` to manage Python versions:

```shell
brew install pyenv
pyenv install 3.12
pyenv local 3.12
```

Install Ruby. We recommend using `rbenv` to manage Ruby versions:

```shell
brew install rbenv
rbenv install 3.3.5
rbenv local 3.3.5
```

Install Ruby dependencies:

```shell
gem install bundler
bundle install
```

## CLI

We use the `Makefile` as a poor man's CLI.

The commands can be seen with `make help`:

```shell
$ make
help                 print make target descriptions
build                build docker image
run                  run docker image in interactive mode
serve                serve jekyll site
```

## Update Ruby dependencies

```shell
bundle update
```
