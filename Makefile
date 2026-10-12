.PHONY: install lint format test api ui frontend-install frontend-dev frontend-build mlflow docker-up docker-down

install:
	uv sync --group dev

lint:
	uv run ruff check .
	uv run ruff format --check .

format:
	uv run ruff check --fix .
	uv run ruff format .

test:
	uv run pytest --cov

api:
	uv run uvicorn shelfsight.api.main:app --reload --port 8210

ui:
	GAPX_API_URL=http://localhost:8210 uv run streamlit run src/shelfsight/ui/app.py --server.port 8711

frontend-install:
	cd frontend && npm install

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

mlflow:
	uv run mlflow ui --backend-store-uri sqlite:///mlflow.db --port 5022

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down
