# Students API

A Node.js and Express API that stores student records in MongoDB using Mongoose.
GitHub Actions builds the Docker image and deploys it to a local FLoCI ECS
environment using a Windows self-hosted runner.

## Run locally

Requirements: Node.js 22 or later, npm, and an accessible MongoDB server.

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create a `.env` file in the project directory:

   ```dotenv
   MONGODB_URI=mongodb://localhost:27017/students
   DB_NAME=students
   PORT=3000
   ```

   Change the MongoDB URI if your database runs elsewhere. Do not commit
   credentials; `.env` files are ignored by Git.

3. Start the server:

   ```bash
   npm run server
   ```

   Open `http://localhost:3000/` to check the API. For automatic restart during
   development, use `npm run dev`.

## Run with Docker

Build the image from the project directory:

```bash
docker build -t students-api .
```

Run it with a MongoDB URI reachable **from the container**:

```bash
docker run --rm -p 3000:3000 \
  -e MONGODB_URI="your MongoDB connection string" \
  -e DB_NAME=students \
  students-api
```

`localhost` inside the container refers to the container itself, not the host.
On Docker Desktop, use `host.docker.internal` to reach MongoDB on the host, or
use a MongoDB container's service name on a shared Docker network.

## API endpoints

| Method | Path | Description |
| --- | --- | --- |
| GET | `/` | API health response |
| POST | `/api/v1/students` | Create a student |
| GET | `/api/v1/students` | List students |
| GET | `/api/v1/students/:id` | Get a student |
| PUT | `/api/v1/students/:id` | Update a student |
| DELETE | `/api/v1/students/:id` | Delete a student |

Student fields are `name`, `email`, `course`, and `age`.

## Local FLoCI deployment with GitHub Actions

The [workflow](.github/workflows/push-to-ecr.yml) runs on pushes to `main`.
It builds an image tagged with the first seven characters of the commit SHA,
pushes it to the local FLoCI registry, registers a task definition, stops the
old tasks, launches a new task, and checks the students API.

This workflow targets **local FLoCI**, not Amazon AWS. It uses
`http://localhost:4566` for the AWS CLI and `127.0.0.1:4566` for Docker
registry login and push. The separate [ECR deployment guide](ECR-DEPLOYMENT.md)
describes an AWS OIDC configuration; it does not describe the current workflow.
Real AWS deployment requires a different workflow and AWS infrastructure.

### Prerequisites

- A Windows x64 machine with Git, AWS CLI and Docker Desktop installed.
- Docker Desktop running with Linux containers, and FLoCI reachable on port
  4566. The FLoCI environment must have the configured ECS cluster, subnet and
  security group available. The MongoDB instance must be reachable from the
  deployed container.
- A GitHub self-hosted runner registered for this repository with the labels
  `self-hosted`, `Windows`, and `X64`.

The FLoCI and MongoDB Compose configuration used for this setup is in the parent
workspace, outside this repository. Start it from that directory:

```powershell
docker compose up -d
docker version
```

`docker version` should show both Client and Server sections. This confirms
access for the current Windows account, but not necessarily for the runner
service account.

### Configure the runner

1. In GitHub, open **Settings > Actions > Runners > New self-hosted runner** and
   follow the Windows installation instructions. A repository-level runner is
   registered to that repository; another repository needs its own runner or an
   organization runner configured for access.
2. If the runner is installed inside the repository, ignore its directory in
   `.gitignore` with `/actions-runner/`.
3. If running the runner as a Windows service, open `services.msc` and set its
   **Properties > Log On** account to a trusted Windows account that can access
   Docker Desktop. Restart the service. The account may need the **Log on as a
   service** privilege. Docker access grants substantial control over the host,
   so use a trusted runner and account.
4. Verify that the service is running under the intended account:

   ```powershell
   Get-CimInstance Win32_Service |
     Where-Object { $_.Name -like 'actions.runner*' } |
     Select-Object Name, StartName, State
   ```

5. Confirm the runner is online in GitHub and that Docker Desktop remains
   running. The workflow's **Verify Docker daemon access** step checks Docker
   from the service account during the job.

### Configure repository secrets

Under **Settings > Secrets and variables > Actions**, add:

| Secret | Purpose |
| --- | --- |
| `FLOCI_AWS_ACCESS_KEY_ID` | Access key used by the AWS CLI against FLoCI |
| `FLOCI_AWS_SECRET_ACCESS_KEY` | Corresponding FLoCI secret key |
| `MONGODB_URI` | MongoDB connection string reachable from the task container |
| `DB_NAME` | Exposed as a workflow environment variable |

The current task registration step sets `DB_NAME` to `studentsdb` explicitly;
the `DB_NAME` secret does not override that value. It also sets `PORT` to `3000`.
Do not commit credentials. The workflow writes the resolved MongoDB URI to a
generated task-definition file in the runner workspace and registers it with
FLoCI, so protect access to the runner and local FLoCI data.

### Adapt the pipeline for another application

Add a Dockerfile and task definition to the new repository, then use the
workflow as a starting point. Update:

| Setting | Current value | Adapt for |
| --- | --- | --- |
| Image and registry repository | `cicd-app` | The new application |
| Task family | `express-task` in [task-definition.json](task-definition.json) | A new task family |
| Container name | `express-app` | The container name in the new task definition |
| Cluster | `node-mongo-cluster` | The intended FLoCI cluster |
| Network | `subnet-default-us-east-1-a`, `sg-default-us-east-1` | Resources available in the target environment |
| Application port | `3000` | The application's container and published port |
| API check | `/api/v1/students` | An appropriate endpoint for the application |
| Environment variables | `MONGODB_URI`, `DB_NAME`, `PORT` | The application's configuration |

Retain the Docker access check and the PowerShell process-scoped execution
policy setting if the new runner needs them. Confirm the target registry and
ECS resources exist before running the pipeline.

**Important:** The current stop step lists and stops all running tasks in
`node-mongo-cluster`, not only this application's tasks. Do not copy it
unchanged into a shared cluster; isolate the application or change the step to
target only its own tasks. The workflow stops old tasks before the new task is
ready, so deployments can have downtime.

### Troubleshooting

- **PowerShell scripts are disabled:** the workflow uses a process-scoped
  `-ExecutionPolicy Bypass` for its run steps. An enforced machine or user Group
  Policy can override it; contact the administrator rather than changing the
  machine-wide policy.
- **Docker permission denied or registry HTTPS error:** check the runner
  service's `StartName`, Docker Desktop's status and the service account's
  access to Docker. An interactive `docker version` under another account is
  not sufficient. The local FLoCI registry serves HTTP; the workflow uses
  `127.0.0.1:4566` rather than `localhost` for Docker.
- **Git reports dubious ownership after changing service accounts:** stop the
  runner and inspect the owner of the affected runner checkout with
  `Get-Acl`. If it is a trusted checkout owned by the previous service account,
  an administrator can change its ownership with the command below. Substitute
  the exact checkout path and account; check for failures, verify the owner,
  and restart the runner. Do not apply this recursively to the whole workspace.

  ```powershell
  icacls '<checkout-path>' /setowner '<runner-account>' /T /C
  ```

- **Task or API check fails:** check the FLoCI cluster and network resources,
  task status, application logs, MongoDB connectivity and the health-check
  endpoint.
