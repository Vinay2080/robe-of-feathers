# Mini Project Report: Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code

---

## Chapter 1: Introduction
Modern cloud-native software systems demand rapid, repeatable, and fault-tolerant infrastructure delivery. Traditionally, infrastructure components—such as compute instances, storage accounts, networking routes, and environment parameters—were provisioned manually through graphical cloud dashboards. While intuitive for trivial experiments, manual configuration results in human errors, configuration drift, and poor reproducibility.

This project addresses these challenges by applying **Infrastructure as Code (IaC)** principles to provision and manage a serverless academic application: the **Student Task Manager**. Using **Terraform**, this project provisions a serverless compute runtime on **Cloudflare Workers** and persistent distributed storage on **Cloudflare Workers KV**, establishes execution pipelines via **GitHub Actions**, and demonstrates complete lifecycle capabilities including automated provisioning, modification, deletion, and recreation.

---

## Chapter 2: Background of Cloud Computing and IaC

### 2.1 Serverless Cloud Computing
Serverless computing abstracts underlying server management away from developers. Instead of renting persistent virtual machines, developers deploy individual functions or edge scripts that execute on-demand in response to events (e.g., HTTP requests). Cloudflare Workers utilizes lightweight V8 isolates running across a global edge network, delivering millisecond execution latency and automatic horizontal scalability without cold start penalties.

### 2.2 Infrastructure as Code (IaC)
Infrastructure as Code is the paradigm of treating infrastructure definitions identically to application source code. Key tenets include:
- **Declarative vs Imperative**: Declarative configuration specifies *what* the final state of the infrastructure should look like rather than *how* step-by-step commands should execute.
- **State Management**: Tools maintain a record of managed infrastructure, correlating resource identifiers in code with cloud IDs.
- **Idempotency**: Running the deployment command repeatedly without code modifications yields identical results without duplicate resources or unintended side-effects.

---

## Chapter 3: Problem Statement
Colleges and academic institutions require lightweight task tracking applications for students to track coursework, lab assignments, and project deliverables. Deploying such applications via manual cloud console interactions suffers from critical drawbacks:
1. **Lack of Reproducibility**: Environments cannot be reliably cloned across development, testing, and production tiers.
2. **Configuration Drift**: Undocumented ad-hoc changes in dashboards lead to inconsistent operational behavior.
3. **Disaster Recovery Friction**: Recreating deleted or corrupted resources requires error-prone manual recreation.
4. **Absence of Version Control**: History, code review, and rollback capabilities are unavailable for manually configured infrastructure.

The objective of this project is to model, deploy, modify, destroy, and recreate the entire application ecosystem purely through declarative Terraform configurations.

---

## Chapter 4: Proposed Architecture

The system consists of a serverless compute tier, a globally distributed key-value storage tier, and an automated deployment pipeline:

```
+-------------------------------------------------------------------+
|                        Client Layer                               |
|              Web Browser (Desktop / Mobile Client)                |
+---------------------------------+---------------------------------+
                                  |
                                  | HTTPS (HTTP/2, HTTP/3)
                                  v
+-------------------------------------------------------------------+
|                     Edge Serverless Compute                       |
|             Cloudflare Worker (student-task-manager)             |
|   - Serves Web Interface (HTML5, CSS3, JavaScript)                |
|   - Exposes RESTful API (/api/tasks, /api/tasks/:id)             |
+---------------------------------+---------------------------------+
                                  |
                                  | Resource Binding (TASKS_KV)
                                  v
+-------------------------------------------------------------------+
|                    Global Storage Engine                          |
|             Cloudflare Workers KV (student_tasks)                 |
|   - Key: Task ID (e.g., T101, T102)                               |
|   - Value: JSON Payload { id, title, priority, status, ... }      |
+-------------------------------------------------------------------+
```

---

## Chapter 5: Technologies Used

| Layer | Technology | Role |
|---|---|---|
| **IaC Orchestrator** | HashiCorp Terraform | Declarative infrastructure definition, planning, and state tracking |
| **Cloud Provider** | Cloudflare (`cloudflare/cloudflare`) | Official provider translating HCL declarations to Cloudflare API calls |
| **Compute Engine** | Cloudflare Workers | Serverless V8 isolate compute hosting both the frontend and API |
| **Storage Engine** | Cloudflare Workers KV | Distributed low-latency key-value store for task persistence |
| **Application Stack** | HTML5, CSS3, Modern JS (ES Modules) | Client-side responsive interface and serverless worker controller |
| **Version Control** | Git & GitHub | Source tracking, code reviews, and infrastructure repository |
| **CI/CD** | GitHub Actions | Automated linting, validation, planning, and deployment on push |

---

## Chapter 6: Terraform Configuration

