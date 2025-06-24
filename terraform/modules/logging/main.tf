# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/flexdesk"
  retention_in_days = 30
} 