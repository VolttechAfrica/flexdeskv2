# EC2 Instance
resource "aws_instance" "flexdesk-backend" {
  ami           = var.ami_id
  instance_type = var.instance_type
  iam_instance_profile = var.iam_instance_profile

  vpc_security_group_ids = var.vpc_security_group_ids
  subnet_id              = var.subnet_id

  associate_public_ip_address = true

  user_data = <<-EOF
              #!/bin/bash
              apt update && sudo apt upgrade -y
              apt install -y curl ca-certificates gnupg
              curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
              
              # Install Docker
              apt install -y docker.io
              systemctl start docker
              systemctl enable docker
              
              # Install Docker Compose
              curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
              chmod +x /usr/local/bin/docker-compose
              
              # Install git
              apt install -y git
              
              # Install nginx
              apt install -y nginx

              #install nodejs
              sudo apt-get install -y nodejs
              
              # Start nginx
              systemctl start nginx
              systemctl enable nginx
              
              # Configure nginx to serve a simple response
              cat > /etc/nginx/sites-available/flexdesk << 'NGINX_CONF'
              server {
                listen 80;
                server_name ${var.domain_name};
                
                location / {
                        proxy_pass localhost:8000;
                        proxy_set_header Host $host;
                        proxy_set_header X-Real-IP $remote_addr;
                        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                        proxy_set_header X-Forwarded-Proto $scheme;
                        proxy_set_header X-Forwarded-Host $host;
                        proxy_set_header X-Forwarded-Server $host;
                        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
                        proxy_set_header X-Forwarded-Proto $scheme;
                }
              }
              NGINX_CONF
              
              # Enable the site
              ln -sf /etc/nginx/sites-available/flexdesk /etc/nginx/sites-enabled/
              rm -f /etc/nginx/sites-enabled/default
              
              # Test nginx config and restart
              nginx -t && systemctl restart nginx
              
              EOF

  tags = merge(var.tags, {
    Name = "flexdesk-backend-instance"
  })
} 