The infrastructure is broken down into modular HCL files:
- `providers.tf`: Declares the required provider version and initializes the Cloudflare API client.
- `variables.tf`: Decouples environment-specific parameters (e.g., `account_id`, `worker_name`, `environment`).
- `main.tf`: Defines the core resources:
  1. `cloudflare_workers_kv_namespace.tasks_kv`: Generates the KV database namespace.
  2. `cloudflare_worker_script.task_manager`: Packages `worker.js` and injects the `TASKS_KV` binding.
- `outputs.tf`: Outputs deployment metadata including Worker name and KV namespace identifier.

---

## Chapter 7: Application Implementation

The application contains two interconnected subsystems within `application/worker.js`:
1. **RESTful API Service**:
   - `GET /api/tasks`: Enumerates task keys in KV and returns task objects.
   - `POST /api/tasks`: Generates a unique task ID (`TXXX`), validates task attributes, and saves to KV.
   - `PUT /api/tasks/:id`: Updates an existing task's title, priority, or status.
   - `DELETE /api/tasks/:id`: Removes the specified task record from KV.
2. **Self-Contained Frontend Server**:
   - Delivers the responsive user interface directly from edge memory, eliminating dependencies on external static web host buckets.

---

## Chapter 8: CI/CD Implementation

The `.github/workflows/deploy.yml` pipeline defines continuous integration and continuous deployment:
1. **Trigger**: Executes on pushes and pull requests to `main`.
2. **Terraform Format & Validate**: Executes `terraform fmt -check` and `terraform validate`.
3. **Speculative Plan**: Generates `terraform plan` output for review.
4. **Automated Apply**: Executes `terraform apply -auto-approve` when code merges into the production branch.
5. **Secret Protection**: Credentials (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) are injected exclusively via encrypted GitHub Actions Secrets.

---

## Chapter 9: Testing and Results

### Functional Test Cases
1. **Create Task**: Submitted title *"Prepare Project Presentation"*, Priority *"High"*, Status *"Pending"*. Verified HTTP `201 Created` and KV insertion.
2. **Retrieve Tasks**: Executed `GET /api/tasks`. Returned JSON array containing the task.
3. **Update Task**: Invoked `PUT /api/tasks/T101` with status *"Completed"*. Verified status badge update.
4. **Delete Task**: Invoked `DELETE /api/tasks/T101`. Confirmed removal from KV storage.

### IaC Lifecycle Verification
1. **Validation & Planning**: `terraform validate` returned success; `terraform plan` accurately declared `+ 2 to add`.
2. **Provisioning**: `terraform apply` completed in under 10 seconds.
3. **Configuration Drift & Update**: Changed `environment` from `dev` to `prod`; `terraform plan` indicated in-place updates.
4. **Destruction & Reproduction**: Ran `terraform destroy` to clear cloud resources, followed by `terraform apply` to recreate identical infrastructure without manual intervention.

---

## Chapter 10: Conclusion and Future Scope

### 10.1 Conclusion
The project successfully fulfilled all requirements of declarative infrastructure provisioning. By eliminating manual console operations, the entire application stack—from storage layer to compute bindings and web frontends—is provably repeatable, version-controlled, auditable, and resilient to failure.

### 10.2 Future Scope
- **Multi-Environment Workspaces**: Expanding Terraform code with reusable modules (`modules/worker`, `modules/kv`) parameterized across `dev`, `staging`, and `production`.
- **Authentication**: Integrating Cloudflare Access or OAuth 2.0 to support role-based student and instructor access.
- **Advanced Monitoring**: Binding Cloudflare Workers Analytics Engine or Logpush for automated telemetry.

---

## Appendix: Key Theoretical Questions & Answers (Section 38)

1. **What is Infrastructure as Code (IaC)?**  
   The practice of managing, configuring, and provisioning computing infrastructure through computer-readable definition files rather than physical hardware configuration or interactive configuration tools.

2. **What problem does IaC solve?**  
   It eliminates configuration drift, human error, deployment inconsistency, undocumented infrastructure, and prolonged disaster recovery times.

3. **Why is Terraform called a declarative IaC tool?**  
   Because the user defines the desired final state of the infrastructure in code; Terraform calculates the sequence of API steps needed to achieve that state.

4. **What is a Terraform provider?**  
   A plugin that interfaces with cloud, PaaS, or SaaS APIs (such as Cloudflare, AWS, or GCP) to expose resources and data sources.

5. **What is Terraform state?**  
   A JSON file that records the mapping between resources declared in configuration files and real-world resource IDs in the cloud.

6. **What is infrastructure drift?**  
   A situation where real-world cloud resources deviate from what is defined in code, usually due to manual dashboard modifications.
