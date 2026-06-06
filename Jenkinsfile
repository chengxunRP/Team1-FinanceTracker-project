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
                script {
                    if (fileExists('app/.env')) {
                        echo 'Found app/.env — starting container with --env-file app/.env'
                        sh 'docker run -d --name spendwise-container -p 3000:3000 --env-file app/.env spendwise-app'
                    } else {
                        echo 'WARNING: app/.env not found in workspace — starting container without --env-file'
                        sh 'docker run -d --name spendwise-container -p 3000:3000 spendwise-app'
                    }
                }
            }
        }

        stage('Validate Deployment') {
            steps {
                sh '''
                    echo "Waiting a few seconds for the app to start..."
                    sleep 5
                    echo "Checking http://localhost:3000 ..."
                    curl -f http://localhost:3000
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
