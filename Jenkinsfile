// Trigger: enable "GitHub hook trigger for GITScm polling" in the Jenkins job settings.
// Do not use pollSCM here — GitHub webhooks start this pipeline on push.

pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate Project Files') {
            steps {
                sh '''
                    echo "Checking required project files..."
                    missing=0

                    if [ ! -f Dockerfile ]; then
                        echo "ERROR: Dockerfile is missing."
                        missing=1
                    fi

                    if [ ! -f app/package.json ]; then
                        echo "ERROR: app/package.json is missing."
                        missing=1
                    fi

                    if [ ! -f app/app.js ]; then
                        echo "ERROR: app/app.js is missing."
                        missing=1
                    fi

                    if [ "$missing" -ne 0 ]; then
                        exit 1
                    fi

                    echo "All required project files are present."
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t spendwise-app .'
            }
        }

        stage('DevSecOps Security Scan') {
            steps {
                sh '''
                    docker run --rm --entrypoint sh spendwise-app -c '
                      echo "Running npm audit inside built SpendWise image..."
                      node -v
                      npm -v
                      if [ ! -f package.json ]; then
                        echo "ERROR: package.json missing inside spendwise-app image."
                        exit 1
                      fi
                      npm audit --audit-level=high
                      echo "DevSecOps security scan completed successfully."
                    '
                '''
            }
        }

        stage('Stop Old Container') {
            steps {
                sh '''
                    if docker ps -a --format "{{.Names}}" | grep -Fxq "spendwise-container"; then
                        echo "Stopping and removing old container: spendwise-container"
                        docker stop spendwise-container || true
                        docker rm spendwise-container || true
                    else
                        echo "No existing spendwise-container found. Continuing..."
                    fi
                '''
            }
        }

        stage('Run New Container') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'groq-api-key',
                        variable: 'GROQ_API_KEY'
                    ),
                    string(
                        credentialsId: 'spendwise-db-password',
                        variable: 'DB_PASSWORD'
                    ),
                    usernamePassword(
                        credentialsId: 'spendwise-smtp',
                        usernameVariable: 'SMTP_USER',
                        passwordVariable: 'SMTP_PASS'
                    )
                ]) {
                    sh '''
                        docker run -d \
                          --name spendwise-container \
                          --add-host=host.docker.internal:host-gateway \
                          -p 3000:3000 \
                          -e PORT=3000 \
                          -e GROQ_API_KEY="$GROQ_API_KEY" \
                          -e SMTP_HOST="smtp.gmail.com" \
                          -e SMTP_PORT="587" \
                          -e SMTP_SECURE="false" \
                          -e SMTP_USER="$SMTP_USER" \
                          -e SMTP_PASS="$SMTP_PASS" \
                          -e SMTP_FROM="SpendWise <$SMTP_USER>" \
                          -e APP_BASE_URL="http://localhost:3000" \
                          -e DB_HOST="host.docker.internal" \
                          -e DB_PORT="3306" \
                          -e DB_USER="finance_user" \
                          -e DB_PASSWORD="$DB_PASSWORD" \
                          -e DB_NAME="finance_tracker" \
                          spendwise-app
                    '''
                }
            }
        }

        stage('Validate Deployment') {
            steps {
                sh '''
                    echo "Waiting a few seconds for the app to start..."
                    sleep 5
                    docker ps -a
                    docker logs spendwise-container || true
                    docker exec spendwise-container node -e "require('http').get('http://localhost:3000/health', res => { console.log('STATUS:', res.statusCode); process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', err => { console.error(err); process.exit(1); })"

                    echo "Checking database environment variables (PRESENT/MISSING only)..."
                    docker exec spendwise-container node -e "
const vars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
for (const v of vars) {
  const present = process.env[v] && String(process.env[v]).length > 0;
  console.log(v + ': ' + (present ? 'PRESENT' : 'MISSING'));
}
"

                    echo "Testing database connectivity from spendwise-container..."
                    docker exec spendwise-container node -e "
const mysql = require('mysql2/promise');
(async () => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    const [rows] = await connection.query(
      'SELECT DATABASE() AS db, CURRENT_USER() AS authenticated_user'
    );
    console.log('DATABASE CONNECTION SUCCESSFUL');
    console.log('Database:', rows[0].db);
    console.log('Authenticated account:', rows[0].authenticated_user);
    await connection.end();
  } catch (error) {
    console.error('DATABASE CONNECTION FAILED');
    console.error('Code:', error.code);
    console.error('Message:', error.message);
    process.exit(1);
  }
})();
"
                '''
            }
        }

        stage('Show Running Containers') {
            steps {
                sh 'docker ps'
            }
        }
    }

    post {
        success {
            echo 'Success: SpendWise is running at http://localhost:3000'
        }
        failure {
            echo 'Pipeline failed. Review the stage logs above for details.'
        }
    }
}
