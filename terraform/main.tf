terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
    azuread = {
      source  = "hashicorp/azuread"
      version = "~>2.0"
    }
  }
}

# Azure AD Provider for the demo tenant (where the app registration exists)
provider "azuread" {
  alias     = "demo_tenant"
  tenant_id = "f66009f9-3aae-4a4e-9161-974b63e7eb6a"
}

provider "azurerm" {
  features {}
}

# Use existing Resource Group
data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

# Container Registry
resource "azurerm_container_registry" "main" {
  name                = var.container_registry_name
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true

  tags = var.tags
}

# Log Analytics Workspace for Container Apps
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.app_name}-logs"
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = var.tags
}

# Container Apps Environment
resource "azurerm_container_app_environment" "main" {
  name                       = "${var.app_name}-env"
  resource_group_name        = data.azurerm_resource_group.main.name
  location                   = data.azurerm_resource_group.main.location
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = var.tags
}

# Update existing Azure AD Application to add redirect URIs
resource "azuread_application_redirect_uris" "main" {
  provider       = azuread.demo_tenant
  application_id = "/applications/${var.azure_client_id}"
  type          = "Web"
  redirect_uris = [
    "http://localhost:8000",
    "https://${azurerm_container_app.main.latest_revision_fqdn}"
  ]
}

# Container App
resource "azurerm_container_app" "main" {
  name                         = var.app_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = data.azurerm_resource_group.main.name
  revision_mode                = "Single"

  template {
    container {
      name   = "data-entry-app"
      image  = "${azurerm_container_registry.main.login_server}/data-entry-app:latest"
      cpu    = 0.5
      memory = "1Gi"

      env {
        name  = "SQL_SERVER_ENDPOINT"
        value = var.sql_server_endpoint
      }

      env {
        name  = "SQL_SERVER_PORT"
        value = var.sql_server_port
      }

      env {
        name  = "SQL_DATABASE_NAME"
        value = var.sql_database_name
      }

      env {
        name  = "AZURE_CLIENT_ID"
        value = var.azure_client_id
      }

      env {
        name  = "AZURE_TENANT_ID"
        value = var.azure_tenant_id
      }

      env {
        name        = "AZURE_CLIENT_SECRET"
        secret_name = "azure-client-secret"
      }

      env {
        name  = "SQL_ENCRYPT"
        value = "true"
      }

      env {
        name  = "SQL_TRUST_CERTIFICATE"
        value = "false"
      }

      env {
        name  = "SQL_TIMEOUT"
        value = "30"
      }
    }

    min_replicas = 1
    max_replicas = 3
  }

  secret {
    name  = "azure-client-secret"
    value = var.azure_client_secret
  }

  ingress {
    allow_insecure_connections = false
    external_enabled           = true
    target_port                = 8000

    traffic_weight {
      latest_revision = true
      percentage      = 100
    }
  }

  registry {
    server   = azurerm_container_registry.main.login_server
    username = azurerm_container_registry.main.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.main.admin_password
  }

  tags = var.tags
}