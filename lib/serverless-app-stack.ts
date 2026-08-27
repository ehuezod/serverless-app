import * as path from 'path';
import * as cdk from 'aws-cdk-lib/core';
import {Construct} from 'constructs';
import {
    aws_dynamodb,
    aws_s3,
    aws_s3_deployment,
    aws_s3_notifications,
    aws_lambda,
    aws_lambda_nodejs,
    aws_apigateway,
    aws_cloudfront,
    aws_cloudfront_origins,
    aws_wafv2,
    aws_iam,
} from "aws-cdk-lib";
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
      ],
      // The browser PUTs the CSV directly to a presigned URL on this bucket.
      // Origin is left as '*' (rather than the CloudFront site domain) to
      // avoid a circular CDK dependency between this bucket and the
      // Distribution below; the bucket itself still blocks all public access
      // and requires a valid presigned signature, so this only affects
      // browser-enforced cross-origin behavior, not who can write to it.
      cors: [
        {
          allowedMethods: [aws_s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['Content-Type'],
        },
      ],
    })

    const getUploadUrlFn = new aws_lambda_nodejs.NodejsFunction(this, 'GetUploadUrlFn', {
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/get-upload-url/index.ts',
      handler: 'handler',
      environment: {
        BUCKET_NAME: s3Bucket.bucketName,
      },
    });

    s3Bucket.grantPut(getUploadUrlFn);

    //processes an uploaded CSV into category summaries and writes the result to DynamoDB
    // Nova Micro only supports invocation via a cross-region inference
    // profile (not a direct on-demand model ID) — see bedrockFoundationModelId below.
    const bedrockFoundationModelId = 'amazon.nova-micro-v1:0';
    const bedrockInferenceProfileId = `us.${bedrockFoundationModelId}`;
    const stackRegion = cdk.Stack.of(this).region;
    const stackAccount = cdk.Stack.of(this).account;

    const processCsvFn = new aws_lambda_nodejs.NodejsFunction(this, 'ProcessCsvFn', {
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/process-csv/index.ts',
      handler: 'handler',
      // 30s base for CSV parsing + headroom for the synchronous Bedrock
      // call (generateQuickAnalysis) added on top of it.
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        TABLE_NAME: table.tableName,
        BEDROCK_MODEL_ID: bedrockInferenceProfileId,
      },
    });

    s3Bucket.grantRead(processCsvFn);
    table.grantWriteData(processCsvFn);

    // Lets process-csv call Bedrock to generate the "quick analysis" sales
    // pitch. No CDK grant* helper exists for Bedrock, so this is an explicit
    // policy statement. Cross-region inference profiles require permission on
    // both the profile resource itself AND the underlying foundation model
    // (the profile can route the request to any US region under the hood).
    processCsvFn.addToRolePolicy(new aws_iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [
        `arn:aws:bedrock:${stackRegion}:${stackAccount}:inference-profile/${bedrockInferenceProfileId}`,
        `arn:aws:bedrock:*::foundation-model/${bedrockFoundationModelId}`,
      ],
    }));

    s3Bucket.addEventNotification(
      aws_s3.EventType.OBJECT_CREATED,
      new aws_s3_notifications.LambdaDestination(processCsvFn),
      { prefix: 'uploads/', suffix: '.csv' }
    );

    //fetches a user's processed upload summaries from DynamoDB
    const getSummariesFn = new aws_lambda_nodejs.NodejsFunction(this, 'GetSummariesFn', {
      runtime: aws_lambda.Runtime.NODEJS_22_X,
      entry: 'lambda/get-summaries/index.ts',
      handler: 'handler',
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadData(getSummariesFn);

    const api = new aws_apigateway.RestApi(this, 'TransactionApi', {
      restApiName: 'Transaction Analyzer API',
      // The frontend is a browser SPA calling this API cross-origin. Wide open
      // (matching the S3 CORS choice above, for the same circular-dependency
      // reason) is an acceptable simplification since the API has no auth of
      // its own regardless of which origin calls it.
      defaultCorsPreflightOptions: {
        allowOrigins: aws_apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['Content-Type'],
      },
      // Stage-wide default: caps runaway/scripted traffic without gating
      // access (no usage plan/API key) — the API remains fully open.
      deployOptions: {
        throttlingRateLimit: 10,
        throttlingBurstLimit: 20,
      },
    });

    const uploadResource = api.root.addResource('upload-url');
    uploadResource.addMethod('POST', new aws_apigateway.LambdaIntegration(getUploadUrlFn));

    const summariesResource = api.root.addResource('summaries').addResource('{userId}');
    summariesResource.addMethod('GET', new aws_apigateway.LambdaIntegration(getSummariesFn));

    // ---- WAF: blunts scripted abuse/DoS against the (intentionally
    // unauthenticated) API. REGIONAL scope has no region constraint (unlike
    // CLOUDFRONT scope, which would require pinning this stack to
    // us-east-1), so the stack stays environment-agnostic.
    const apiWebAcl = new aws_wafv2.CfnWebACL(this, 'ApiWebAcl', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'ApiWebAclMetric',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 0,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'CommonRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWS-AWSManagedRulesKnownBadInputsRuleSet',
          priority: 1,
          overrideAction: { none: {} },
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesKnownBadInputsRuleSet',
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'KnownBadInputsRuleSet',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'RateLimitPerIp',
          priority: 2,
          action: { block: {} },
          statement: {
            rateBasedStatement: {
              limit: 500,
              aggregateKeyType: 'IP',
              evaluationWindowSec: 300,
            },
          },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'RateLimitPerIp',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    new aws_wafv2.CfnWebACLAssociation(this, 'ApiWebAclAssociation', {
      resourceArn: api.deploymentStage.stageArn,
      webAclArn: apiWebAcl.attrArn,
    });

    // ---- Static frontend hosting (CloudFront + private S3 origin) ----

    const siteBucket = new aws_s3.Bucket(this, 'SiteBucket', {
      encryption: aws_s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: aws_s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const responseHeadersPolicy = new aws_cloudfront.ResponseHeadersPolicy(this, 'SiteResponseHeadersPolicy', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          // connect-src must include the API's real invoke URL (for
          // /upload-url and /summaries calls) AND the uploads bucket's
          // regional domain (the SPA PUTs the CSV directly to a presigned
          // S3 URL after calling the API) — missing either one gets
          // silently blocked by CSP with no useful error from fetch().
          contentSecurityPolicy: `default-src 'self'; connect-src 'self' ${api.url} https://${s3Bucket.bucketRegionalDomainName}; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'`,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentTypeOptions: { override: true },
        referrerPolicy: {
          referrerPolicy: aws_cloudfront.HeadersReferrerPolicy.SAME_ORIGIN,
          override: true,
        },
        frameOptions: {
          frameOption: aws_cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        xssProtection: {
          protection: true,
          modeBlock: true,
          override: true,
        },
      },
    });

    const distribution = new aws_cloudfront.Distribution(this, 'SiteDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: aws_cloudfront_origins.S3BucketOrigin.withOriginAccessControl(siteBucket),
        viewerProtocolPolicy: aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy,
      },
      errorResponses: [
        { httpStatus: 403, responseHttpStatus: 200, responsePagePath: '/index.html' },
        { httpStatus: 404, responseHttpStatus: 200, responsePagePath: '/index.html' },
      ],
    });

    // frontend/dist must be built (npm --prefix frontend run build) before
    // `cdk synth`/`cdk deploy` — CDK packages whatever is on disk here, it
    // does not invoke Vite itself.
    new aws_s3_deployment.BucketDeployment(this, 'DeploySite', {
      sources: [
        aws_s3_deployment.Source.asset(path.join(__dirname, '../frontend/dist')),
        // Lets the SPA learn the API base URL at runtime (fetched as
        // /config.json on load) without hardcoding it into the JS bundle.
        aws_s3_deployment.Source.jsonData('config.json', { apiUrl: api.url }),
      ],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: ['/*'],
      // Uniform no-cache keeps every deploy immediately visible (this is a
      // small, low-traffic app — trading long-lived asset caching for
      // simplicity and never serving stale content is the right tradeoff
      // here) alongside the CloudFront invalidation above.
      cacheControl: [aws_s3_deployment.CacheControl.noCache()],
    });

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'DistributionDomainName', { value: distribution.distributionDomainName });
  }
}
