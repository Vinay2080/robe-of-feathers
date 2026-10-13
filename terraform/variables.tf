variable "cloudflare_api_token" {
  description = "Cloudflare API Token with Workers Scripts:Edit and Workers KV Storage:Edit permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID (available in Cloudflare dashboard URL or account settings)"
  type        = string
}

variable "worker_name" {
  description = "Base name for the Cloudflare Worker"
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Base title for the Cloudflare Workers KV namespace"
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Target deployment environment (e.g. dev, test, production)"
  type        = string
  default     = "dev"
}
