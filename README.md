# Data Management & Export Tool

A modern data management platform built with Next.js, MongoDB, and Shadcn UI.

## Features

- **Contact Management**: Import, filter, and manage contact data
- **Large File Support**: Handle CSV and Excel files up to 5GB
- **Advanced Filtering**: Create complex filters with multiple conditions
- **Data Exports**: Export filtered data in various formats (CSV, JSON, TXT)
- **Data Quality**: Monitor and improve your data quality
- **Modern UI**: Clean, responsive interface using Shadcn UI components

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Next.js API routes
- **Database**: MongoDB with Mongoose
- **File Processing**: Server-side processing with background jobs

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)

### Installation

1. Clone the repository

```bash
git clone https://github.com/yourusername/data-manager.git
cd data-manager
```

2. Install dependencies

```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following content:

```
MONGODB_URI=mongodb://localhost:27017/data-manager
```

4. Run the development server

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

- `/app`: Next.js app router pages and layouts
- `/components`: React components
  - `/ui`: Shadcn UI components
  - `/email`: Data management components
- `/lib`: Utility functions and database models
  - `/models`: Mongoose models for MongoDB

## Data Filtering and Export Features

- **Multi-condition Filters**: Create complex filters with AND/OR logic
- **Field Selection**: Choose which fields to include in exports
- **Export Formats**: Export to CSV, JSON, or TXT formats
- **Data Quality Metrics**: Monitor the health of your data
- **Bulk Operations**: Apply actions to filtered data sets
