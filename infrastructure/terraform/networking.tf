# Application Load Balancer
resource "aws_lb" "api" {
  name               = "${var.project_name}-api-${var.environment}"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = false

  tags = {
    Name = "${var.project_name}-api-${var.environment}"
  }
}

resource "aws_lb_target_group" "backend" {
  name     = "${var.project_name}-backend-${var.environment}"
  port     = 3000
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher            = "200"
    path               = "/health"
    port               = "traffic-port"
    protocol           = "HTTP"
    timeout            = 5
    unhealthy_threshold = 2
  }

  target_type = "ip"

  tags = {
    Name = "${var.project_name}-backend-${var.environment}"
  }
}

resource "aws_lb_target_group" "frontend" {
  name     = "${var.project_name}-frontend-${var.environment}"
  port     = 3001
  protocol = "HTTP"
  vpc_id   = module.vpc.vpc_id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher            = "200"
    path               = "/"
    port               = "traffic-port"
    protocol           = "HTTP"
    timeout            = 5
    unhealthy_threshold = 2
  }

  target_type = "ip"

  tags = {
    Name = "${var.project_name}-frontend-${var.environment}"
  }
}

# ALB Listeners
resource "aws_lb_listener" "frontend_http" {
  load_balancer_arn = aws_lb.api.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "frontend_https" {
  load_balancer_arn = aws_lb.api.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = aws_acm_certificate.main.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "backend" {
  listener_arn = aws_lb_listener.frontend_https.arn
  priority     = 100

  condition {
    path_pattern {
      values = ["/api/*", "/health", "/metrics", "/socket.io/*"]
    }
  }

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.backend.arn
  }
}

# Route53 Records
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.api.dns_name
    zone_id               = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "api.${var.domain_name}"
  type    = "CNAME"
  ttl     = 300
  records = [aws_lb.api.dns_name]
}

resource "aws_route53_record" "cdn" {
  zone_id = aws_route53_zone.main.zone_id
  name    = "cdn.${var.domain_name}"
  type    = "A"

  alias {
    name                   = module.cloudfront.cloudfront_distribution_domain_name
    zone_id               = module.cloudfront.cloudfront_distribution_hosted_zone_id
    evaluate_target_health = false
  }
}

# WAF Web ACL
resource "aws_wafv2_web_acl" "main" {
  name        = "${var.project_name}-waf-${var.environment}"
  description = "Web ACL for Origin ${var.environment}"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf-${var.environment}"
    sampled_requests_enabled   = true
  }

  # SQL Injection rule
  rule {
    name     = "SQLInjectionRule"
    priority = 1

    statement {
      sqli_match_statement {
        field_to_match {
          body {}
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    action {
      block {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLInjectionRule"
      sampled_requests_enabled   = true
    }
  }

  # Cross-Site Scripting rule
  rule {
    name     = "XSSRule"
    priority = 2

    statement {
      xss_match_statement {
        field_to_match {
          body {}
        }
        text_transformation {
          priority = 0
          type     = "URL_DECODE"
        }
        text_transformation {
          priority = 1
          type     = "HTML_ENTITY_DECODE"
        }
      }
    }

    action {
      block {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "XSSRule"
      sampled_requests_enabled   = true
    }
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 3

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    action {
      block {}
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }
  }

  tags = {
    Name = "${var.project_name}-waf-${var.environment}"
  }
}

resource "aws_wafv2_web_acl_association" "main" {
  resource_arn = aws_lb.api.arn
  web_acl_arn  = aws_wafv2_web_acl.main.arn
}
