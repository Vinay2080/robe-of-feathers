# 1. Cloudflare Workers KV Namespace for persistent task storage
resource "cloudflare_workers_kv_namespace" "tasks_kv" {
  account_id = var.cloudflare_account_id
  title      = "${var.kv_namespace_name}_${var.environment}"
}

# 2. Cloudflare Worker Script with KV Namespace binding
resource "cloudflare_workers_script" "task_manager" {
  account_id         = var.cloudflare_account_id
  name               = "${var.worker_name}-${var.environment}"
  content            = file("${path.module}/../application/worker.js")
  module             = true
  compatibility_date = "2024-01-01"

  kv_namespace_binding {
    name         = "TASKS_KV"
    namespace_id = cloudflare_workers_kv_namespace.tasks_kv.id
  }

  plain_text_binding {
    name = "ENVIRONMENT"
    text = var.environment
  }
}

# 3. Automatically ensure public workers.dev route is enabled on deploy
resource "terraform_data" "enable_workers_dev" {
  input = cloudflare_workers_script.task_manager.name

  provisioner "local-exec" {
    interpreter = ["powershell", "-NoProfile", "-Command"]
    command     = "Invoke-RestMethod -Uri 'https://api.cloudflare.com/client/v4/accounts/${var.cloudflare_account_id}/workers/scripts/${cloudflare_workers_script.task_manager.name}/subdomain' -Method Post -Headers @{ Authorization = 'Bearer ${var.cloudflare_api_token}'; 'Content-Type' = 'application/json' } -Body '{\"enabled\": true}'"
  }
}
