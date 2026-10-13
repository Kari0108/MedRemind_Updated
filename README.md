# MedRemind+

MedRemind+ is an academic B.Tech project that combines a personal medicine schedule manager with an offline Big Data and Natural Language Processing (NLP) symptom assessment pipeline.

The application helps users track their daily medications with browser-based reminders, while also providing a preliminary symptom checker. Rather than relying on external cloud AI APIs for symptom assessment, the project implements an on-premise Big Data pipeline using Apache Hadoop (HDFS), Apache Hive, and a local TF-IDF text similarity engine running on a single-node Docker container.

---

## Main Features

- **User Authentication & Isolation**: User registration and login powered by bcrypt password hashing and JSON Web Tokens (JWT). Each user has private access to their own medication schedule and symptom history.
- **Medicine Schedule Management**: Create, update, view, and delete daily medication schedules (name, dosage, scheduled time, and notes).
- **Automated Intake Reminders**: In-browser timer that triggers visual alerts and audio notifications when a scheduled medication time is reached.
- **Big Data Symptom Retrieval**: Free-text symptoms are matched against 1,200 medical case records stored on HDFS and queried via Apache Hive using HiveQL.
- **NLP Information Extraction & TF-IDF Scoring**: User symptom text is processed through stopword removal, synonym normalization, and TF-IDF vectorization with cosine similarity matching against retrieved cases.
- **Clinical Safety Triage & Red-Flag Alerts**: Checks for high-risk red flags (such as chest pain, breathing difficulty, or neurological signs) and prioritizes urgent safety guidance over non-urgent matching.
- **Structured 4-Section Assessment**: Delivers a clear breakdown:
  1. *Symptom Assessment*: Natural summary reflecting reported symptoms and duration.
  2. *Possible Related Condition*: Best-matching condition with evidence rationale and clinical context, or a clear notice if evidence is insufficient.
  3. *What You Can Do Now*: Practical self-care steps.
  4. *When to Seek Medical Help*: Differentiated routine vs. urgent medical warning signs.
- **Interactive Follow-Up Chips**: Suggests related symptom tags that users can click to refine their input.
- **Symptom History Logging**: Keeps a record of past symptom checks with date, reported severity, and recommendations.
- **Fault-Tolerant Fallback**: If the Big Data Docker container is offline, the backend automatically falls back to local CSV parsing so core features remain accessible.

---

## Technologies Used

### Frontend
- **HTML5 & CSS3**: Responsive UI with dark-theme styling, modal dialogs, and card layouts.
- **Vanilla JavaScript (ES6+)**: Handles client-side routing, JWT storage, API requests, dynamic DOM rendering, and reminder intervals.

### Primary Backend
- **Node.js & Express.js**: REST API server (`server.js`) handling authentication, medicine CRUD, symptom checks, and static asset serving on port 3000.
- **SQLite3**: Lightweight local relational database (`medicines.db`) storing user credentials, medicine schedules, and assessment logs.
- **bcryptjs & jsonwebtoken**: Password hashing and stateless authentication.

### Big Data & Analytics Layer
- **Docker**: Single-container deployment (`medremind-bigdata`) hosting Hadoop and Hive.
- **Apache Hadoop 3.1.0 (HDFS)**: Stores the raw medical cases dataset at `/medremind/medical_cases/raw/dataset.csv`.
- **Apache Hive 3.1.3**: External table `medremind.raw_medical_cases` queried via HiveServer2 (Beeline JDBC on port 10000).
- **Hadoop Streaming**: Python MapReduce job (`mapper.py` and `reducer.py`) for symptom keyword frequency analysis.

### NLP & Clinical Triage
- **Custom NLP Pipeline** (`backend/nlp/index.js`): Tokenization, stopword elimination, symptom normalization, TF-IDF calculation, and cosine similarity scoring.
- **Guidance Engine** (`backend/nlp/guidanceLibrary.js`): Condition-specific self-care measures, differential factors, and emergency triage rules.

### Secondary / Optional Service
- **Spring Boot Backend** (`springboot-backend/`): Alternative Java 17 / Maven REST service with JPA and optional OpenRouter integration. The primary application uses the Node.js + Big Data stack.

---

## Architecture & Data Flow

