# Origin Platform Production Deployment Guide

## Overview
This guide covers the complete production deployment of the Origin YouTube-scale video platform.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CDN/CloudFront│◄──►│   Nginx/LB      │◄──►│   Kubernetes    │
│   (Edge Caching)│    │   (Application) │    │   (EKS Cluster) │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │   Search Layer  │    │   Database      │
│   (Prometheus+) │◄──►│(OpenSearch)     │◄──►│ (PostgreSQL)    │
│        Grafana   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cache Layer   │    │   Video Storage │    │   Backup Storage│
│   (Redis)       │    │   (S3 Videos)   │    │   (S3 Backup)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Production Environment Details

### Infrastructure Components

#### **Compute**
- **Kubernetes**: EKS v1.28.0
- **Node Types**: t3.large (general), g5.2xlarge (video processing)
- **Auto-scaling**: HPA with custom metrics
- **Availability Zones**: 3x AZs in us-east-1

#### **Storage**
- **Database**: PostgreSQL 15.4 (RDS) with read replicas
- **Cache**: Redis 7.0 (ElastiCache) with cluster mode
- **Search**: OpenSearch 2.8 with dedicated data/warm nodes
- **Object Storage**: S3 with lifecycle policies and versioning

#### **Networking**
- **Load Balancer**: Application Load Balancer (ALB) with WAF
- **CDN**: CloudFront with origin failover
- **DNS**: Route53 with health checks
- **VPC**: Private subnets with NAT gateways

#### **Security**
- **Authentication**: JWT + Google OAuth 2.0
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: TLS 1.3, AES-256 at rest, AES-256 in transit
- **Monitoring**: CloudTrail, GuardDuty, Security Hub

## Quick Deployment Steps

### 1. Prerequisites Setup
```bash
# Clone repository
git clone https://github.com/your-org/origin.git
cd origin

# Install required tools
# AWS CLI v2.0+, Terraform v1.5+, kubectl v1.28+, helm v3.0+

# Configure AWS credentials
aws configure
```

### 2. Infrastructure Deployment
```bash
# Navigate to infrastructure
cd infrastructure/terraform

# Set environment variables
export TF_VAR_environment="production"
export TF_VAR_domain_name="origin.example.com"

# Deploy infrastructure
terraform init
terraform plan -out=production.plan
terraform apply production.plan
```

### 3. Application Deployment
```bash
# Deploy to Kubernetes
cd ../../k8s

# Apply configurations
kubectl apply -f namespaces.yaml
kubectl apply -f secrets.yaml
kubectl apply -f configmaps.yaml
kubectl apply -f storage.yaml

# Deploy services
kubectl apply -f backend-deployment.yaml
kubectl apply -f frontend-deployment.yaml

# Wait for rollout
kubectl rollout status deployment/origin-backend -n origin-production
kubectl rollout status deployment/origin-frontend -n origin-production
```

### 4. Monitoring Setup
```bash
# Deploy monitoring stack
cd ../monitoring
kubectl apply -f prometheus-production.yaml
kubectl apply -f alerts.yml

# Import Grafana dashboards
kubectl apply -f grafana-dashboards/
```

## Environment Configuration

### Required Secrets
Configure these in AWS Secrets Manager:

```bash
# Database credentials
aws secretsmanager create-secret \
    --name "origin-production/database" \
    --secret-string file://secrets/database.json

# JWT secrets
aws secretsmanager create-secret \
    --name "origin-production/jwt" \
    --secret-string file://secrets/jwt.json

# OAuth credentials
aws secretsmanager create-secret \
    --name "origin-production/google-oauth" \
    --secret-string file://secrets/google-oauth.json

# AWS credentials (for S3 access)
aws secretsmanager create-secret \
    --name "origin-production/aws" \
    --secret-string file://secrets/aws.json
```

### Environment Variables
See [env-config-example.env](../production/env-config-example.env) for all available configuration options.

## Monitoring and Observability

### Key Metrics

#### **Application Metrics**
- HTTP request rate and response times
- Error rates (4xx, 5xx)
- Database query performance
- Cache hit ratios
- Video processing queue lengths

#### **Infrastructure Metrics**
- CPU, memory, disk usage
- Network throughput
- Kubernetes pod health
- Database connections
- Redis memory usage

#### **Business Metrics**
- Active users
- Video views/uploads
- Engagement metrics
- Revenue and monetization

