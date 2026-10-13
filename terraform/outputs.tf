output "worker_name" {
  description = "Name of the deployed Cloudflare Worker"
  value       = cloudflare_worker_script.task_manager.name
}

output "kv_namespace_id" {
  description = "ID of the Cloudflare Workers KV namespace"
  value       = cloudflare_workers_kv_namespace.tasks_kv.id
}

output "kv_namespace_title" {
  description = "Title of the Cloudflare Workers KV namespace"
  value       = cloudflare_workers_kv_namespace.tasks_kv.title
}

output "environment" {
  description = "Current deployment environment"
  value       = var.environment
}
