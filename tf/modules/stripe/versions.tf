terraform {
  required_version = ">= 1.5"
  required_providers {
    stripe = {
      source  = "lukasaron/stripe"
      version = ">= 3.3.0"
    }
  }
}
