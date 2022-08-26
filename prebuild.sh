#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

BRANCH=develop
region=us-east-2
account=129633392107
vpcid="vpc-00659a9dab32026ff"

touch .env


if [ "$BRANCH" == "develop" ]; then
  echo "REGION = $region"  >> .env;
fi

if [ "$BRANCH" == "develop" ]; then
  echo "ACCOUNT = $account"  >> .env;
fi

if [ "$BRANCH" == "develop" ]; then
  echo "VPCID = $vpcid"  >> .env;
fi

cat .env
echo "$DIR"
ls -a "$DIR"