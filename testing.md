# CodeAtlas Testing Suite: Repository Analysis

This document tracks the testing of the CodeAtlas AI Analysis Engine across diverse full-stack environments.

## 1. Primary Bug Tracking: Framework Deduplication
**Issue:** [Spring Boot] and [Spring Boot (Java)] appearing as separate tags.
**Goal:** Verify that the `MetadataService` canonicalizes these into a single `Spring Boot` tag.

---

## 2. Test Repository Registry

### Group A: Java & Spring Boot (The "Deduplication" Group)
| Repository | Analysis Status | Duplicate Tags Found? | Key Entrypoint Detected |
| :--- | :--- | :--- | :--- |
| [Spring PetClinic (React)](https://github.com/spring-petclinic/spring-petclinic-reactjs) | ⚪ Pending | [ ] Yes / [ ] No | `PetClinicApplication.java` |
| [Fullstack Boilerplate](https://github.com/DevSkillsHQ/fullstack-boilerplate-java-springboot-react-typescript) | ⚪ Pending | [ ] Yes / [ ] No | `BackendApplication.java` |
| [React-Spring CRUD](https://github.com/RameshMF/ReactJS-Spring-Boot-CRUD-Full-Stack-App) | ⚪ Pending | [ ] Yes / [ ] No | `SpringBootBackendApplication` |
| [React and Spring (Kantega)](https://github.com/kantega/react-and-spring) | ⚪ Pending | [ ] Yes / [ ] No | `Application.java` |
| [Dockerized Spring/React](https://github.com/jhordyess/dockerized-spring-react-mysql) | ⚪ Pending | [ ] Yes / [ ] No | `DockerSpringApplication` |
| [Spring-Boot-React-Examples](https://github.com/in28minutes/spring-boot-react-fullstack-examples) | ⚪ Pending | [ ] Yes / [ ] No | Multi-module detection |

### Group B: Node.js & MERN Stack (The "Discovery" Group)
| Repository | Analysis Status | API Endpoints Found | Modules Identified |
| :--- | :--- | :--- | :--- |
| [MERN Stack Project (Topic)](https://github.com/topics/mern-stack-project) | ⚪ Pending | /api/... | Backend, Client |
| [MERN E-Commerce Store](https://github.com/HuXn-WebDev/MERN-E-Commerce-Store) | ⚪ Pending | /api/products | Auth, Products |
| [MERN Stack Example (Mongo)](https://github.com/mongodb-developer/mern-stack-example) | ⚪ Pending | /record | Server, Client |
| [MERN Starter](https://github.com/joshuaslate/mern-starter) | ⚪ Pending | /api/post | Controllers, Models |
| [MERN CRUD](https://github.com/MiladJoodi/MERN_Stack_CRUD) | ⚪ Pending | /tasks | Express Server |
| [Node-Express-Postgres](https://github.com/japananh/node-express-postgres-boilerplate) | ⚪ Pending | /v1/auth | Middlewares, Services |
| [Simple React Full Stack](https://github.com/crsandeep/simple-react-full-stack) | ⚪ Pending | /api/getUsername | Webpack, Express |

### Group C: Advanced Architecture Mapping
| Repository | Focus | Expected Architecture Graph |
| :--- | :--- | :--- |
| [Node.js Clean Architecture](https://github.com/panagiop/node.js-clean-architecture) | Layers | `Controllers -> Use Cases -> Domain` |

---

## 3. Correctness Properties (Validation Checklist)

According to the Design Document, each repo must pass:

- [ ] **Property 3 (Overview):** Summary, primary language, and technologies are present.
- [ ] **Property 5 (Module Detection):** Every file is assigned to exactly one module.
- [ ] **Property 7 (Onboarding):** Path generated has 5–20 relevant steps.
- [ ] **Property 10 (API Discovery):** HTTP Method and Path are extracted for all routes.
- [ ] **Property 16 (Sanitization):** No API keys leaked to AI Analysis Engine.

## 4. Notes & Observations
*Use this section to record how the LLM handles specific file-level explanations.*