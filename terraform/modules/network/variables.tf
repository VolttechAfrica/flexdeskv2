variable "aws_region" {
  description = "AWS region for networking resources"
  type        = string
}

variable "environment" {
  description = "Environment name for tagging"
  type        = string
}

variable "app_port" {
  description = "Application port to open in the security group"
  type        = number
} 