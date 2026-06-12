import os

# Settings load at import time; provide safe defaults for unit tests
os.environ.setdefault("HF_TOKEN", "test-token")
os.environ.setdefault("SECRET_KEY", "unit-test-secret-key-32-characters-long")
os.environ.setdefault("ENVIRONMENT", "test")
