terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.20"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
  
  backend "s3" {
    bucket = "origin-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Origin"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

data "aws_eks_cluster" "cluster" {
  name = module.eks.cluster_id
}

data "aws_eks_cluster_auth" "auth" {
  name = module.eks.cluster_id
}

provider "kubernetes" {
  host                   = data.aws_eks_cluster.cluster.endpoint
  cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.auth.token
}

provider "helm" {
  kubernetes {
    host                   = data.aws_eks_cluster.cluster.endpoint
    cluster_ca_certificate = base64decode(data.aws_eks_cluster.cluster.certificate_authority[0].data)
    token                  = data.aws_eks_cluster_auth.auth.token
  }
}

# VPC Module
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${var.project_name}-vpc-${var.environment}"
  cidr = var.vpc_cidr

  azs              = local.azs
  private_subnets  = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 4, k)]
  public_subnets   = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 8, k + 4)]
  database_subnets = [for k, v in local.azs : cidrsubnet(var.vpc_cidr, 4, k + 100)]

  enable_nat_gateway   = true
  single_nat_gateway   = false
  enable_dns_hostnames = true
  enable_dns_support   = true

  database_subnet_group_tags = {
    Name = "${var.project_name}-db-subnet-group-${var.environment}"
  }

  tags = {
    Environment = var.environment
  }
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${var.project_name}-eks-${var.environment}"
  cluster_version = "1.28"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true
  cluster_endpoint_private_access = true

  # IAM
  iam_role_name = "${var.project_name}-eks-role-${var.environment}"

  # Node Groups
  eks_managed_node_groups = {
    general = {
      desired_size = 3
      max_size     = 10
      min_size     = 2

      instance_type = "t3.large"
      capacity_type = "ON_DEMAND"

      k8s_labels = {
        Environment = var.environment
        NodeGroup   = "general"
      }

      iam_role_name = "${var.project_name}-eks-node-role-general-${var.environment}"
    }

    video_processing = {
      desired_size = 2
      max_size     = 6
      min_size     = 1

      instance_type = "g5.2xlarge" # GPU instances for video processing
      capacity_type = "ON_DEMAND"
      gpu = true

      k8s_labels = {
        Environment = var.environment
        NodeGroup   = "video-processing"
      }

      iam_role_name = "${var.project_name}-eks-node-role-video-${var.environment}"
    }
  }

  # Cluster Add-ons
  cluster_addons = {
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
    vpc-cni = {
      most_recent = true
    }
    aws-ebs-csi-driver = {
      most_recent = true
    }
  }

  tags = {
    Environment = var.environment
  }
}

# RDS PostgreSQL
module "rds" {
  source = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "${var.project_name}-rds-${var.environment}"

  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.r6g.2xlarge"

  allocated_storage     = 1000
  max_allocated_storage = 5000
  storage_encrypted     = true

  db_name  = "origin"
  username = "postgres"
  port     = 5432

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = module.vpc.database_subnet_group_name

  maintenance_window = "Mon:03:00-Mon:04:00"
  backup_window      = "03:00-06:00"

  backup_retention_period = 30
  skip_final_snapshot     = false
  final_snapshot_identifier = "${var.project_name}-rds-final-${var.environment}"

  performance_insights_enabled = true

  parameters = [
    {
      name  = "max_connections"
      value = "500"
    }
  ]

  tags = {
    Environment = var.environment
  }
}

# ElastiCache Redis
module "elasticache_redis" {
  source = "terraform-aws-modules/elasticache/aws"
  version = "~> 1.0"

  replication_group_id       = "${var.project_name}-redis-${var.environment}"
  replication_group_description = "Redis cluster for Origin ${var.environment}"

  node_type                   = "cache.r6g.2xlarge"
  port                        = 6379
  parameter_group_name        = "default.redis7"
  automatic_failover_enabled  = true
  multi_az_enabled            = true
  num_cache_clusters          = 2
  at_rest_encryption_enabled  = true
  transit_encryption_enabled  = true
  auth_token                  = random_password.redis_auth.result

  subnet_group_name  = aws_elasticache_subnet_group.default.name
  security_group_ids = [aws_security_group.redis.id]

  tags = {
    Environment = var.environment
  }
}

# OpenSearch Cluster (Elasticsearch)
module "opensearch" {
  source = "terraform-aws-modules/opensearch/aws"
  version = "~> 2.0"

