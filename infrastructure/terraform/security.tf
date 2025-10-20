# Data source for current AWS caller identity
data "aws_caller_identity" "current" {}

# Random passwords
resource "random_password" "redis_auth" {
  length  = 64
  special = false
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

# Security Groups
resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-${var.environment}-"
  description = "Security group for RDS PostgreSQL"
  
  vpc_id = module.vpc.vpc_id

  ingress {
    description = "PostgreSQL from EKS"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-rds-${var.environment}"
  }
}

resource "aws_security_group" "redis" {
  name_prefix = "${var.project_name}-redis-${var.environment}-"
  description = "Security group for Redis"
  
  vpc_id = module.vpc.vpc_id

  ingress {
    description = "Redis from EKS"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-redis-${var.environment}"
  }
}

resource "aws_security_group" "opensearch" {
  name_prefix = "${var.project_name}-opensearch-${var.environment}-"
  description = "Security group for OpenSearch"
  
  vpc_id = module.vpc.vpc_id

  ingress {
    description = "OpenSearch from EKS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  ingress {
    description = "OpenSearch from ALB"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-opensearch-${var.environment}"
  }
}

resource "aws_security_group" "eks_nodes" {
  name_prefix = "${var.project_name}-eks-nodes-${var.environment}-"
  description = "Security group for EKS nodes"
  
  vpc_id = module.vpc.vpc_id

  ingress {
    description = "HTTPS from ALB"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "HTTP from ALB"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "Node-to-node communication"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    self        = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-eks-nodes-${var.environment}"
  }
}

resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-${var.environment}-"
  description = "Security group for Application Load Balancer"
  
  vpc_id = module.vpc.vpc_id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-${var.environment}"
  }
}

# Elasticache Subnet Group
resource "aws_elasticache_subnet_group" "default" {
  name       = "${var.project_name}-redis-subnet-group-${var.environment}"
  description = "ElasticCache subnet group for Redis"
  
  subnet_ids = module.vpc.database_subnets

  tags = {
    Name = "${var.project_name}-redis-${var.environment}"
  }
}

# CloudFront Origin Access
resource "aws_cloudfront_origin_access_identity" "default" {
  comment = "Origin Access Identity for Origin ${var.environment}"
}

# Route53 Zone
resource "aws_route53_zone" "main" {
  name = var.domain_name

  tags = {
    Name = "${var.project_name}-zone-${var.environment}"
  }
}

# IAM Roles and Policies
resource "aws_iam_role" "eks_node_role_general" {
  name = "${var.project_name}-eks-node-role-general-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-eks-node-role-general-${var.environment}"
  }
}

resource "aws_iam_role_policy_attachment" "eks_node_general" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_node_role_general.name
}

resource "aws_iam_role_policy_attachment" "eks_cni_general" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_node_role_general.name
}

resource "aws_iam_role_policy_attachment" "eks_container_registry" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_node_role_general.name
}

# S3 Bucket Policies
resource "aws_s3_bucket_policy" "videos" {
  bucket = aws_s3_bucket.videos.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.videos.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = module.cloudfront.cloudfront_distribution_arn
          }
        }
      }
    ]
  })
}

resource "aws_s3_bucket_policy" "thumbnails" {
  bucket = aws_s3_bucket.thumbnails.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipal"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.thumbnails.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = module.cloudfront.cloudfront_distribution_arn
          }
        }
      }
    ]
  })
}

# Secrets Manager
resource "aws_secretsmanager_secret" "database" {
  name = "${var.project_name}/database-${var.environment}"
  
  description = "Database credentials for Origin ${var.environment}"

  tags = {
    Name = "${var.project_name}-database-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = "postgres"
    password = random_password.db_password.result
    host     = module.rds.db_instance_endpoint
    port     = 5432
    dbname   = "origin"
  })
}

resource "aws_secretsmanager_secret" "redis" {
  name = "${var.project_name}/redis-${var.environment}"
  
  description = "Redis credentials for Origin ${var.environment}"

  tags = {
    Name = "${var.project_name}-redis-${var.environment}"
  }
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    host     = module.elasticache_redis.replication_group_primary_endpoint_address
    port     = 6379
    password = random_password.redis_auth.result
  })
}

resource "aws_secretsmanager_secret" "jwt" {
  name = "${var.project_name}/jwt-${var.environment}"
  
  description = "JWT secrets for Origin ${var.environment}"

  tags = {
    Name = "${var.project_name}-jwt-${var.environment}"
  }
}

resource "aws_secretsmanager_secret" "google_oauth" {
  name = "${var.project_name}/google-oauth-${var.environment}"
  
  description = "Google OAuth credentials for Origin ${var.environment}"

  tags = {
    Name = "${var.project_name}-google-oauth-${var.environment}"
  }
}
