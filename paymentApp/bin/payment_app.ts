#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PaymentAppStack } from '../lib/payment_app-stack';
import { DatabaseAppStack } from '../lib/database_app-stack';

const REGION = "us-east-2"
const ACCOUNT = "129633392107"

const app = new cdk.App();

const paymentAppStack = new PaymentAppStack(app, 'PaymentAppStack', {
  env: {
    region: REGION,
    account: ACCOUNT,
  },
});

new DatabaseAppStack(app, 'DatabaseAppStack', 
{
  userVpc: paymentAppStack.vpc,
  securityGroupForRDS: paymentAppStack.securityGroupForRDS,
  stage: 'dev',
  env: {
    region: REGION,
    account: ACCOUNT,
  },
});

// new CodecommitAppStack(app, 'CodeCommitAppStack', 
// {
//   eksCluster: paymentAppStack.eksCluster,
//   env: {
//     region: REGION,
//     account: ACCOUNT,
//   },
// });