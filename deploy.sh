#!/bin/bash
set -e

cd /home/ubuntu

if [ ! -d "flexdeskBackend" ]; then
  git clone https://github.com/VolttechAfrica/flexdeskv2.git flexdeskBackend
fi

cd flexdeskBackend

git reset --hard
git pull origin master

echo "$1" | base64 -d > .env

npm install
npm run build

if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
fi

npm run restart || npm run start
