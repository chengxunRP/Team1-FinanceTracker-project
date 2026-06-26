# Team1 Finance Tracker Project

SpendWise is a finance tracker web application built using Node.js, Express, EJS, MySQL, and Docker.

## Features

* Add, view, edit, and delete expenses
* Manage expense categories
* Set monthly budget limits
* View budget alerts
* View dashboard summary
* Get smart spending recommendations
* Use FinBot finance chatbot

## Technologies Used

* Node.js
* Express.js
* EJS
* MySQL
* Bootstrap
* Docker
* Jenkins
* GitHub

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/chengxunRP/Team1-FinanceTracker-project.git
cd Team1-FinanceTracker-project
```

### 2. Create the Environment File

The real `.env` file is not uploaded to GitHub because it contains private information.

Create a new file:

```text
app/.env
```

Copy the values from:

```text
app/.env.example
```

Example:

```env
GROQ_API_KEY=your_groq_api_key_here

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=finance_tracker
DB_PORT=3306
```

If running the app using Docker Desktop on Windows, use:

```env
DB_HOST=host.docker.internal
```

### 3. Set Up the Database

Open MySQL Workbench and run the SQL file:

```text
docs/database.sql
```

This will create the required database and tables for the finance tracker app.

### 4. Run the App Without Docker

Go into the app folder:

```bash
cd app
npm install
npm start
```

Open the website:

```text
http://localhost:3000
```

### 5. Run the App With Docker

Pull the Docker image:

```bash
docker pull chengxun123/spendwise-app:2.0
```

Run the container:

```bash
docker run --rm -p 3000:3000 --env-file app/.env --name financetracker chengxun123/spendwise-app:2.0
```

Open the website:

```text
http://localhost:3000
```

## Docker Image

Docker Hub image:

```text
chengxun123/spendwise-app:2.0
```

## Important Notes

* The `.env` file is not included in GitHub for security reasons.
* Each user must create their own `.env` file before running the app.
* The database must be created using `docs/database.sql`.
* If using Docker, make sure Docker Desktop is running first.
* If using MySQL on Windows with Docker Desktop, set `DB_HOST=host.docker.internal`.

## Team

Team 1 Finance Tracker Project
