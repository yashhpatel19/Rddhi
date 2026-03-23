#!/bin/bash
set -a
source /workspaces/Rddhi/.env
set +a

cd /workspaces/Rddhi/backend
/workspaces/Rddhi/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8000 --reload
