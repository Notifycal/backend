resource "tls_private_key" "jwt_access_key" {
  # NOTE: ES256 is the same as ECDSA P256
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"

  lifecycle {
    prevent_destroy = true
  }
}

resource "tls_private_key" "jwt_refresh_key" {
  algorithm   = "ECDSA"
  ecdsa_curve = "P256"

  lifecycle {
    prevent_destroy = true
  }
}

resource "aws_ssm_parameter" "jwt_access_key" {
  for_each = {
    "private-key" = tls_private_key.jwt_access_key.private_key_pem
    "public-key"  = tls_private_key.jwt_access_key.public_key_pem
  }

  name  = "/notifycal/dev/backend/access-jwt-${each.key}"
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

  name  = "/notifycal/dev/backend/refresh-jwt-${each.key}"
  value = each.value

  type = each.key == "private-key" ? "SecureString" : "String"

  lifecycle {
    prevent_destroy = true
  }
}


# output "private_key" {
#   value     = nonsensitive(tls_private_key.jwt_key.private_key_pem)
#   # sensitive = true
# }

# output "public_key" {
#   value = tls_private_key.jwt_key.public_key_pem
# }
