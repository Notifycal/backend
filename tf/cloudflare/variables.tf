variable "dns_zone" {
  type = string
}

variable "cname_record" {
  type    = object({
    name = string
    value = string
  })
}