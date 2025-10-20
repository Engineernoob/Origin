variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "origin"
}

variable "environment" {
  description = "Environment (prod, staging, dev)"
  type        = string
  default     = "prod"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "origin.example.com"
}

variable "tags" {
  description = "Common tags for resources"
  type        = map(string)
  default = {}
}

locals {
  azs = ["${var.aws_region}a", "${var.aws_region}b", "${var.aws_region}c"]
}
