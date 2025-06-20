output "app_url" {
  description = "URL of the deployed application"
  value       = "https://${azurerm_container_app.main.latest_revision_fqdn}"
}

output "container_registry_login_server" {
  description = "Container registry login server"
  value       = azurerm_container_registry.main.login_server
}

output "container_registry_admin_username" {
  description = "Container registry admin username"
  value       = azurerm_container_registry.main.admin_username
  sensitive   = true
}

output "container_registry_admin_password" {
  description = "Container registry admin password"
  value       = azurerm_container_registry.main.admin_password
  sensitive   = true
}