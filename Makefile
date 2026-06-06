VENV_PY := backend/.venv/bin/python
MANAGE := $(VENV_PY) backend/database/manage.py
GEMINI_IP_CHECK := backend/server/check_gemini_ip.sh

.PHONY: help django-check django-migrate django-makemigrations django-test django-run django-shell django-superuser django-cmd gemini-ip-check env-init

help:
	@echo "Available targets:"
	@echo "  make django-check"
	@echo "  make django-migrate"
	@echo "  make django-makemigrations"
	@echo "  make django-test (runs gemini-ip-check first)"
	@echo "  make django-run (runs gemini-ip-check first)"
	@echo "  make django-shell"
	@echo "  make django-superuser"
	@echo "  make django-cmd CMD='startapp myapp'"
	@echo "  make gemini-ip-check"
	@echo "  make env-init"

django-check:
	$(MANAGE) check

django-migrate:
	$(MANAGE) migrate

django-makemigrations:
	$(MANAGE) makemigrations

django-test:
	@chmod +x "$(GEMINI_IP_CHECK)"
	@"$(GEMINI_IP_CHECK)"
	$(MANAGE) test apps.engine

django-run:
	@chmod +x "$(GEMINI_IP_CHECK)"
	@"$(GEMINI_IP_CHECK)"
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

gemini-ip-check:
	@chmod +x "$(GEMINI_IP_CHECK)"
	@"$(GEMINI_IP_CHECK)"

env-init:
	@if [ -f "backend/.env" ]; then \
		echo "backend/.env already exists; no changes made."; \
	else \
		cp backend/.env.example backend/.env; \
		echo "Created backend/.env from backend/.env.example."; \
		echo "Now set GEMINI_API_KEY in backend/.env."; \
	fi

run-frontend:
	cd frontend && npm run dev