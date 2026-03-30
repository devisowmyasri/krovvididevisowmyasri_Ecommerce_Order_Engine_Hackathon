# Distributed E-Commerce Order Engine (Hackathon)

A robust, scalable backend engine simulation for an e-commerce platform, featuring concurrency handling, atomic transactions (SAGA), and a real-time visualization dashboard.

## Overview
This project simulates the complex backend operations of high-volume platforms like Amazon or Flipkart. It handles multiple users, inventory conflicts, payment failures, and system recovery through an in-memory distributed architecture.

## 🛠 Features Implemented (Task 1-20)
- **Concurrency Control (Task 4)**: Uses an asynchronous row-level mutex (`Locker.js`) to prevent overselling.
- **SAGA Transactions (Task 7, 18)**: Atomic multi-step order placement (Reserve -> Create -> Pay) with automatic rollback on failure.
- **Real-Time Stock Reservation (Task 3, 15)**: Items added to cart are reserved with a 120-second timeout.
- **State Machine (Task 8, 14, 11)**: Event-driven lifecycle transitions and order search/status filtering.
- **Fraud & Idempotency (Task 17, 19)**: Velocity tracking and payment idempotency tokens.
- **Audit Logs (Task 16)**: Immutable append-only log stream.

## Design Approach
- **Modular Services**: The architecture follows a loose-coupled service-oriented design. Product, Cart, Order, and Payment logic are isolated to simulate a microservice ecosystem.
- **Data Integrity**: Uses an asynchronous Mutex pattern for row-level locking during inventory updates to ensure zero data corruption during high-concurrency "Flash Sales".
- **Resilience**: Implements a SAGA-like transaction coordinator that tracks every step of order placement. If a downstream step (like Payment) fails, it automatically triggers compensatory actions (like Restoring Stock) across the system.
- **Event-Driven**: System-wide notifications (e.g., LOW_STOCK_ALERT) are handled via a central EventBus to decouple business logic from monitoring.

##  Assumptions
- **In-Memory Storage**: For hackathon simulation purposes, all data is stored in-memory. Restarting the backend will reset the inventory and order counts.
- **Single User Simulation**: While the backend is built for multi-tenancy, the CLI and Dashboard currently focus on simulating interactions for `USER_1`.
- **Clock Synchronization**: Timeouts (120s for cart) are handled via server-side timers and assume a consistent system clock.

##  Project Structure
- `/backend`: Core services (Product, Order, etc.), API, and the **CLI Menu application**.
- `/frontend`: Modern React Dashboard for real-time system monitoring.

## How to Run

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

##  Simulation Suite
- **Race Condition**: CLI Option 12. Run it and watch the **Audit Logs** on the dashboard to see locks preventing double-buys.
- **Safe Recovery**: CLI Option 14. Set failure rate to `0.8` and place an order. Watch the dashboard logs for the `UNDO_ALL_STEPS` recovery process.
