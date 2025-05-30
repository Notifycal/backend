terraform {
  required_version = ">= 1.5"
  required_providers {
    stripe = {
      source  = "lukasaron/stripe"
      version = "~> 3.3.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.86"
    }
  }
}
