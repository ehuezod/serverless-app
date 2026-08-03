import * as cdk from 'aws-cdk-lib/core';
import {Construct} from 'constructs';
import {aws_dynamodb, aws_s3} from "aws-cdk-lib";
import {BillingMode} from "aws-cdk-lib/aws-dynamodb";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ServerlessAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new aws_dynamodb.Table(this, 'SummariesTable', {
      partitionKey: {name: 'userId', type: aws_dynamodb.AttributeType.STRING},
      sortKey: { name: 'sk', type: aws_dynamodb.AttributeType.STRING},
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      billingMode: BillingMode.PAY_PER_REQUEST
    });

    const s3Bucket = new aws_s3.Bucket(this, 'UploadsBucket', {
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {expiration: cdk.Duration.days(30)}
      ]
    })

  }
}
