# CodeAtlas 

CodeAtlas is a comprehensive repository analysis and visualization tool. It automatically scans repositories, detects the programming languages and frameworks used, and provides a clear, interactive visual structure of the codebase.

## Features

- **Automated Repository Scanning**: Feed it a repository, and it analyzes it in seconds.
- **Framework & Language Detection**: Automatically identifies frameworks (e.g., React, Node.js, Vue, Tauri) and languages within the repository. Multi-framework detection is supported for monorepos and polyglot projects.
- **Interactive File Tree Visualization**: Explore the directory structure of scanned repositories through an intuitive web interface.
- **Vim-Style Search**: Power-users can enjoy the built-in Vim-style command and search palette (`/` and `Cmd+K` / `Ctrl+K`) to quickly navigate and find files.
- **Premium Dark Theme**: Clean, highly readable premium dark aesthetic featuring curated accent colors.
- **Dockerized**: Fully containerized setup for seamless deployment and local testing across environments.

## Architecture

CodeAtlas is split into two main services:

- **Frontend**: A Next.js web application styled with Tailwind CSS, providing a sleek, responsive interface.
- **Backend**: An Express.js Node backend that handles repository cloning (`simple-git`), language parsing, node counting, and file tree generation.

## Getting Started

The easiest way to run CodeAtlas is with Docker Compose. Node.js 22 is the standard runtime for both environments.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Running with Docker

1. Clone this repository:
   ```bash
   git clone https://github.com/7sg56/CodeAtlas.git
   cd CodeAtlas
   ```

2. Start the application using Docker Compose:
   ```bash
   docker compose up --build
   ```

3. Open your browser and navigate to `http://localhost:3000` to access the CodeAtlas interface! The backend API runs concurrently on `http://localhost:5001`.

