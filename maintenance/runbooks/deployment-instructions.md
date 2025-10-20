# Production Deployment Runbook

## Overview
This runbook provides step-by-step instructions for deploying Origin Platform to production environments.

## Prerequisites

### Required Access
- AWS access for infrastructure management
- Kubernetes cluster access (kubectl configured)
- GitHub access with repository maintain rights
- Access to monitoring tools (Grafana, Prometheus)
- Slack channel access for deployment notifications

### Required Tools
- kubectl v1.28+
- helm v3.0+
- AWS CLI v2.0+
- Docker CLI
- Terraform v1.5+

## Deployment Process

### Step 1: Infrastructure Setup

#### New Environment Setup
```bash
# Navigate to infrastructure directory
cd infrastructure/terraform

# Configure environment variables
export TF_VAR_environment="production"
export TF_VAR_domain_name="origin.example.com"
export TF_VAR_aws_region="us-east-1"

# Initialize Terraform
terraform init

# Plan infrastructure
terraform plan -out=plan.out

# Apply infrastructure (requires approval)
terraform apply plan.out
```

#### Existing Environment Verification
```bash
# Check cluster health
kubectl get nodes -o wide
kubectl get pods --all-namespaces

# Verify infrastructure components
terraform state list
aws rds describe-db-instances --db-instance-identifier origin-rds-prod
aws elasticache describe-replication-groups --replication-group-id origin-redis-prod
```

### Step 2: Environment Configuration

#### Configure Secrets
```bash
# Store secrets in AWS Secrets Manager
aws secretsmanager create-secret \
    --name origin-production/database \
    --secret-string file://secrets/database.json

aws secretsmanager create-secret \
    --name origin-production/jwt \
    --secret-string file://secrets/jwt.json

aws secretsmanager create-secret \
    --name origin-production/google-oauth \
    --secret-string file://secrets/google-oauth.json
```

#### Synchronize with Kubernetes
```bash
# Apply External Secrets configuration
kubectl apply -f ../k8s/external-secrets.yaml

# Verify secret synchronization
kubectl get secrets -n origin-production
```

### Step 3: Application Deployment

#### Build and Push Images
```bash
# Checkout latest main branch
git checkout main
git pull origin main

# Build is handled by GitHub Actions CI/CD
# Manual build (if needed):
docker build -t origin-backend:latest .
docker build -t origin-frontend:latest .

# Push to registry
docker push origin-backend:latest
docker push origin-frontend:latest
```

#### Deploy to Staging (Test Deployment)
```bash
# Deploy to staging first
kubectl apply -f ../k8s/namespaces.yaml
kubectl apply -f ../k8s/secrets.yaml -n origin-staging
kubectl apply -f ../k8s/configmaps.yaml -n origin-staging
kubectl apply -f ../k8s/storage.yaml -n origin-staging
kubectl apply -f ../k8s/backend-deployment.yaml -n origin-staging
kubectl apply -f ../k8s/frontend-deployment.yaml -n origin-staging

# Wait for rollout
kubectl rollout status deployment/origin-backend -n origin-staging --timeout=300s
kubectl rollout status deployment/origin-frontend -n origin-staging --timeout=300s

# Run smoke tests
./scripts/smoke-tests.sh https://staging.origin.example.com
```

#### Deploy to Production
```bash
# Create canary deployment (20% traffic)
kubectl patch deployment origin-backend -p '{"spec":{"replicas":4}}' -n origin-production
sleep 10

# Update image
kubectl set image deployment/origin-backend origin-backend=origin-backend:latest -n origin-production

# Wait for canary rollout
kubectl rollout status deployment/origin-backend -n origin-production --timeout=600s

# Health check
./scripts/health-check.sh production

# Scale up to full capacity
kubectl patch deployment origin-backend -p '{"spec":{"replicas":20}}' -n origin-production

# Deploy frontend
kubectl set image deployment/origin-frontend origin-frontend=origin-frontend:latest -n origin-production
kubectl rollout status deployment/origin-frontend -n origin-production --timeout=600s
```

### Step 4: Verification and Monitoring

#### Health Checks
```bash
# Check all pods
kubectl get pods -n origin-production -o wide

# Check services
kubectl get services -n origin-production

# Check ingress
kubectl get ingress -n origin-production

# Verify health endpoints
curl -f https://api.origin.example.com/health
curl -f https://origin.example.com/
```

#### Monitoring Verification
```bash
# Check Prometheus targets
curl http://prometheus-origin-production/api/v1/targets

# Verify metrics collection
curl 'http://prometheus-origin-production/api/v1/query?query=up'

# Check application metrics
curl 'http://prometheus-origin-production/api/v1/query?query=http_requests_total'
```

#### Load Testing
```bash
# Run load tests
cd tests/load
k6 run --vus 100 --duration 5m load-test.js

# Check system performance
kubectl top pods -n origin-production
kubectl top nodes
```

## Rollback Procedures

### Application Rollback
```bash
# Check recent deployments
kubectl rollout history deployment/origin-backend -n origin-production

# Rollback to previous revision
kubectl rollout undo deployment/origin-backend -n origin-production
kubectl rollout status deployment/origin-backend -n origin-production

# Rollback frontend
kubectl rollout undo deployment/origin-frontend -n origin-production
```

### Infrastructure Rollback
```bash
# In case of infrastructure issues
cd infrastructure/terraform

# Check state
terraform state list

# Rollback to previous state
terraform apply -target=module.eks -target=module.rds -refresh=true
```

### Database Rollback
```bash
# Use backup script for database restore
./scripts/restore-script.sh database YYYYMMDD_HHMMSS

# Point-in-time recovery
aws rds restore-db-instance-from-db-snapshot \
    --db-instance-identifier origin-prod-restored \
    --db-snapshot-identifier origin-snapshot-YYYYMMDD-HHMMSS
```

