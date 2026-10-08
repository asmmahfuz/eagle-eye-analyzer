# Eagle Eye™ — Factory Test Diagnostics & Tolerance Margin Analyzer

Eagle Eye™ is an engineering analytics and diagnostic workstation application designed to evaluate Coolant Distribution Unit (CDU) factory acceptance test runs, verify statistical ±3σ tolerance bands, identify hydraulic and thermal anomalies, and generate executive sign-off reports.

---

## Key Features

- **Multi-Tier Hierarchy**: Unified visualization across Group Lead/Follow units and individual test run datasets.
- **Statistical Margin Math**: Real-time ±3σ envelope evaluation with early warning margin alerts.
- **Interactive Telemetry**: Dual-axis zoomable time-series charts for flow rates, differential pressures, temperatures, and pump speeds.
- **Automated Diagnostics**: Rule-based fault catalog isolating hydraulic imbalances, pump speed saturation, and thermal parity breaches.
- **Modbus Register Inspector**: Live register address decoding and setpoint verification for industrial automation systems.
- **Flexible Deployment**: Supports local browser preview, Electron wrapper, and high-performance native desktop packaging via Tauri v2.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Chart.js, Lucide Icons
- **Desktop Shell**: Tauri v2 (Rust backend) / Electron
- **Data Engine**: SheetJS (XLSX parsing), in-memory tolerance band math

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- Rust & Cargo *(optional, only for building native Tauri binaries)*

### Installation

```bash
# Clone the repository
git clone https://github.com/asmmahfuz/eagle-eye-analyzer.git

# Navigate to the project directory
cd eagle-eye-analyzer

# Install dependencies
npm install
```

### Running Locally

```bash
# Start Vite development server
npm run dev

# Or run desktop app via Tauri
npm run tauri:dev
```

---

## Security & Data Privacy

This repository contains only frontend and application architecture source code. Sample test logs, factory spreadsheets (`*.xlsx`), and internal unit telemetry datasets are excluded by default via `.gitignore`.
