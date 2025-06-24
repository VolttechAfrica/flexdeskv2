// provider variables
variable "aws_region" {
    description = "AWS region to deploy resources"
    type = string
    default = "af-south-1"
}

// resource variables
variable "instance_type" {
    description = "The instance type to deploy"
    type = string
    default = "t3.micro"
}


variable "environment" {
    description = "Environment name (e.g., dev, prod)"
    type = string
    default = "production"
}

variable "app_port" {
    description = "Port exposed by the application"
    type = number
    default = 8000
}

variable "domain_name" {
    description = "Domain name for the application"
    type = string
    default = "flexdesk.sch.ng"
}

variable "tags" {
    description = "A map of tags to add to all resources"
    type = map(string)
    default = {
        Project     = "flexdesk"
        Environment = "production"
    }
}



