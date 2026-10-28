# 📊 PulseLens: Automated Feedback & Sentiment Analytics Platform

> A full-stack data product and analytics pipeline built with the MERN stack and Groq Cloud API (Llama 3). PulseLens automates the ingestion, classification, and visual reporting of unstructured customer feedback in real time.

---

## ⚡ Overview

Manual classification of user reviews and bug reports is slow and difficult to scale. **PulseLens** solves this by providing an end-to-end feedback intelligence pipeline:

1. **Ingests** unstructured parent/student reviews via single web submissions or batch CSV uploads.
2. **Classifies** text using Groq Cloud API (`llama-3.3-70b-versatile`) with native **JSON Mode** to extract sentiment, issue categories, summaries, and confidence scores in **<350ms**.
3. **Aggregates** metrics through optimized MongoDB multi-stage `$facet` pipelines over compound indexes in a single database round-trip.
4. **Visualizes** actionable insights, sentiment distributions, and category breakdowns on an interactive React dashboard.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React.js (Vite), Tailwind CSS, Recharts, Lucide React, Axios |
| **Backend** | Node.js (ES Modules), Express.js, Multer, csv-parser |
| **Database** | MongoDB Atlas, Mongoose (Compound B-tree Indexing) |
| **AI / Inference** | Groq Cloud API (`llama-3.3-70b-versatile` / Llama 3) via JSON Mode |

---

## ✨ Key Features

- **Real-Time Zero-Shot Classification:** Categorizes incoming reviews into domain tags (*Instructor*, *Platform Bug*, *Pricing*, *Course Content*, *Customer Support*) and sentiments (*Positive*, *Neutral*, *Negative*).
- **Sub-350ms Inference Latency:** Powered by Groq's LPU architecture with enforced JSON schema validation.
- **High-Performance Database Aggregations:** Uses MongoDB `$facet` and `$group` stages to compute sentiment ratios, category distributions, and rolling averages in one query.
- **Bulk CSV Ingestion:** Upload customer review spreadsheets with automated batching and error-tolerant parsing.
- **Interactive UI & Charts:** Visual feedback analytics via Recharts donut and bar charts, complete with dynamic filtering, search, and pagination.
- **Offline / Rate-Limit Fallback:** Built-in heuristic fallback ensures the app remains fully functional even without an active API key or during network downtime.

---

## 📂 Project Structure

```text
pulselens/
├── server/
│   ├── config/db.js          # MongoDB connection handler
│   ├── models/Feedback.js     # Mongoose schema with compound indexes
│   ├── services/aiService.js  # Groq API client with JSON mode & fallback
│   ├── routes/feedbackRoutes.js # REST endpoints & $facet aggregation
│   └── server.js             # Express app entry point
└── client/
    ├── src/
    │   ├── components/       # Metric cards, charts, modals & table
    │   ├── App.jsx           # Main dashboard layout & API orchestration
    │   └── main.jsx
    └── vite.config.js
