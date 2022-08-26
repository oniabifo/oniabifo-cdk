#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

BRANCH=develop
DJANGO_SETTINGS_MODULE=app.settings.local
DB_NAME=db_dev
DB_USER=dev
DB_PASSWORD=S@mEP455w0rd
DB_HOST=db
DB_PORT=5432
POSTGRES_PASSWORD=postgres
AWS_ACCOUNT_ID=129633392107
AWS_REGION_NAME=us-east-1
AWS_ACCESS_KEY_ID=FAKEABCDEFGHIJKLMNOP
AWS_SECRET_ACCESS_KEY=FAKE7NiynG+TogH8Nj+P9nlE73sq3
CELERY_BROKER_URL=sqs://broker:9324
CELERY_TASK_ALWAYS_EAGER=False

touch ./docker/.env


if [ "$BRANCH" == "develop" ]; then
  echo "DJANGO_SETTINGS_MODULE = $DJANGO_SETTINGS_MODULE"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "DB_NAME = $DB_NAME"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "DB_USER = $DB_USER"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "DB_PASSWORD = $DB_PASSWORD"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "DB_HOST = $DB_HOST"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "DB_PORT = $DB_PORT"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "POSTGRES_PASSWORD = $POSTGRES_PASSWORD"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "AWS_ACCOUNT_ID = $AWS_ACCOUNT_ID"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "AWS_REGION_NAME = $AWS_REGION_NAME"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "AWS_ACCESS_KEY_ID = $AWS_ACCESS_KEY_ID"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "AWS_SECRET_ACCESS_KEY = $AWS_SECRET_ACCESS_KEY"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "CELERY_BROKER_URL = $CELERY_BROKER_URL"  >> ./docker/.env;
fi
if [ "$BRANCH" == "develop" ]; then
  echo "CELERY_TASK_ALWAYS_EAGER = $CELERY_TASK_ALWAYS_EAGER"  >> ./docker/.env;
fi

cat ./docker/.env
echo "$DIR"
ls -a "$DIR"