.PHONY: help build tag push
.DEFAULT_GOAL := help

define PRINT_HELP_PYSCRIPT
import re, sys

for line in sys.stdin:
	match = re.match(r'^([a-zA-Z_-]+):.*?## (.*)$$', line)
	if match:
		target, help = match.groups()
		print("%-20s %s" % (target, help))
endef
export PRINT_HELP_PYSCRIPT

help: ## print make target descriptions
	@python -c "$$PRINT_HELP_PYSCRIPT" < $(MAKEFILE_LIST)

build: ## build docker image
	docker build -t bmwilly.github.io .

run: build ## run docker image in interactive mode
	docker run -it --rm -p 4000:4000 bmwilly.github.io bash

serve: build ## serve jekyll site
	docker run -it --rm -p 4000:4000 bmwilly.github.io