## Post-Deployment Tasks

### Scale Adjustments
```bash
# Adjust auto-scaling based on expected load
kubectl patch hpa origin-backend-hpa -p '{"spec":{"minReplicas":5,"maxReplicas":50}}' -n origin-production
kubectl patch hpa origin-frontend-hpa -p '{"spec":{"minReplicas":3,"maxReplicas":20}}' -n origin-production
```

### Monitoring Adjustments
```bash
# Update alerting thresholds
kubectl apply -f monitoring/alerts-production.yaml

# Verify monitoring is working
kubectl logs -n origin-monitoring prometheus-origin-production -f
```

### Documentation Updates
```bash
# Update deployment tags
git tag -a v1.0.0-prod -m "Production deployment v1.0.0"
git push origin v1.0.0-prod

# Update deployment documentation
echo "$(date): Production deployment completed successfully" >> docs/deployment-log.md
```

## Troubleshooting

### Common Issues

#### Pod Not Starting
```bash
# Check pod status
kubectl describe pod <pod-name> -n origin-production

# Check logs
kubectl logs <pod-name> -n origin-production

# Check events
kubectl get events -n origin-production --sort-by=.metadata.creationTimestamp
```

#### Database Connection Issues
```bash
# Check database connectivity
kubectl exec -it <backend-pod> -n origin-production -- psql -h $DB_HOST -U postgres -d origin

# Check database metrics
kubectl exec -it <postgres-pod> -n origin-production -- psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

#### High Error Rates
```bash
# Check application logs
kubectl logs -l app=origin-backend -n origin-production --tail=100

# Check system resources
kubectl top pods -n origin-production
kubectl top nodes

# Check external dependencies
curl -f https://api.github.com
curl -f https://www.googleapis.com/oauth2/v1/certs
```

#### Performance Issues
```bash
# Check latency metrics
curl 'http://prometheus-origin-production/api/v1/query?quantile=0.95&query=http_request_duration_seconds_bucket'

# Check database performance
aws rds describe-db-log-files --db-instance-identifier origin-prod

# Check Redis performance
aws elasticache describe-replication-groups --replication-group-id origin-redis-prod
```

## Emergency Procedures

### Immediate Service Restoration
```bash
# Scale up quickly
kubectl scale deployment origin-backend --replicas=20 -n origin-production
kubectl scale deployment origin-frontend --replicas=10 -n origin-production

# Clear any stuck pods
kubectl delete pods --field-selector=status.phase=Failed -n origin-production

# Restart services if needed
kubectl rollout restart deployment/origin-backend -n origin-production
kubectl rollout restart deployment/origin-frontend -n origin-production
```

### Database Emergency
```bash
# Enable read replica if primary fails
aws rds promote-read-replica \
    --db-instance-identifier origin-prod-read-replica \
    --backup-retention-period 30
```

### Scale Zero Downtime Deployment
```bash
# Use rolling update with max surge
kubectl patch deployment origin-backend -p '{"spec":{"strategy":{"rollingUpdate":{"maxSurge":"50%","maxUnavailable":"0"}}}}' -n origin-production

# Deploy with zero downtime
kubectl set image deployment/origin-backend origin-backend=new-version:latest -n origin-production
kubectl rollout status deployment/origin-backend -n origin-production --timeout=600s
```

## Notifications and Communication

### Slack Notifications
When deployments occur, notifications are sent to:
- `#deployments` - All deployment activities
- `#alerts` - Critical issues and rollbacks
- `#oncall` - Emergency requiring immediate attention

### Post-Mortem Required For:
- Rollbacks to previous version
- Downtime > 5 minutes
- Data loss or corruption
- Security incidents

### Communication Checklist:
- [ ] Pre-deployment announcement in Slack
- [ ] Deployment start notification
- [ ] Health check results
- [ ] Post-deployment verification
- [ ] Monitoring confirmation
- [ ] Success notification or rollback alert

## Performance Baselines

### Expected Metrics (Post-Deployment):
- API Response Time: < 200ms (p95)
- Frontend Load Time: < 3 seconds
- Error Rate: < 0.1%
- Database Connections: < 80% of max
- Memory Usage: < 70% of allocated
- CPU Usage: < 60% average

### Alert Thresholds:
- P95 Response Time > 1s: Warning
- P95 Response Time > 2s: Critical
- Error Rate > 1%: Warning
- Error Rate > 5%: Critical
- Available Replicas < 2: Critical
- Database Connections > 90%: Warning

## Checklist Completion

Before marking deployment as complete, verify:

- [ ] All pods are running and healthy
- [ ] All services are responding
- [ ] Health endpoints are accessible
- [ ] Monitoring is active and alerting
- [ ] Load tests pass (if applicable)
- [ ] Security scans pass
- [ ] Documentation is updated
- [ ] Team notification is sent
- [ ] Rollback plan is tested
- [ ] Backup is current

## Contact Information

### On-Call Contacts:
- Platform Engineer: oncall-platform@origin.com
- Database Admin: dba-team@origin.com
- Security Team: security@origin.com
- DevOps Lead: devops-lead@origin.com

### Escalation:
1. First 30 minutes: Try automated rollback
2. First hour: Notify on-call team
3. After 1 hour: Escalate to leadership
4. Critical incidents: All-hands on deck

## Documentation Links

- [Infrastructure Overview](../infrastructure/README.md)
- [Monitoring Guide](../monitoring/README.md)
- [Backup and Recovery](../infrastructure/backup-strategy.md)
- [Security Guidelines](../security/README.md)
- [API Documentation](../../docs/api.md)

---

**Important**: Always test deployments in staging first. Never skip health checks. Monitor the deployment for at least 1 hour after completion.
