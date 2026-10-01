.PHONY: install test dev build run docker clean

# Install all dependencies
install:
	pip install -r requirements.txt
	pip install fastapi uvicorn pydantic scipy pandas pytest httpx
	cd frontend && npm install

# Run backend pytest suite
test:
	pytest -v

# Run production build of frontend
build:
	cd frontend && npm run build

# Run unified full-stack application (FastAPI serving React)
run: build
	uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

# Start Docker containerized app
docker:
	docker compose up --build

# Clean temporary files
clean:
	rm -rf __pycache__ */__pycache__ */*/__pycache__ .pytest_cache frontend/dist
