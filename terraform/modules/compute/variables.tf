variable "instance_type" {
  description = "EC2 instance type"
  type        = string
}

variable "tags" {
  description = "Tags to apply to the instance"
  type        = map(string)
}

variable "domain_name" {
  description = "Domain name for nginx configuration"
  type        = string
}

variable "app_port" {
  description = "Application port for nginx configuration"
  type        = number
}

variable "vpc_security_group_ids" {
  description = "List of security group IDs to attach to the instance"
  type        = list(string)
}

variable "subnet_id" {
  description = "Subnet ID to launch the instance in"
  type        = string
}

variable "iam_instance_profile" {
  description = "Name of the IAM instance profile to attach to the instance"
  type        = string
  default     = null
}

variable "iam_instance_profile_name" {
  description = "Name of the IAM instance profile to attach to the instance"
  type        = string
  default     = null
}

variable "ami_id" {
  description = "AMI ID for the instance"
  type        = string
} 