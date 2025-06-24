# Outputs
output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = module.compute.instance_public_ip
}

output "domain_name" {
  description = "The FQDN of the DNS record"
  value       = module.dns.record_name
}

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = module.compute.instance_id
}

output "app_sg_id" {
  description = "ID of the application security group"
  value       = module.network.app_sg_id
}

# output "name_servers" {
#   description = "Name servers for the Route 53 zone"
#   value       = module.dns.name_servers
# }

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = module.alb.alb_dns_name
}

output "zone_id" {
  value = aws_route53_zone.main.zone_id
}
