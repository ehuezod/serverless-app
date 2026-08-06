# Welcome to your CDK TypeScript project

This is a CDK app with:

- A backend: S3 presigned upload → S3-triggered CSV processing → DynamoDB
  summaries, exposed via API Gateway (`lib/serverless-app-stack.ts`, `lambda/`).
- A frontend: "Supplier Analyzer", a small React + Vite SPA in `frontend/`
  that uploads a CSV, polls until it's processed, and shows category spend
  charts and a top-spend-lines table. It's hosted via CloudFront + a private
  S3 bucket (no custom domain required).

## Useful commands

* `npm run build`   type-check the CDK/Lambda project
* `npm run watch`   watch for changes and type-check
* `npm test`        run the Jest unit/CDK-assertion tests (see note below)
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
* `npx cdk deploy`  deploy this stack to your default AWS account/region

## Frontend

```
cd frontend
npm install
npm run build   # -> frontend/dist
npm test        # vitest, unit tests for the pure logic (userId, apiClient, pollForSummary, format)
```

**`frontend/dist` must exist and be up to date before `npm test`, `cdk synth`,
or `cdk deploy` at the repo root** — the stack's `BucketDeployment` packages
whatever is on disk at that path; CDK does not invoke Vite itself. Run
`npm --prefix frontend run build` first (this is also why `npm test` at the
root will fail with a `CannotFindAsset` error if you haven't built the
frontend at least once).

## Deploying

```
npm --prefix frontend run build
npx cdk deploy
```

The deploy output includes `DistributionDomainName` (the CloudFront URL to
open) and `ApiUrl`. Visiting the site lands directly on the upload widget.

## Known limitations

- **The site and the API are both fully open — there is no login, IP
  allowlist, or per-user authorization of any kind.** `GET
  /summaries/{userId}` has no server-side authorization — anyone who calls
  the API directly with a guessed `userId` can read that user's uploads. This
  is an explicit, documented scope decision (no Cognito/IAM auth). The API is
  fronted by an AWS WAFv2 web ACL (managed rule groups + IP-based rate
  limiting) and API Gateway stage throttling, which blunt scripted abuse/DoS
  but are not an access-control mechanism.
- CORS on both the API Gateway and the uploads S3 bucket is wide open
  (`*`) rather than restricted to the CloudFront domain, to avoid a circular
  CDK dependency (the API's CSP header needs the CloudFront domain, and
  restricting CORS to that domain would need the API's URL in turn). Low risk
  since the API has no auth regardless.
- `frontend/src/lib/types.ts` is a hand-maintained copy of
  `lambda/shared/types.ts` — keep them in sync manually if the backend
  response shape changes.
