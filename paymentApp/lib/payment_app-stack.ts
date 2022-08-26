import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as eks from 'aws-cdk-lib/aws-eks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as codecommit from 'aws-cdk-lib/aws-codecommit';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import * as targets from 'aws-cdk-lib/aws-events-targets';
var path = require('path');


export class PaymentAppStack extends cdk.Stack {

  public readonly vpc: ec2.Vpc;
  public readonly securityGroupForRDS: ec2.SecurityGroup;
  public readonly eksCluster: eks.Cluster;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const ClusterName = 'ropayApi';
    const primaryRegion = 'us-east-2';

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: iam.User.fromUserArn(this, "importedUser", "arn:aws:iam::129633392107:user/abi@ropay.ng")
      // assumedBy: iam.User.fromUserArn(this, "importUser", "abi@ropay.ng")
    });

    //create vpc
     this.vpc = new ec2.Vpc(this, 'ropayApi-VPC', {
      cidr: '10.0.0.0/16',
      natGateways: 1,
      maxAzs: 2,
      subnetConfiguration: [
        {
          name: 'private-api-subnet',
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 24,
        },
        {
          name: 'public-api-subnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        }
      ],
    });

  this.securityGroupForRDS = new ec2.SecurityGroup(this, `ropay-API-dev-security-group`, {
      vpc: this.vpc,
      allowAllOutbound: true,
      description: 'ROPAY API DB Security Group',
      securityGroupName: "ropay-api-secgroup",
      
  });

  this.securityGroupForRDS.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(22), 'SSH frm anywhere');
  this.securityGroupForRDS.addIngressRule(ec2.Peer.ipv4('10.200.0.0/24'), ec2.Port.tcp(5432), 'RDS Ingress1');
  this.securityGroupForRDS.addIngressRule(ec2.Peer.ipv4('10.0.0.0/24'), ec2.Port.tcp(5432), 'RDS Ingress2');

    //create user data script
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'sudo su',
      'yum install -y httpd',
      'systemctl start httpd',
      'systemctl enable httpd',
      'echo "<h1>Hello World from $(hostname -f)</h1>" > /var/www/html/index.html',
    );

    // create auto scaling group
    const asg = new autoscaling.AutoScalingGroup(this, 'asg', {
      vpc: this.vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE2,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
      }),
      userData,
      minCapacity: 2,
      maxCapacity: 3,
    });


  //create application load balancer
   const applicationLoadBalancer = new cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer(this, 'alb', {
    vpcSubnets: {
      subnetType: ec2.SubnetType.PUBLIC,
    },
    internetFacing: true,
    vpc: this.vpc,
  })


    //create an eks cluster
    this.eksCluster = new eks.Cluster(this, 'ropayApi-eks', {
      version: eks.KubernetesVersion.V1_21,
      clusterName: ClusterName,
      mastersRole: clusterAdmin,
      defaultCapacityInstance: cdk.Stack.of(this).region==primaryRegion? 
      new ec2.InstanceType('t2.micro') : new ec2.InstanceType('t2.micro'),
      // albController: {
      //   version: eks.AlbControllerVersion.V2_4_1
      // },
      vpc: this.vpc
    });


    this.eksCluster.awsAuth.addUserMapping(iam.User.fromUserArn(this, 'admin',  'arn:aws:iam::129633392107:user/abi@ropay.ng'), {
      groups: ["system:masters"],
      username: "abi@ropay.ng"
    })


  //create listener to listen on port 80
  const listener = applicationLoadBalancer.addListener('listener', { port: 80 });

  //add target to the ALB listener
  listener.addTargets('default-target', {
    port: 80,
    targets: [asg],
    healthCheck: {
    path: '/',
    unhealthyThresholdCount: 2,
    healthyThresholdCount: 5,
    interval: cdk.Duration.seconds(30),
      },
  });

  const ecrRepo = new ecr.Repository(this, 'EcrRepo-test');

  const repository = new codecommit.Repository(this, 'CodeCommitRepo', {
    repositoryName: `${this.stackName}-repo`,
    code: codecommit.Code.fromDirectory(path.join(__dirname, './'), 'dev')
  });

  // CODEBUILD - project
  const ropayApiBuild = new codebuild.Project(this, 'MyProject', {
    projectName: `${this.stackName}`,
    source: codebuild.Source.codeCommit({ repository }),
    environment: {
      buildImage: codebuild.LinuxBuildImage.fromAsset(this, 'CustomImage1', {
        directory: '../app/docker/app',
        target: 'prod'
      }),
      privileged: true
    },
    environmentVariables: {
      'CLUSTER_NAME': {
        value: `${this.eksCluster.clusterName}`
      },
      'ECR_REPO_URI': {
        value: `${ecrRepo.repositoryUri}`
      }
    },
    buildSpec: codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          commands: [
            // "ls -a",
            "apt-get update",
            "wget https://get.helm.sh/helm-v3.4.1-linux-amd64.tar.gz",
            "tar xvf helm-v3.4.1-linux-amd64.tar.gz",
            "mv linux-amd64/helm /usr/local/bin",
            "curl -fsSL https://deb.nodesource.com/setup_18.x | bash -",
            "apt-get install -y nodejs",
            "node --version",
            "npm --version",
            "npm install -g aws-cdk",
            "npm install -g aws-cdk-lib",
            "service docker start",
            "curl -LO https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl",
            "curl -LO https://dl.k8s.io/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl.sha256",
            "chmod +x ./kubectl",
            "mv -f ./kubectl /usr/local/bin/kubectl",
            "curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o \"awscliv2.zip\" &&                       unzip awscliv2.zip &&                       ./aws/install"
          ]
        },
        pre_build: {
          commands: [
            "env",
            "export TAG=${CODEBUILD_RESOLVED_SOURCE_VERSION}",
            "export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output=text)",
            "/usr/local/bin/entrypoint.sh",
            "echo Logging in to Amazon ECR",
            "docker login -u AWS -p $(aws ecr get-login-password --region us-east-2) xxxxxxxxxx.dkr.ecr.us-east-2.amazonaws.com",
            "ls -a",
            "cd paymentApp",
            "npm install",
            "cdk synth --all",
            "cdk deploy --all",
            "cd .."
          ]
        },
        build: {
          commands: [
                'ls -a',
                'cd app/docker/app',
                `docker build -t $ECR_REPO_URI:$TAG .`,
                'docker push $ECR_REPO_URI:$TAG'
          ]
        }
      }
    })
  })

  // :point_down: Create a codeBuild role, to which we'll attach our Policies
  const codeBuildRole = new iam.Role(this, 'codeBuild-iam-role', {
    assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
    description: 'An example IAM role in AWS CDK'
  });

  //Add the policy to the role
  codeBuildRole.addToPolicy(new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    resources: ['arn:aws:codebuild:us-east-2:129633392107:project/*'],
    actions: ['*']
  })
  )
    
  // // PIPELINE
  const sourceOutput = new codepipeline.Artifact();

  const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
    actionName: 'CodeCommit',
    repository,
    output: sourceOutput,
  });

  const buildAction = new codepipeline_actions.CodeBuildAction({
    actionName: 'CodeBuild',
    project: ropayApiBuild,
    input: sourceOutput,
    outputs: [new codepipeline.Artifact()], // optional
  });

  const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
    actionName: 'Approve',
  });

  new codepipeline.Pipeline(this, 'MyPipeline', {
    stages: [
      {
        stageName: 'Source',
        actions: [sourceAction],
      },
      {
        stageName: 'BuildAndDeploy',
        actions: [buildAction],
      },
      {
        stageName: 'ApproveSwapBG',
        actions: [manualApprovalAction],
      }
    ],
  });
    
    
  repository.onCommit('OnCommit', {
    target: new targets.CodeBuildProject(ropayApiBuild)
  });

  ecrRepo.grantPullPush(ropayApiBuild.role!)
  this.eksCluster.awsAuth.addMastersRole(ropayApiBuild.role!)
  // this.eksCluster.awsAuth.addMastersRole(iam.Role.fromRoleArn(this, 'administrators', 'arn:aws:iam::129633392107:role/eks-admin'))

  ropayApiBuild.addToRolePolicy(new iam.PolicyStatement({
    actions: ['eks:*'],
    resources: ['*'],
  }))    

    
  new cdk.CfnOutput(this, 'CodeCommitRepoName', { value: `${repository.repositoryName}` })
  new cdk.CfnOutput(this, 'CodeCommitRepoArn', { value: `${repository.repositoryArn}` })
  new cdk.CfnOutput(this, 'CodeCommitCloneUrlSsh', { value: `${repository.repositoryCloneUrlSsh}` })
  new cdk.CfnOutput(this, 'CodeCommitCloneUrlHttp', { value: `${repository.repositoryCloneUrlHttp}` })


  }
}

export interface DatabaseProps extends cdk.StackProps {
  userVpc: ec2.IVpc,
  stage: 'dev',
  securityGroupForRDS: ec2.SecurityGroup,
  env: { region: string; account: string; }
}

export interface CodecommitProps extends cdk.StackProps {
  eksCluster: eks.Cluster
}
