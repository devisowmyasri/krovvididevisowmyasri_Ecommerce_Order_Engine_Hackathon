# Distributed E-Commerce Order Engine (Hackathon)

A robust, scalable backend engine simulation for an e-commerce platform, featuring concurrency handling, atomic transactions (SAGA), and a real-time visualization dashboard.

## 🚀 Overview
This project simulates the complex backend operations of high-volume platforms like Amazon or Flipkart. It handles multiple users, inventory conflicts, payment failures, and system recovery through an in-memory distributed architecture.

## 🛠 Features Implemented (Task 1-20)
- **Concurrency Control (Task 4)**: Uses an asynchronous row-level mutex (`Locker.js`) to prevent overselling.
- **SAGA Transactions (Task 7, 18)**: Atomic multi-step order placement (Reserve -> Create -> Pay) with automatic rollback on failure.
- **Real-Time Stock Reservation (Task 3, 15)**: Items added to cart are reserved with a 120-second timeout.
- **State Machine (Task 8, 14, 11)**: Event-driven lifecycle transitions and order search/status filtering.
- **Fraud & Idempotency (Task 17, 19)**: Velocity tracking and payment idempotency tokens.
- **Audit Logs (Task 16)**: Immutable append-only log stream.

## 📁 Project Structure
- `/backend`: Core services (Product, Order, etc.), API, and the **CLI Menu application**.
- `/frontend`: Modern React Dashboard for real-time system monitoring.

## 🚦 How to Run

### 1. Start the Backend (API & CLI)
```bash
cd backend
node cli.js
```
*The CLI will start the API server on port 3001 automatically.*

### 2. Start the Frontend (Dashboard)
```bash
cd frontend
npm run dev
```
*Open **http://localhost:5173** to view the live dashboard.*

## 🧪 Simulation Suite
- **Race Condition**: CLI Option 12. Run it and watch the **Audit Logs** on the dashboard to see locks preventing double-buys.
- **Safe Recovery**: CLI Option 14. Set failure rate to `0.8` and place an order. Watch the dashboard logs for the `UNDO_ALL_STEPS` recovery process.
