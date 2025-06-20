variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "data_entry_app"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "West Europe"
}

variable "app_name" {
  description = "Name of the container app"
  type        = string
  default     = "data-entry-app"
}

variable "container_registry_name" {
  description = "Name of the container registry (must be globally unique)"
  type        = string
  default     = "acrDataEntryApp001"
}

variable "sql_server_endpoint" {
  description = "SQL Server endpoint"
  type        = string
}

variable "sql_server_port" {
  description = "SQL Server port"
  type        = string
  default     = "1433"
}

variable "sql_database_name" {
  description = "SQL Database name"
  type        = string
}

variable "azure_client_id" {
  description = "Azure AD Client ID"
  type        = string
}

variable "azure_tenant_id" {
  description = "Azure AD Tenant ID"
  type        = string
}

variable "azure_client_secret" {
  description = "Azure AD Client Secret"
  type        = string
  sensitive   = true
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Environment = "production"
    Project     = "data-entry-app"
    ManagedBy   = "terraform"
  }
}