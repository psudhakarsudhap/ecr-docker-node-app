# Build and push to Amazon ECR

Every push to `main` runs `.github/workflows/push-to-ecr.yml`. The workflow builds
the app with Docker and pushes both `latest` and the commit SHA as image tags.

## GitHub configuration

Add these repository settings:

- **Variable** `AWS_REGION`: AWS region, for example `us-east-1`
- **Variable** `ECR_REPOSITORY`: ECR repository name, for example `node-students-api`
- **Secret** `AWS_ROLE_TO_ASSUME`: ARN of an IAM role trusted by this GitHub repository

The workflow uses GitHub OIDC; do not add long-lived AWS access keys. Configure the
role trust policy for this repository's `main` branch with audience
`sts.amazonaws.com` and subject `repo:OWNER/REPOSITORY:ref:refs/heads/main`.

Use this trust policy for the IAM role, replacing the account, owner, and
repository placeholders:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:OWNER/REPOSITORY:ref:refs/heads/main"
      }
    }
  }]
}
```

Attach a permissions policy with `ecr:GetAuthorizationToken` on `*`,
`ecr:CreateRepository` and `ecr:DescribeRepositories`, and the following push
actions scoped to `arn:aws:ecr:AWS_REGION:ACCOUNT_ID:repository/ECR_REPOSITORY`:
`ecr:BatchCheckLayerAvailability`, `ecr:CompleteLayerUpload`,
`ecr:InitiateLayerUpload`, `ecr:PutImage`, and `ecr:UploadLayerPart`.

Example permissions policy (replace the repository ARN placeholders):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "ecr:GetAuthorizationToken",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["ecr:CreateRepository", "ecr:DescribeRepositories"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:BatchCheckLayerAvailability",
        "ecr:CompleteLayerUpload",
        "ecr:InitiateLayerUpload",
        "ecr:PutImage",
        "ecr:UploadLayerPart"
      ],
      "Resource": "arn:aws:ecr:AWS_REGION:ACCOUNT_ID:repository/ECR_REPOSITORY"
    }
  ]
}
```

After a successful run, the image is available as:

```text
ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com/ECR_REPOSITORY:latest
ACCOUNT_ID.dkr.ecr.AWS_REGION.amazonaws.com/ECR_REPOSITORY:COMMIT_SHA
```

For local builds:

```bash
docker build -t node-students-api .
docker run --rm -p 3000:3000 \
  -e MONGODB_URI="your MongoDB connection string" \
  -e DB_NAME="your database name" \
  node-students-api
```
