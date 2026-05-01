#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(pwd)"
BRANCH="feat/db-fk-fix"

echo "Initializing git repo in $REPO_DIR"
git init >/dev/null 2>&1 || true
git checkout -b "$BRANCH" >/dev/null 2>&1 || true

git add -A
git commit -m "feat(db): rewrite lending DB with corrected FK; add migrations and integrity checks" >/dev/null 2>&1 || true
echo "Committed on branch $BRANCH."
echo "Tip: add a remote and push: git remote add origin <URL>; git push -u origin $BRANCH"
