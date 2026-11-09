# Students API

A Node.js and Express API that stores student records in MongoDB using Mongoose.
The Docker image can be published to Amazon ECR through GitHub Actions.

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

## Publish to Amazon ECR

The GitHub Actions workflow builds and pushes an image on pushes to `main`.
Configure repository variables `AWS_REGION` and `ECR_REPOSITORY`, and the
`AWS_ROLE_TO_ASSUME` secret. See [ECR deployment setup](ECR-DEPLOYMENT.md) for
the AWS OIDC role and permissions.