```
                      +-----------------------------+
                      |     Browser UI (Port 3000)   |
                      +--------------+--------------+
                                     |
                          REST API / JSON (JWT)
                                     |
                      +--------------v--------------+
                      |   Node.js / Express Server  |
                      +-------+--------------+------+
                              |              |
           SQLite Database <--+              +--> NLP Engine (TF-IDF)
         (Users & Medicines)                         |
                                                     v
                                         +-----------------------+
                                         |  Big Data Layer       |
                                         |  (Docker Container)   |
                                         |                       |
                                         |  HiveQL (Port 10000)  |
                                         |         |             |
                                         |  HDFS Storage (9000)  |
                                         +-----------------------+
```

### Symptom Check Workflow
1. The user enters their symptoms, severity, and duration in the web interface.
2. The frontend sends a POST request to `/symptom-to-medicine`.
3. The Node.js backend extracts symptom tokens and constructs a SQL query (e.g. `SELECT id, label, text FROM raw_medical_cases WHERE text LIKE '%fever%' OR text LIKE '%cough%' LIMIT 50;`).
4. `backend/bigdata/hive_service.js` executes the query inside the `medremind-bigdata` container via Beeline JDBC.
5. The retrieved candidate cases are processed by the TF-IDF engine, calculating cosine similarity against the user's input.
6. If emergency symptoms are present, the system immediately returns an emergency alert and suppresses condition labels.
7. If similarity exceeds the relevance threshold, the top condition is matched and merged with structured guidance from `guidanceLibrary.js`.
8. The result is returned to the user and saved to their personal history in SQLite.

---

## Project Structure

```
med-remind/
├── README.md                      # Project documentation
├── .gitignore                     # Git ignore rules for node_modules, DBs, and secrets
├── docker-compose.yml             # Docker Compose file for Big Data container
├── DOCKER_GUIDE.md                # Docker setup documentation
├── SPRINGBOOT_SETUP.md            # Documentation for optional Spring Boot service
├── database.sql                   # MySQL schema script (optional / reference)
│
├── frontend/                      # Web user interface
│   ├── index.html                 # Single-page application markup
│   ├── script.js                  # Frontend application logic & API calls
│   └── style.css                  # UI styling
│
├── backend/                       # Node.js backend service
│   ├── server.js                  # Express API server entry point
│   ├── dataset.csv                # 1,200-row Symptom2Disease medical dataset
│   ├── package.json               # Node.js dependencies and scripts
│   ├── .env.example               # Environment variables template
│   ├── Dockerfile                 # Backend container Dockerfile
│   ├── test_assessment_scenarios.js # Clinical scenario test suite
│   │
│   ├── bigdata/                   # Big Data infrastructure scripts
│   │   ├── Dockerfile             # Big Data container (Hadoop + Hive)
│   │   ├── entrypoint_bigdata.sh  # Startup script for HDFS daemons and HiveServer2
│   │   ├── hdfs_hive_setup.sh     # Uploads dataset to HDFS and creates Hive table
│   │   ├── init_hive.sql          # Hive DDL for raw_medical_cases
│   │   ├── hive_service.js        # Node.js Beeline JDBC bridge
│   │   ├── mapper.py              # MapReduce mapper for symptom frequency
│   │   ├── reducer.py             # MapReduce reducer for symptom frequency
│   │   ├── mapreduce_run.sh       # MapReduce Hadoop Streaming execution script
│   │   ├── core-site.xml          # Hadoop core configuration
│   │   ├── hdfs-site.xml          # HDFS configuration
│   │   └── hive-site.xml          # Hive configuration
│   │
│   └── nlp/                       # NLP & Clinical Guidance Engine
│       ├── index.js               # Tokenization, TF-IDF, and similarity engine
│       ├── guidanceLibrary.js     # Evidence-based guidance & red-flag rules
│       └── test_nlp.js            # Standalone unit tests for NLP module
│
└── springboot-backend/            # Optional alternative backend (Java / Spring Boot)
    ├── pom.xml
    └── src/
```

---

## Prerequisites

Before running the project on Windows, ensure the following are installed:

- **Node.js** (v18.0.0 or higher) and **npm**
- **Docker Desktop** (with WSL2 integration enabled)
- **Git**
- *(Optional)* **Java 17** & **Maven** (only if running the Spring Boot backend)

---

## Setup & Run Instructions (Windows)