### Dashboards
- **Grafana**: https://grafana.origin.example.com
- **Prometheus**: https://prometheus.origin.example.com
- **Kibana**: https://kibana.origin.example.com
- **AWS CloudWatch**: https://console.aws.amazon.com/cloudwatch/

### Alerting
Alerts are configured in [alerts.yml](../monitoring/alerts.yml) and sent to:
- Slack channel: `#alerts`
- Email: oncall@origin.example.com
- PagerDuty (for critical incidents)

## Security Measures

### Application Security
- Input validation and sanitization
- SQL injection prevention
- XSS protection headers
- Content Security Policy (CSP)
- Rate limiting and DDoS protection

### Infrastructure Security
- VPC with private subnets
- Security groups with least privileged access
- WAF rules for OWASP protection
- Regular security scans
- Penetration testing quarterly

### Data Protection
- Encryption at rest (AES-256)
- Encryption in transit (TLS 1.3)
- Database encryption with customer keys
- Regular backups with 30-day retention
- GDPR and CCPA compliance

## Performance Optimization

### Database Optimization
- Connection pooling (max 100 connections)
- Query optimization and indexing
- Read replicas for read-heavy workloads
- Automated vacuum and analyze
- Query performance monitoring

### Caching Strategy
- Redis for session management and application cache
- CloudFront CDN for static assets
- Application-level caching with TTL
- Edge caching for video thumbnails

### CDN Configuration
```javascript
// Cache rules
{
  "videos/*": { "TTL": 86400, "Compress": true },
  "thumbnails/*": { "TTL": 3600, "Compress": true },
  "api/*": { "TTL": 300, "Compress": false }
}
```

## Backup and Disaster Recovery

### Backup Schedule
- **Database**: Full daily, incremental hourly, WAL continuous
- **Redis**: Snapshots every 6 hours, AOF continuous
- **S3**: Cross-region replication, versioning enabled
- **Configuration**: Daily backup to S3

### Disaster Recovery
- **RTO**: 4 hours for critical services
- **RPO**: 15 minutes for databases
- **Multi-region**: Primary (us-east-1), DR (us-west-2)
- **Failover**: Automated with manual override

### Backup Scripts
- Automated backup: [backup-script.sh](../scripts/backup-script.sh)
- Restore procedures: [restore-script.sh](../scripts/restore-script.sh)
- Cron configuration: [backup-cron.sh](../cron/backup-cron.sh)

## CI/CD Pipeline

### Deployment Flow
1. **Push to main** → Automated tests pass
2. **Build images** → Push to container registry
3. **Deploy to staging** → Smoke tests
4. **Canary to production** → 20% traffic
5. **Health verification** → Full rollout
6. **Post-deployment checks** → Monitoring confirmation

### Quality Gates
- ESLint/Prettier checks
- Unit tests with >80% coverage
- Security scans (Snyk, CodeQL)
- Performance regression tests
- Manual approval for production

### Rollback Procedures
```bash
# Check deployment history
kubectl rollout history deployment/origin-backend -n origin-production

# Rollback to previous version
kubectl rollout undo deployment/origin-backend -n origin-production
kubectl rollout status deployment/origin-backend -n origin-production
```

## Operational Procedures

### Health Checks
```bash
# Application health
curl https://api.origin.example.com/health
curl https://origin.example.com/

# Database health
aws rds describe-db-clusters --db-cluster-identifier origin-prod

# Cache health
aws elasticache describe-replication-groups --replication-group-id origin-redis-prod
```

### Log Collection
- **Application Logs**: CloudWatch Logs
- **Access Logs**: ELK Stack
- **System Logs**: CloudWatch Logs
- **Audit Logs**: CloudTrail

### Scaling Commands
```bash
# Manual scaling
kubectl scale deployment origin-backend --replicas=20 -n origin-production
kubectl scale deployment origin-frontend --replicas=10 -n origin-production

# Auto-scaling
kubectl patch hpa origin-backend-hpa -p '{"spec":{"minReplicas":5,"maxReplicas":50}}' -n origin-production
```

## Capacity Planning

