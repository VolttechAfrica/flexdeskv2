variable "vpc_id" {
  description = "The VPC ID for the ALB."
  type        = string
}

variable "subnet_ids" {
  description = "The subnet IDs for the ALB."
  type        = list(string)
}

variable "security_group_ids" {
  description = "Security group IDs for the ALB."
  type        = list(string)
}

variable "instance_id" {
  description = "The EC2 instance ID to register with the ALB."
  type        = string
}

variable "app_port" {
  description = "The port the app is running on."
  type        = number
}

variable "certificate_arn" {
  description = "The ARN of the ACM certificate to use for HTTPS."
  type        = string
  # default     = null
} 
