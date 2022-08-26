import * as cdk from 'aws-cdk-lib';
import {DatabaseProps } from '../lib/payment_app-stack';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';

export class DatabaseAppStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: DatabaseProps) {
      super(scope, id, props)

       // first, lets generate a secret to be used as credentials for our database
       const databaseCredentialsSecret = new secretsmanager.Secret(this, `${props?.stage}-DBCredentialsSecret`, {
        secretName: `${props?.stage}-credentials`,
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'postgres',
          }),
          excludePunctuation: true,
          includeSpace: false,
          generateStringKey: 'password'
        }
      });    

    // lets output a few properties to help use find the credentials 
    new cdk.CfnOutput(this, 'Secret Name', { value: databaseCredentialsSecret.secretName }); 
    new cdk.CfnOutput(this, 'Secret ARN', { value: databaseCredentialsSecret.secretArn }); 
    new cdk.CfnOutput(this, 'Secret Full ARN', { value: databaseCredentialsSecret.secretFullArn || '' });

    // next, create a new string parameter to be used
    new ssm.StringParameter(this, 'DBCredentialsArn', {
        parameterName: `${props?.stage}-credentials-arn`,
        stringValue: databaseCredentialsSecret.secretArn,
    });

    // create RDS instance
    const dbInstance = new rds.DatabaseInstance(this, "ropay", {
        vpc: props.userVpc,
        vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
        },
        engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_14_2,
        }),
        instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.SMALL
        ),
        multiAz: true,
        allocatedStorage: 100,
        maxAllocatedStorage: 105,
        allowMajorVersionUpgrade: false,
        autoMinorVersionUpgrade: true,
        backupRetention: cdk.Duration.days(0),
        deleteAutomatedBackups: true,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        deletionProtection: false,
        publiclyAccessible: true,
        instanceIdentifier: 'ropay-api-db1',
        });

        dbInstance.connections.allowFrom(props.securityGroupForRDS, ec2.Port.tcp(5432));

    }
}