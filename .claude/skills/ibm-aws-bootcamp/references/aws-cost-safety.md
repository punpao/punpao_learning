# AWS cost and security rules

The user has an AWS account on the **free plan with about $100 in credits** (about 6 months).
The goal: finish the week using only a small part of the credits, and never leave anything
running that keeps costing money.

Prices below are **rough guides** (USD, they differ by region and change over time). Always
say "about" and point to the AWS Pricing Calculator or the service pricing page when a number
matters. Check the user's region on Day 0. Regions such as ap-southeast-2 cost a bit more
than us-east-1.

## Day 0 setup checklist

1. **Region**: confirm the region the user uses (look at the console URL / region picker) and
   use the same one everywhere (`AWS_REGION`, CDK `env`). Record it in `progress.md`.
2. **Root user**: only for account-level tasks. Turn on MFA for root.
3. **Daily user**: use IAM Identity Center (`aws configure sso`) or, if the installed AWS CLI
   supports it, `aws login` (it uses your console sign-in and gives short-lived credentials).
   Check with `aws login help`. As a last choice, an IAM user with MFA, **never root access keys**.
   Never paste keys into chat; never commit them (add `.env`, `*.pem`, `cdk.out/` to `.gitignore`).
4. **Check**: `aws sts get-caller-identity` shows the expected account and identity.
5. **Budgets**: create AWS Budgets alerts (email) at about $5, $15 and $30 of *usage* for the
   month. Credits can hide real spend, so set the budget to track usage before credits are
   applied if the console offers it. Also turn on Free Tier / credit usage alerts if offered.
6. **Free plan limits**: the free plan may block some services or features. If a deploy fails
   because the plan doesn't allow a service, explain it and choose an alternative. **Never
   tell the user to upgrade to a paid plan as a fix**: that is their decision, and it ends
   the "no charge" safety net.
7. **CDK bootstrap** once: `npx cdk bootstrap aws://<account>/<region>` (creates an S3 bucket,
   ECR repo and roles; very low cost).

## Before every deploy

Say, in 2–4 lines: what will be created, what it costs per hour/day (roughly), and when it will
be destroyed. Get a yes. Then add each resource to the **AWS resources** table in `progress.md`
(name, stack, created date, cost/day, status).

## Cost traps (avoid or keep short-lived)

| Resource | Rough cost | Rule |
|---|---|---|
| NAT gateway | ~$0.045+/h + data (~$1+/day) | **Don't create one.** Put Fargate tasks in public subnets with a public IP, protected by security groups that allow traffic only from the ALB. Explain that a real client setup would use private subnets + NAT or VPC endpoints |
| Application Load Balancer | ~$0.0225+/h + usage (~$0.6+/day) | Only in `ComputeStack`; destroy it every evening |
| Public IPv4 addresses | ~$0.005/h each | Count them (ALB, tasks). Another reason to destroy nightly |
| Fargate tasks | per vCPU-hour + GB-hour | Smallest size (0.25 vCPU / 0.5 GB), desired count 1, destroy nightly |
| EKS cluster | ~$0.10/h for the control plane | **Don't create.** Teach EKS as a concept only |
| RDS / Aurora | instance-hours + storage | Optional 🟡. If used: smallest instance, single-AZ, delete the same day, skip the final snapshot |
| CloudWatch Logs | ingestion + storage | Set log retention to 1–3 days in CDK |
| Secrets Manager | ~$0.40/secret/month | Prefer SSM Parameter Store (standard params are free) |
| KMS customer keys | ~$1/key/month | Use AWS-managed keys |
| Interface VPC endpoints | per hour per AZ | Don't create for this project |
| DynamoDB, SQS, Lambda, S3, CloudFront, Cognito, ECR | very low at this scale | Fine to keep during the week; DynamoDB on-demand; small ECR images, with a lifecycle rule to keep the last 3 |

## Stack design for safety

- `BaseStack`: cheap things kept during the week (ECR, DynamoDB, SQS + DLQ, S3, Cognito).
- `ComputeStack`: VPC, ALB, ECS/Fargate. **Destroy every evening**: `npx cdk destroy ComputeStack`.
- `WebStack`: S3 + CloudFront (cheap; keep it until Day 7).
- Set `removalPolicy: DESTROY` (and `autoDeleteObjects: true` for S3 buckets) on everything,
  so `cdk destroy` really cleans up. Explain that real client systems normally use `RETAIN`
  for data.

## Daily teardown (Review block)

1. `npx cdk destroy ComputeStack`.
2. Check that nothing is left running: in the console, check the ECS clusters, load balancers,
   NAT gateways (should be none) and EC2 instances in the user's region. Or run:
   `aws elbv2 describe-load-balancers`, `aws ecs list-clusters`,
   `aws ec2 describe-nat-gateways --filter Name=state,Values=available`,
   `aws ec2 describe-instances --filters Name=instance-state-name,Values=running`.
3. Ask the user to check the remaining credits (console: account menu → free plan status, or
   Billing → Credits) and record them in `progress.md`.

## Day 7 full teardown

1. `npx cdk destroy --all`.
2. Empty and delete leftover S3 buckets, ECR images, CloudWatch log groups.
3. Re-run the checks above, plus `aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE`.
4. Keep the CDK bootstrap stack (`CDKToolkit`) only if the user will keep using CDK; otherwise
   empty its bucket and delete it.
5. Record the final credits used in `progress.md` and in `key-learnings.md`.

## Security basics to teach along the way

Least-privilege IAM roles (task role vs execution role), no secrets in code or Git, security
groups as allow-lists, private S3 buckets with CloudFront Origin Access Control, OIDC for
GitHub Actions instead of long-lived keys, and encryption at rest by default.