  cluster_name    = "${var.project_name}-opensearch-${var.environment}"
  engine_version  = "OpenSearch_2.8"

  node_count_master = 3
  node_count_data   = 6
  node_count_warm   = 3

  instance_type_master = "t3.medium.search"
  instance_type_data   = "r6g.2xlarge.search"
  instance_type_warm   = "r6g.large.search"

  ebs_enabled = true
  ebs_volume_size = 1000

  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets

  security_group_ids = [aws_security_group.opensearch.id]

  encrypt_at_rest = true
  node_to_node_encryption = true
  domain_endpoint_options_enforce_https = true

  access_policies = jsonencode([
    {
      "Effect": "Allow"
      "Principal": { "AWS": "*" }
      "Action": "es:*"
      "Resource": "arn:aws:es:${var.aws_region}:${data.aws_caller_identity.current.account_id}:domain/${var.project_name}-opensearch-${var.environment}/*"
    }
  ])

  tags = {
    Environment = var.environment
  }
}

# S3 Buckets
resource "aws_s3_bucket" "videos" {
  bucket = "${var.project_name}-videos-${var.environment}"
}

resource "aws_s3_bucket" "thumbnails" {
  bucket = "${var.project_name}-thumbnails-${var.environment}"
}

resource "aws_s3_bucket" "terraform_state" {
  bucket = "origin-terraform-state"
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CloudFront Distribution
module "cloudfront" {
  source = "terraform-aws-modules/cloudfront/aws"
  version = "~> 3.0"

  aliases = [var.domain_name]

  origin = {
    s3_videos = {
      domain_name = aws_s3_bucket.videos.bucket_regional_domain_name
      s3_origin_config = {
        origin_access_identity = aws_cloudfront_origin_access_identity.default.cloudfront_access_identity_id
      }
    }
    
    s3_thumbnails = {
      domain_name = aws_s3_bucket.thumbnails.bucket_regional_domain_name
      s3_origin_config = {
        origin_access_identity = aws_cloudfront_origin_access_identity.default.cloudfront_access_identity_id
      }
    }

    api_load_balancer = {
      domain_name = aws_lb.api.dns_name
      custom_origin_config = {
        http_port              = 80
        https_port             = 443
        origin_protocol_policy = "https-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }
  }

  default_cache_behavior = {
    target_origin_id       = "api_load_balancer"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000
  }

  ordered_cache_behavior = [
    {
      path_pattern           = "/videos/*"
      target_origin_id       = "s3_videos"
      viewer_protocol_policy = "redirect-to-https"
      compress               = true
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      min_ttl                = 0
      default_ttl            = 31536000
      max_ttl                = 31536000
    },
    {
      path_pattern           = "/thumbnails/*"
      target_origin_id       = "s3_thumbnails"
      viewer_protocol_policy = "redirect-to-https"
      compress               = true
      allowed_methods        = ["GET", "HEAD", "OPTIONS"]
      cached_methods         = ["GET", "HEAD"]
      min_ttl                = 0
      default_ttl            = 86400
      max_ttl                = 86400
    }
  ]

  viewer_certificate = {
    acm_certificate_arn = aws_acm_certificate.main.arn
    ssl_support_method = "sni-only"
  }

  geo_restriction = {
    restriction_type = "none"
  }
}

# Certificate Manager
resource "aws_acm_certificate" "main" {
  domain_name       = var.domain_name
  validation_method = "DNS"

  subject_alternative_names = ["*.${var.domain_name}"]

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.main.zone_id
}

# Output values
output "eks_cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "s3_videos_bucket" {
  description = "S3 bucket for videos"
  value       = aws_s3_bucket.videos.id
}

output "s3_thumbnails_bucket" {
  description = "S3 bucket for thumbnails"
  value       = aws_s3_bucket.thumbnails.id
}

output "rds_endpoint" {
  description = "RDS endpoint"
  value       = module.rds.db_instance_endpoint
}

output "redis_endpoint" {
  description = "Redis endpoint"
  value       = module.elasticache_redis.replication_group_primary_endpoint_address
}

output "opensearch_endpoint" {
  description = "OpenSearch endpoint"
  value       = module.opensearch.domain_endpoint
}

output "cloudfront_distribution_arn" {
  description = "CloudFront distribution ARN"
  value       = module.cloudfront.cloudfront_distribution_arn
}
