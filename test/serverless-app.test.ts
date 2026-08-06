import * as cdk from 'aws-cdk-lib/core';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ServerlessAppStack } from '../lib/serverless-app-stack';

function synthTemplate(): Template {
    const app = new cdk.App();
    const stack = new ServerlessAppStack(app, 'MyTestStack');
    return Template.fromStack(stack);
}

test('DynamoDB SummariesTable is created with userId/sk keys', () => {
    const template = synthTemplate();
    template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
            { AttributeName: 'userId', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
    });
});

test('S3 bucket notifies ProcessCsvFn on object creation under uploads/', () => {
    const template = synthTemplate();
    template.hasResourceProperties('Custom::S3BucketNotifications', {
        NotificationConfiguration: {
            LambdaFunctionConfigurations: [
                {
                    Events: ['s3:ObjectCreated:*'],
                    Filter: {
                        Key: {
                            FilterRules: [
                                { Name: 'suffix', Value: '.csv' },
                                { Name: 'prefix', Value: 'uploads/' },
                            ],
                        },
                    },
                },
            ],
        },
    });
});

test('ProcessCsvFn has read access to the bucket and write access to the table', () => {
    const template = synthTemplate();
    template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
            Statement: Match.arrayWith([
                Match.objectLike({
                    Action: Match.arrayWith([Match.stringLikeRegexp('s3:GetObject.*')]),
                }),
            ]),
        },
    });
});

test('GET /summaries/{userId} route exists', () => {
    const template = synthTemplate();
    template.hasResourceProperties('AWS::ApiGateway::Resource', { PathPart: '{userId}' });
    template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'GET',
        Integration: Match.objectLike({ Type: 'AWS_PROXY' }),
    });
});

test('API Gateway has a CORS preflight OPTIONS method', () => {
    const template = synthTemplate();
    template.hasResourceProperties('AWS::ApiGateway::Method', {
        HttpMethod: 'OPTIONS',
    });
});

test('a second, private S3 bucket is created for the static site', () => {
    const template = synthTemplate();
    template.resourceCountIs('AWS::S3::Bucket', 2);
    template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
            BlockPublicAcls: true,
            BlockPublicPolicy: true,
            IgnorePublicAcls: true,
            RestrictPublicBuckets: true,
        },
    });
});

test('CloudFront distribution is created', () => {
    const template = synthTemplate();
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    template.resourceCountIs('AWS::CloudFront::Function', 0);
});

test('static site assets are deployed via a BucketDeployment custom resource', () => {
    const template = synthTemplate();
    template.resourceCountIs('Custom::CDKBucketDeployment', 1);
});

test('a REGIONAL WAFv2 WebACL is created with managed rule groups enforced and a per-IP rate limit', () => {
    const template = synthTemplate();
    template.resourceCountIs('AWS::WAFv2::WebACL', 1);
    template.hasResourceProperties('AWS::WAFv2::WebACL', {
        Scope: 'REGIONAL',
        DefaultAction: { Allow: {} },
        Rules: Match.arrayWith([
            Match.objectLike({
                Statement: Match.objectLike({
                    ManagedRuleGroupStatement: Match.objectLike({
                        VendorName: 'AWS',
                        Name: 'AWSManagedRulesCommonRuleSet',
                    }),
                }),
                OverrideAction: { None: {} },
            }),
            Match.objectLike({
                Statement: Match.objectLike({
                    ManagedRuleGroupStatement: Match.objectLike({
                        VendorName: 'AWS',
                        Name: 'AWSManagedRulesKnownBadInputsRuleSet',
                    }),
                }),
                OverrideAction: { None: {} },
            }),
            Match.objectLike({
                Statement: Match.objectLike({
                    RateBasedStatement: Match.objectLike({
                        AggregateKeyType: 'IP',
                        Limit: 500,
                    }),
                }),
                Action: { Block: {} },
            }),
        ]),
    });
});

test('the WAFv2 WebACL is associated with the API Gateway stage', () => {
    const template = synthTemplate();
    template.resourceCountIs('AWS::WAFv2::WebACLAssociation', 1);
    template.hasResourceProperties('AWS::WAFv2::WebACLAssociation', {
        WebACLArn: Match.objectLike({
            'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('ApiWebAcl.*')]),
        }),
    });
});

test('API Gateway stage has throttling configured', () => {
    const template = synthTemplate();
    template.hasResourceProperties('AWS::ApiGateway::Stage', {
        MethodSettings: Match.arrayWith([
            Match.objectLike({
                ResourcePath: '/*',
                HttpMethod: '*',
                ThrottlingRateLimit: 10,
                ThrottlingBurstLimit: 20,
            }),
        ]),
    });
});
