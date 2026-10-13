# Automated Deployment of a Serverless Student Task Management Application Using Terraform-Based Infrastructure as Code

[![IaC: Terraform](https://img.shields.io/badge/IaC-Terraform-623CE4?logo=terraform)](https://www.terraform.io/)
[![Cloud: Cloudflare](https://img.shields.io/badge/Cloud-Cloudflare%20Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![Storage: Workers KV](https://img.shields.io/badge/Storage-Workers%20KV-F38020)](https://developers.cloudflare.com/kv/)
[![CI/CD: GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=github-actions)](https://github.com/features/actions)

## 📌 Project Overview
This project demonstrates end-to-end **Infrastructure as Code (IaC)** by automating the provisioning, deployment, modification, destruction, and reproduction of a serverless **Student Task Management Application** using **Terraform** on **Cloudflare Workers** and **Workers KV**.

No cloud resources are created manually. Every piece of infrastructure is declared in code, version-controlled using Git, and continuously deployed using GitHub Actions.

---

## 🏗️ Architecture

```
                    STUDENT / END USER
                            │
                            ▼
                       Web Browser
                            │
                            ▼
                    Cloudflare Worker
                   ┌────────┴────────┐
                   ▼                 ▼
             Web Interface       REST API
             (HTML/CSS/JS)     (/api/tasks)
                                     │
                                     ▼
                            Cloudflare Workers KV
                                (TASKS_KV)
                                     │
                                     ▼
                              Task Records
```

### Infrastructure Lifecycle
```
Define Code ──▶ terraform init ──▶ terraform plan ──▶ terraform apply ──▶ Working App
      ▲                                                                         │
      │                                                                         ▼
Recreated ◀── terraform apply ◀── terraform destroy ◀── Modify Code (Drift / Updates)
```

---

## 📁 Repository Structure

```
robe-of-feathers/
├── .github/
│   └── workflows/
│       └── deploy.yml              # CI/CD deployment pipeline for GitHub Actions
├── application/
│   ├── index.html                  # Student Task Manager UI
│   ├── style.css                   # Responsive UI styling & status badges
│   ├── script.js                   # Client-side CRUD logic & REST API bindings
│   └── worker.js                   # Cloudflare Worker code (serves API & UI)
├── terraform/
│   ├── providers.tf                # Cloudflare Terraform provider configuration
│   ├── variables.tf                # Account ID, token, environment, resource names
│   ├── main.tf                     # KV Namespace & Worker script resources
│   ├── outputs.tf                  # Exported outputs (Worker name, KV ID, etc.)
│   └── terraform.tfvars.example    # Variables configuration template
├── screenshots/
│   └── README.md                   # Checklist for mandatory evaluation screenshots
├── .gitignore                      # Prevents committing state & secrets
├── REPORT_TEMPLATE.md              # Complete 10-chapter mini project report
└── README.md                       # Complete guide & viva reference
```

---

## ⚙️ REST API Endpoints

| Method | Endpoint | Description | Request Body Example |
|---|---|---|---|
| `GET` | `/api/tasks` | List all stored tasks | *None* |
| `POST` | `/api/tasks` | Create a new task | `{"title": "Submit Assignment", "priority": "High", "status": "Pending"}` |
| `GET` | `/api/tasks/:id` | Retrieve single task | *None* |
| `PUT` | `/api/tasks/:id` | Update title, priority, or status | `{"status": "Completed"}` |
| `DELETE` | `/api/tasks/:id` | Delete task by ID | *None* |

---

## 🚀 Step-by-Step Setup & Execution

### 1. Prerequisites
- **Git**: [Download Git](https://git-scm.com/) (`git --version`)
- **Terraform**: [Download Terraform](https://developer.hashicorp.com/terraform/install) (`terraform --version`)
- **Cloudflare Account**: [Sign Up](https://dash.cloudflare.com/sign-up) (Free Plan)

### 2. Generate Cloudflare API Token
1. Go to **Cloudflare Dashboard** → **My Profile** → **API Tokens** → **Create Token**.
2. Create a custom token with the following permissions:
   - `Account` | `Workers KV Storage` | `Edit`
   - `Account` | `Workers Scripts` | `Edit`
   - `Account` | `Account Settings` | `Read`
3. Copy the generated **API Token**.
4. Retrieve your **Account ID** from the Cloudflare Dashboard overview page or Workers overview page.

### 3. Configure Terraform Locally
Navigate to the `terraform` directory:
```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```
Edit `terraform.tfvars`:
```hcl
cloudflare_api_token  = "YOUR_ACTUAL_CLOUDFLARE_API_TOKEN"
cloudflare_account_id = "YOUR_ACTUAL_CLOUDFLARE_ACCOUNT_ID"
worker_name           = "student-task-manager"
kv_namespace_name     = "student_tasks"
environment           = "dev"
```
*(Note: `terraform.tfvars` is listed in `.gitignore` and must never be committed to Git).*

### 4. Initialize, Validate, and Plan
```bash
# 1. Initialize provider plugins
terraform init

# 2. Format code
terraform fmt

# 3. Validate configuration syntax
terraform validate

# 4. View proposed execution plan
terraform plan
```

### 5. Deploy Infrastructure
```bash
terraform apply
```
Type `yes` when prompted. Terraform will provision:
1. `cloudflare_workers_kv_namespace.tasks_kv`
2. `cloudflare_worker_script.task_manager` (with binding to `TASKS_KV`)

Verify the outputs in terminal:
- `worker_name`
- `kv_namespace_id`

### 6. Test the Application
Visit your deployed Worker URL:
`https://student-task-manager-dev.<your-subdomain>.workers.dev`
- **Create**: Add a task (e.g., `Submit Cloud Computing Assignment`, Priority `High`, Status `Pending`).
- **Read**: View the task listed in the academic table.
- **Update**: Click `Done` to mark status `Completed`.
- **Delete**: Click `Delete` to remove the task from KV storage.

### 7. Demonstrate Infrastructure Modification
1. Change `environment = "prod"` or modify an environment variable in `terraform.tfvars`.
2. Run `terraform plan` to observe the proposed changes.
3. Run `terraform apply` to apply the update.

### 8. Demonstrate Infrastructure Destruction & Recreation
```bash
# Destroy all managed infrastructure
terraform destroy

# Verify in Cloudflare dashboard that Worker and KV are removed!

# Recreate everything automatically from code
terraform apply -auto-approve
```

---

## 🔄 CI/CD with GitHub Actions

1. Create a repository on GitHub:
   ```bash
   git init
   git add .
   git commit -m "feat: initial commit with Terraform IaC and Cloudflare Worker application"
   git branch -M main
   git remote add origin https://github.com/<your-username>/student-task-manager-iac.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** → **Secrets and variables** → **Actions**.
   - Add **New repository secret**:
     - `CLOUDFLARE_API_TOKEN` = `<your-api-token>`
     - `CLOUDFLARE_ACCOUNT_ID` = `<your-account-id>`
3. Any push to `main` will automatically trigger the workflow in `.github/workflows/deploy.yml` which validates, plans, and applies infrastructure changes.

---

## 📸 Evaluation Screenshot Checklist

Save screenshots in the `screenshots/` directory for final evaluation:
- [ ] `1. terraform --version`
- [ ] `2. terraform init`
- [ ] `3. terraform validate`
- [ ] `4. terraform plan`
- [ ] `5. terraform apply`
- [ ] `6. Cloudflare Worker in Dashboard`
- [ ] `7. Workers KV Namespace in Dashboard`
- [ ] `8. Running Web Application`
- [ ] `9. CRUD - Create Operation`
- [ ] `10. CRUD - Update Operation`
- [ ] `11. CRUD - Delete Operation`
- [ ] `12. GitHub Repository & Commit History`
- [ ] `13. GitHub Actions Successful Run`
- [ ] `14. terraform destroy`
- [ ] `15. Infrastructure Recreation (terraform apply after destroy)`

---

## 🎯 Viva Questions & Answers

### Basic
**Q1: What is Infrastructure as Code (IaC)?**  
*Answer:* IaC is the practice of defining, provisioning, and managing cloud infrastructure using declarative, machine-readable code and configuration files rather than manually clicking buttons in a cloud web console.

**Q2: Which IaC tool and cloud provider are used in this project?**  
*Answer:* Terraform (by HashiCorp) as the IaC tool, and Cloudflare (Workers for serverless compute, Workers KV for key-value storage) as the cloud platform.

### Intermediate
**Q3: What does `terraform init`, `plan`, and `apply` do?**  
*Answer:*
- `terraform init`: Initializes the directory, sets up backend, and downloads required provider plugins (`cloudflare/cloudflare`).
- `terraform plan`: Computes the delta between declared configuration, state file, and actual cloud infrastructure to preview changes (+ create, ~ update, - destroy).
- `terraform apply`: Executes the changes against the cloud provider API and updates the state file.

**Q4: What is Terraform state?**  
*Answer:* A file (`terraform.tfstate`) that maps declared configuration resources to real-world cloud provider resource IDs and metadata.

### Advanced
**Q5: What is infrastructure drift?**  
*Answer:* Infrastructure drift occurs when real cloud resources change outside Terraform (e.g. via manual dashboard edits). Terraform detects drift during `terraform plan` and proposes reconciling the real infrastructure back to the desired code configuration.

**Q6: Why should API tokens never be stored in Terraform source code?**  
*Answer:* Hardcoding credentials exposes sensitive secrets in version control repositories. Instead, sensitive values should be injected via environment variables (`TF_VAR_...`) or secure secret managers (e.g. GitHub Secrets).
