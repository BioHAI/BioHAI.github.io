#!/bin/sh
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  echo "请先安装 Node.js：https://nodejs.org/"
  read -r _answer
  exit 1
fi
node tools/admin/server.cjs