### Current Resources
- **Frontend**: 2-10 pods (200m-1GHz CPU, 256Mi-1Gi memory)
- **Backend**: 3-20 pods (500m-2GHz CPU, 1-4Gi memory)
- **Database**: 2xCPU, 4Gi memory (with auto-scaling)
- **Redis**: 2xCPU, 4Gi memory (cluster mode)
- **Storage**: 1Ti for videos, 100Gi for cache

### Expected Load
- **Concurrent Users**: 100,000
- **Video Views**: 10M/day
- **Uploads**: 100,000/day
- **API Requests**: 1M/hour peak
- **Data Transfer**: 10TB/day

## Runbooks and Documentation

### Available Runbooks
- [Deployment Instructions](../maintenance/runbooks/deployment-instructions.md)
- [Incident Response](../maintenance/runbooks/incident-response.md)
- [Backup and Recovery](../infrastructure/backup-strategy.md)
- [Security Guidelines](security/README.md)

### On-Call Procedures
1. **Alert Reception**: Slack/PagerDuty notification
2. **Initial Assessment**: Verify severity and impact
3. **Mitigation**: Follow appropriate runbook
4. **Communication**: Update status every 15 minutes
5. **Resolution**: Confirm service recovery
6. **Post-mortem**: Document lessons learned

## Contact Information

### Team Contacts
- **Platform Engineering**: platform@origin.com
- **DevOps Team**: devops@origin.com
- **Database Team**: dba@origin.com
- **Security Team**: security@origin.com

### On-Call Rotation
- **Primary On-Call**: +1-xxx-xxx-xxxx
- **Secondary On-Call**: +1-xxx-xxx-xxxx
- **Escalation Manager**: +1-xxx-xxx-xxxx

## Support and Escalation

### Support Tiers
1. **Self-Service**: Documentation/Runbooks
2. **Team Support**: Slack channels, dedicated teams
3. **Engineering Leadership**: Platform outage coordination
4. **Executive Teams**: Customer impact, business continuity

### Escalation Paths
- **0-30 minutes**: Runbook-based mitigation
- **30-60 minutes**: On-call team escalation
- **60+ minutes**: Leadership and external vendor support

## Compliance and Auditing

### Regulatory Compliance
- **GDPR**: Data protection for EU users
- **CCPA**: California privacy compliance
- **SOC 2**: Security controls audit
- **HIPAA**: Health data compliance (if applicable)

### Audit Logging
- All API calls logged with user context
- Database changes with audit trails
- System access via CloudTrail
- Salary and financial access via audit logs

## Performance Benchmarks

### Expected Performance
- **API Response Times**: P95 < 200ms
- **Video Upload**: 1GB file in < 2 minutes
- **Page Load**: < 3 seconds (P95)
- **Video Stream**: < 5 seconds start time
- **Search**: < 500ms response time

### SLA Targets
- **Availability**: 99.9% (8.76 hours/month downtime)
- **Performance**: 95% of requests meet targets
- **Error Rate**: < 0.1% overall
- **Data Loss**: Zero tolerance for critical data

## Future Enhancements

### Planned Improvements
- **Multi-region CDNs**: Global edge locations
- **AI-powered search**: Enhanced video discovery
- **Live streaming**: Real-time video broadcasting
- **Advanced analytics**: Machine learning insights
- **Mobile apps**: Native iOS/Android applications

### Technology Roadmap
- **GraphQL**: API optimization
- **GraphQL Subscriptions**: Real-time updates
- **GraphQL Federation**: API gateway pattern
- **Service Mesh**: Istio for microservices
- **GraphQL Gateway**: Apollo Federation

---

## Quick Reference

### Essential Commands
```bash
# Health check
curl https://api.origin.example.com/health

# Check pods
kubectl get pods -n origin-production

# Check services
kubectl get services -n origin-production

# Scale deployment
kubectl scale deployment origin-backend --replicas=10 -n origin-production

# View logs
kubectl logs -f deployment/origin-backend -n origin-production

# Promote to latest
kubectl rollout restart deployment/origin-backend -n origin-production
```

### Important URLs
- **Application**: https://origin.example.com
- **API**: https://api.origin.example.com
- **Monitoring**: https://grafana.origin.example.com
- **Status Page**: https://status.origin.example.com

### Emergency Contacts
- **Emergency**: +1-xxx-xxxx-xxx
- **Platform Team**: platform@origin.com
- **Security Incident**: security@origin.com

---

**Note**: This document should be updated with every major change. Always test procedures in staging before applying to production.
