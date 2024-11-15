FROM python:3.12-slim

WORKDIR /app

# Install essential build tools
RUN apt-get update && apt-get install -y build-essential libffi-dev && rm -rf /var/lib/apt/lists/*

# Copy and install dependencies
COPY ./requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --pre -r /app/requirements.txt

# Copy application files
COPY . /app

# Start FastAPI with Uvicorn
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
