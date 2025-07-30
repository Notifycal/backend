# 🔐 Stripe API Keys & Permissions

This document defines the roles and permissions associated with the two API keys used in our Stripe integration: the **Admin API Key** and the **Operating API Key**.

---

## 1. 🛠️ Admin API Key

- **Type**: Standard secret key (unrestricted)
- **Purpose**: Used only in infrastructure (Terraform) to configure Stripe resources
- **Environment**: CI/CD pipelines
- **Mounting**: Terraform variable `stripe_admin_api_key`
- **Security**:
  - Must **never** be mounted in runtime environments (Lambdas, frontend, etc.)
  - Can read/write all resources; treat as highly privileged
  - Rotate via CI/CD secrets management

---

## 2. 🚀 Operating API Key

- **Type**: Restricted API key
- **Purpose**: Runtime operations for managing customer interactions with Stripe
- **Environment**: AWS Lambdas
- **Mounting**:
  - `STRIPE_SECRET_KEY` is injected into:
    - `POST /payment-session`
    - `POST /customer-portal`

### ✅ Enabled Permissions

| Resource                       | Permission   |
| ------------------------------ | ------------ |
| Test Clock (non prod)          | `read_write` |
| Customers                      | `read_write` |
| Payment Intents                | `read`       |
| Payment Methods                | `read`       |
| Checkout Sessions              | `read_write` |
| Customer Portal                | `read_write` |
| Invoices                       | `read`       |
| Subscriptions                  | `read_write` |
| Tax IDs                        | `read`       |
| Tax Rates                      | `read`       |
| Tax Settings and Registrations | `read`       |

### 🔒 Security Notes

- This key **cannot** create or update Products directly.
- It is scoped for long-lived runtime use, but restricted to required actions.
- Can be rotated independently from the Admin key.

---

## 🧩 Operational Policy Summary

| Key Type          | Purpose                | Mount Target      | Scope       | Rotation Responsibility |
| ----------------- | ---------------------- | ----------------- | ----------- | ----------------------- |
| Admin API Key     | Terraform provisioning | CI/CD only        | Full access | DevOps                  |
| Operating API Key | Runtime operations     | Lambdas & webhook | Restricted  | Platform backend        |

> ⚠️ If the Operating Key is found to be used outside its permitted scope (e.g. product creation), treat it as a **security incident**.
