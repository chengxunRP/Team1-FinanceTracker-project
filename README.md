# Team1 Finance Tracker Projects

SpendWise is a finance tracker web application built using Node.js, Express, EJS, MySQL, and Docker.

## Features

* Add, view, edit, and delete expenses
* Manage expense categories
* Set monthly budget limits
* View budget alertsst
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

## Feature 7: Smart Spending Recommendation (Individual Work Guide)

This section documents how Feature 7 is implemented and how to demo it clearly for assessment.

### What Feature 7 does

Feature 7 checks a planned purchase against the current monthly budget and spending data, then returns one of three outcomes:

* Safe to buy
* Risky
* Not recommended

The logic also explains why (for example: close to 80% warning level, too little budget remaining, or overspending risk).

### Main files for Feature 7

* `app/recommendationHelpers.js` - Core recommendation rules and analysis
* `app/routes/expenses.js` - API endpoint: `POST /expenses/purchase-check`
* `app/public/js/purchase-check.js` - Client-side request + result rendering
* `app/views/partials/expense-form-fields.ejs` - "Check purchase" button and output container
* `app/chatbotHelpers.js` - FinBot purchase-check replies based on the same recommendation logic
* `app/tests/recommendationTest.js` - Unit tests for recommendation behavior

### Recommendation rules summary

* Not recommended:
	* item price is more than remaining budget, or
	* purchase pushes spending above 100%
* Risky:
	* budget usage reaches 80% to 99%, or
	* purchase consumes a large share of remaining budget, or
	* very little budget remains after purchase
* Safe to buy:
	* purchase stays under warning/overspending conditions

### How to run Feature 7 tests

From project root:

```bash
cd app
npm run test:recommendation
```

Expected output: all tests pass.

### Suggested demo script for Feature 7

1. Start the app and open `http://localhost:3000`.
2. Go to Expenses and open Add Expense form.
3. Enter an amount and click "Check purchase".
4. Show response sections:
	 * Status
	 * Current situation
	 * After purchase
	 * Advice / reasons
5. Demonstrate three scenarios:
	 * Safe to buy
	 * Risky (around 80% usage)
	 * Not recommended (exceeds remaining budget)
6. Optionally ask FinBot: "Can I buy a $50 item?" to show consistent logic.

## Localhost Quick Start (Windows)

If you want to run locally without Docker:

1. Ensure MySQL is running and database tables are created using `docs/database.sql`.
2. Create `app/.env` from `app/.env.example`.
3. Open terminal at project root.
4. Run:

```bash
cd app
npm install
npm start
```

5. Open `http://localhost:3000` in your browser.

If localhost does not open:

* Check terminal errors from `npm start`.
* Ensure `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` are correct in `app/.env`.
* Confirm MySQL is reachable on the configured port.
* Check if port 3000 is already in use by another app.

If you prefer Docker Compose (app + MySQL):

```bash
docker compose up --build
```

Then open `http://localhost:3000`.

## Team

Team 1 Finance Tracker Project
