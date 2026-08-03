import * as cdk from 'aws-cdk-lib/core';
import {Construct} from 'constructs';
import {aws_dynamodb, aws_s3, aws_lambda, aws_lambda_nodejs, aws_apigateway} from "aws-cdk-lib";
import {BillingMode} from "aws-cdk-lib/aws-dynamodb";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ServerlessAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //setting up dynamoDB table, this will collect the processed summaries
    const table = new aws_dynamodb.Table(this, 'SummariesTable', {
      partitionKey: {name: 'userId', type: aws_dynamodb.AttributeType.STRING},
      sortKey: { name: 'sk', type: aws_dynamodb.AttributeType.STRING},
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      billingMode: BillingMode.PAY_PER_REQUEST
    });

    //S3 bucket will contain the upload files from the users
    const s3Bucket = new aws_s3.Bucket(this, 'UploadsBucket', {
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {expiration: cdk.Duration.days(30)}
      ]
    })

    const getUploadUrlFn = new aws_lambda_nodejs.NodejsFunction(this, 'GetUploadUrlFn', {
      runtime: aws_lambda.Runtime.NODEJS_20_X,
      entry: 'lambda/get-upload-url/index.ts',   // points straight at your TS source
      handler: 'handler',                          // name of the exported function inside that file
      environment: {
        BUCKET_NAME: s3Bucket.bucketName,
      },
    });

    s3Bucket.grantPut(getUploadUrlFn);

    const api = new aws_apigateway.RestApi(this, 'TransactionApi', {
      restApiName: 'Transaction Analyzer API',
    });

    const uploadResource = api.root.addResource('upload-url');
    uploadResource.addMethod('POST', new aws_apigateway.LambdaIntegration(getUploadUrlFn));

  }
}
