VENV_PY := backend/.venv/bin/python
MANAGE := $(VENV_PY) backend/database/manage.py

.PHONY: help django-check django-migrate django-makemigrations django-test django-run django-shell django-superuser django-cmd

help:
	@echo "Available targets:"
	@echo "  make django-check"
	@echo "  make django-migrate"
	@echo "  make django-makemigrations"
	@echo "  make django-test"
	@echo "  make django-run"
	@echo "  make django-shell"
	@echo "  make django-superuser"
	@echo "  make django-cmd CMD='startapp myapp'"

django-check:
	$(MANAGE) check

django-migrate:
	$(MANAGE) migrate

django-makemigrations:
	$(MANAGE) makemigrations

django-test:
	$(MANAGE) test apps.engine

django-run:
	$(MANAGE) runserver

django-shell:
	$(MANAGE) shell

django-superuser:
	$(MANAGE) createsuperuser

django-cmd:
	@if [ -z "$(CMD)" ]; then \
		echo "Provide CMD, e.g. make django-cmd CMD='startapp myapp'"; \
		exit 1; \
	fi
	$(MANAGE) $(CMD)
