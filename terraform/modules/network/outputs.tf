output "vpc_id" {
  description = "The ID of the VPC"
  value       = module.vpc.vpc_id
}

output "public_subnets" {
  description = "List of public subnet IDs"
  value       = module.vpc.public_subnets
}

output "app_sg_id" {
  description = "The ID of the application security group"
  value       = aws_security_group.app.id
}

output "alb_sg_id" {
  value = aws_security_group.alb_sg.id
} 