# Route53 Configuration


resource "aws_route53_record" "app" {
  zone_id = var.zone_id

  name    = var.domain_name
  type    = "A"
  
  alias {
    name                   = var.target_dns_name
    zone_id                = "Z268VQBMOI5EKX"
    evaluate_target_health = true
  }
}

# Route53 Record for www subdomain
resource "aws_route53_record" "www" {
  zone_id = var.zone_id

  name    = "www.${var.domain_name}"
  type    = "CNAME"
  ttl     = "300"
  records = [var.domain_name]
}