### 1. Clone the Repository

```bash
git clone https://github.com/Kari0108/MedRemind_Updated.git
cd MedRemind_Updated
```

### 2. Configure Environment Variables

Navigate to the `backend` folder and create your `.env` file from the example template:

```powershell
cd backend
copy .env.example .env
```

The default values in `.env.example` are pre-configured for local execution:
```env
PORT=3000
JWT_SECRET=medremind_super_secret_key_123
```

### 3. Install Dependencies & Start the Backend

```powershell
npm install
node server.js
```

The Express server will start on `http://localhost:3000`. It automatically creates the SQLite database (`medicines.db`) on first launch and serves the frontend.

### 4. Open the Web Application

Open your browser and navigate to:
```
http://localhost:3000
```
Register a new account or log in to manage medicines and test the symptom checker.

---

## Big Data Layer Setup (Hadoop & Hive)

The Big Data services run inside a single Docker container named `medremind-bigdata`.

### 1. Build and Start the Container

From the project root directory (`med-remind/`), run:

```powershell
docker compose up -d
```

This starts:
- **HDFS NameNode**: Port `9870` (Web UI) and `9000` (RPC)
- **HiveServer2**: Port `10000` (JDBC) and `10002` (Web UI)

Verify that the container is running:
```powershell
docker ps --filter "name=medremind-bigdata"
```

### 2. Initialize HDFS and the Hive Table

Execute the setup script inside the running container:

```powershell
docker exec -it medremind-bigdata bash /app/hdfs_hive_setup.sh
```

This script:
1. Creates HDFS directories `/medremind/medical_cases/raw`.
2. Uploads `/app/dataset.csv` into HDFS.
3. Runs Hive DDL via Beeline to create the database `medremind` and the external table `raw_medical_cases`.

### 3. Verify the Hive Table

Query the table row count via Beeline JDBC:

```powershell
docker exec medremind-bigdata beeline -u "jdbc:hive2://localhost:10000/medremind" -n root --showHeader=false --outputformat=tsv2 -e "SELECT count(*) FROM raw_medical_cases;"
```
Expected output: `1200`.

### 4. Run the Hadoop Streaming MapReduce Job

To compute symptom word frequencies across the dataset using MapReduce:

```powershell
docker exec -it medremind-bigdata bash /app/mapreduce_run.sh
```

The output will be saved to `/medremind/medical_cases/output_symptom_freq` in HDFS and the top 20 terms will be displayed in the terminal.

### 5. Stopping the Big Data Container

When finished, stop the container safely without deleting data:
```powershell
docker stop medremind-bigdata
```
To restart it later:
```powershell
docker start medremind-bigdata
```

---

## Running Tests

### 1. NLP Module Unit Tests
Test tokenization, symptom synonym resolution, and edge-case handling offline without needing Docker or the running server:

```powershell
node backend/nlp/test_nlp.js
```

### 2. Clinical Assessment Scenario Suite
Test end-to-end symptom assessment scenarios (mild, moderate, red-flag emergency, insufficient evidence) against the running server:

```powershell
node backend/test_assessment_scenarios.js
```

---

## Limitations

- **Academic Prototype**: MedRemind+ was designed and developed as a university engineering project. It is intended for educational and demonstration purposes only.
- **Not a Diagnostic Tool**: Symptom assessments and condition associations are calculated via TF-IDF vector similarity over an academic benchmark dataset. They do not constitute a clinical diagnosis or medical advice. Always consult a qualified healthcare professional.
- **Single-Node Container**: Hadoop and Hive are containerized in pseudo-distributed / single-node mode for local development and reproducibility, not as a distributed multi-node production cluster.
- **Dataset Scope**: The case library is limited to 1,200 records covering common acute and dermatological conditions. Unseen or rare conditions will return an insufficient evidence notice.

---

## Dataset Attribution & License

- **Dataset**: Symptom2Disease Dataset (`dataset.csv`, 1,200 rows).
- **Format**: `id`, `label` (condition name), `text` (natural language symptom description).
- **Source**: Public medical text benchmark dataset curated on Kaggle for text classification and symptom-to-disease research.
- **License**: Released under the **Public Domain (CC0)** for academic, research, and non-commercial educational use. Contains no patient personal health information (PHI) or personally identifiable data.
