output "record_name" {
  description = "The FQDN of the DNS record"
  value       = aws_route53_record.app.fqdn
}


