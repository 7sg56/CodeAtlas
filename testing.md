# CodeAtlas Testing Suite: Repository Analysis

This document tracks the testing of the CodeAtlas AI Analysis Engine across diverse full-stack environments.

---

## 📊 Test Repository Registry

### Group 1: Spring Boot & Java (Backend Focused)
| Repository | Frameworks (Deduplicated) | Entrypoints (Line #) | API Routes Count | Arch Map |
| :--- | :--- | :--- | :--- | :--- |
| [Spring PetClinic](https://github.com/spring-petclinic/spring-petclinic-reactjs) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [Fullstack Boilerplate](https://github.com/DevSkillsHQ/fullstack-boilerplate-java-springboot-react-typescript) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [React-Spring CRUD](https://github.com/RameshMF/ReactJS-Spring-Boot-CRUD-Full-Stack-App) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [React and Spring](https://github.com/kantega/react-and-spring) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [Dockerized Spring/React](https://github.com/jhordyess/dockerized-spring-react-mysql) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [In28Minutes Examples](https://github.com/in28minutes/spring-boot-react-fullstack-examples) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |

### Group 2: Node.js & MERN (Fullstack Focused)
| Repository | Entrypoint (Server) | API Routes Detected | Language Split % | Arch Map |
| :--- | :--- | :--- | :--- | :--- |
| [MERN E-Commerce](https://github.com/HuXn-WebDev/MERN-E-Commerce-Store) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [MERN Stack Example](https://github.com/mongodb-developer/mern-stack-example) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [MERN Starter](https://github.com/joshuaslate/mern-starter) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [MERN CRUD](https://github.com/MiladJoodi/MERN_Stack_CRUD) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [Node-Express-Postgres](https://github.com/japananh/node-express-postgres-boilerplate) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [Simple React Full Stack](https://github.com/crsandeep/simple-react-full-stack) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |
| [Clean Architecture Node](https://github.com/panagiop/node.js-clean-architecture) | ⚪ Pending | ⚪ Pending | ⚪ Pending | ⚪ Pending |

---

## 🛠️ Verification Checklist (Per Dashboard UI)

### 1. Header & Metadata
- [ ] **Framework Tags:** Only canonical names appear (e.g., just `Spring Boot`).
- [ ] **Counters:** File and Folder counts match the actual repository structure.

### 2. Languages Section
- [ ] **Accuracy:** Percentage breakdown matches the GitHub language bar for that repo.
- [ ] **Visuals:** Bar colors correspond to the language (Java: Orange, JS: Yellow, etc.).

### 3. Entrypoints Section
- [ ] **Main Function:** Identifies the correct `@SpringBootApplication` or `server.js` file.
- [ ] **Server Bootstrap:** Points to the specific line where the server starts (e.g., `SpringApplication.run` or `app.listen`).

### 4. API Routes Section
- [ ] **Method:** Correct color coding for `GET`, `POST`, `PUT`, `DELETE`.
- [ ] **Path Extraction:** Full REST path is visible (e.g., `/api/v1/users`).
- [ ] **Controller Link:** Clicking the route navigates to the exact file and line number in the code.

### 5. Architecture Overview
- [ ] **Hierarchy:** Top-level "Server" node points to "Entrypoint" node.
- [ ] **Routing:** Entrypoint node connects to a central "API Routes" hub.
- [ ] **Endpoints:** The hub branches out into individual endpoint nodes.

---

## 📝 Analysis Notes
*Use this space to document any "hallucinations" or parsing errors found during testing.*
- **Issue #001:** Duplicate Spring Boot tags identified in `ANIMAL-MERGE-GAME` analyze view.
