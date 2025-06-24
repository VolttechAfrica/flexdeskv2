terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
  backend "remote" {
    organization = "Flexdesk"
    workspaces {
      name = "Flexdesk-backend"
    }
  }
}

module "network" {
  source = "./modules/network"

  aws_region  = var.aws_region
  environment = var.environment
  app_port    = var.app_port
}

module "compute" {
  source = "./modules/compute"

  instance_type          = var.instance_type
  tags                   = var.tags
  domain_name            = var.domain_name
  app_port               = var.app_port
  vpc_security_group_ids = [module.network.app_sg_id]
  subnet_id              = module.network.public_subnets[0]
  iam_instance_profile   = aws_iam_instance_profile.ec2_ssm_instance_profile.name
  ami_id                 = data.aws_ami.ubuntu.id

  depends_on = [module.network]
}

resource "aws_route53_zone" "main" {
  name = var.domain_name
}

module "dns" {
  source = "./modules/dns"

  domain_name     = var.domain_name
  target_dns_name = module.alb.alb_dns_name
  zone_id         = aws_route53_zone.main.zone_id
  depends_on = [module.compute, module.alb]
}


module "logging" {
  source = "./modules/logging"
}

// TODO: add certificate ARN
module "certificate" {
  source = "./modules/certificate"
  domain_name = var.domain_name
  zone_id = aws_route53_zone.main.zone_id

  depends_on = [aws_route53_zone.main] 
}

module "alb" {
  source              = "./modules/alb"
  vpc_id              = module.network.vpc_id
  subnet_ids          = module.network.public_subnets
  security_group_ids  = [module.network.alb_sg_id]
  instance_id         = module.compute.instance_id
  app_port            = var.app_port
  certificate_arn     = module.certificate.certificate_arn // TODO: add certificate ARN
}