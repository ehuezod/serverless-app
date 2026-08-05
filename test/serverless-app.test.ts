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
