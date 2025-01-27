resource "tls_private_key" "jwt_access_key" {
  # NOTE: ES256 is the same as ECDSA P256
  algorithm   = startswith(var.jwt_config.refresh.algorithm, "ES") ? "ECDSA" : null
  ecdsa_curve = endswith(var.jwt_config.access.algorithm, "256") ? "P256" : null

  lifecycle {
    prevent_destroy = true
  }
}

resource "tls_private_key" "jwt_refresh_key" {
  algorithm   = startswith(var.jwt_config.refresh.algorithm, "ES") ? "ECDSA" : null
  ecdsa_curve = endswith(var.jwt_config.access.algorithm, "256") ? "P256" : null

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_ssm_parameter" "jwt_access_key" {
  for_each = {
    "private-key" = tls_private_key.jwt_access_key.private_key_pem
    "public-key"  = tls_private_key.jwt_access_key.public_key_pem
  }

  name  = "/notifycal/${var.environment}/backend/access-jwt-${each.key}"
  value = each.value

  type = each.key == "private-key" ? "SecureString" : "String"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_ssm_parameter" "jwt_refresh_key" {
  for_each = {
    "private-key" = tls_private_key.jwt_refresh_key.private_key_pem
    "public-key"  = tls_private_key.jwt_refresh_key.public_key_pem
  }

  name  = "/notifycal/${var.environment}/backend/refresh-jwt-${each.key}"
  value = each.value

  type = each.key == "private-key" ? "SecureString" : "String"

  lifecycle {
    prevent_destroy = true
  }
}
