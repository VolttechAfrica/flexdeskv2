variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "target_dns_name" {
  description = "Target DNS name or IP address for the domain"
  type        = string
}

variable "zone_id" {
  description = "The Route53 zone ID for DNS records"
  type        = string
}