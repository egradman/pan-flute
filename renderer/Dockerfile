FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        openscad \
        python3 \
        xvfb \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy project files needed for rendering
COPY generate_flute.py .
COPY box-base.stl .

# Copy the server
COPY renderer/server.py .

EXPOSE 8080

# xvfb-run wraps each openscad invocation inside server.py.
CMD ["python3", "server.py"]
