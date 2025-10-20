# Incident Response Runbook

## Overview
This runbook provides procedures for handling incidents affecting the Origin Platform production environment.

## Incident Severity Levels

### SEV-0 (Critical)
- Complete service outage
- Data loss or corruption
- Security breach in progress
- Revenue impact > $10,000/hour
- User impact > 90%

### SEV-1 (High)
- Major feature degradation
- Performance issues affecting > 50% of users
- Database connectivity problems
- CDN or load balancer failures

### SEV-2 (Medium)
- Partial feature degradation
- Performance issues affecting < 50% of users
- Non-critical service failures
- Elevated error rates

### SEV-3 (Low)
- Minor issues
- Single user problems
- Documentation issues
- cosmetic UI problems

## Immediate Response (First 5 Minutes)

### 1. Acknowledge and Triage
```bash
# Verify incident severity
curl -f https://api.origin.example.com/health || echo "Backend Unhealthy"
curl -f https://origin.example.com/ || echo "Frontend Unhealthy"

# Check service status
kubectl get pods -n origin-production -o wide
kubectl get services -n origin-production
kubectl get ingress -n origin-production

# Check cluster health
kubectl get nodes
kubectl top nodes
```

### 2. Initial Assessment
- Start incident channel in Slack: `#incident-timestamp`
- Post severity level and impact
- Assign incident commander
- Set up communication bridge

### 3. Gather Initial Information
```bash
# Check recent deployments
kubectl rollout history deployment/origin-backend -n origin-production
kubectl rollout history deployment/origin-frontend -n origin-production

# Check recent changes
git log --oneline --since="4 hours ago"

# Check alerts
curl 'http://prometheus-origin-production/api/v1/alerts'
```

## SEV-0 Response Procedures

### Complete Service Outage

#### Step 1: Immediate Actions
```bash
# Check if it's a load balancer issue
aws elbv2 describe-load-balancers --names origin-api-prod-alb
aws elbv2 describe-target-health --target-group-arn $(aws elbv2 describe-target-groups --names origin-backend-prod --query 'TargetGroups[0].TargetGroupArn' --output text)

# Check if it's a DNS issue
nslookup origin.example.com
nslookup api.origin.example.com
dig api.origin.example.com

# Check if it's an instance/network issue
aws ec2 describe-instances --filters Name=tag:Environment,Values=production
```

#### Step 2: Service Recovery
```bash
# Restart services
kubectl rollout restart deployment/origin-backend -n origin-production
kubectl rollout restart deployment/origin-frontend -n origin-production

# Scale up if needed
kubectl scale deployment origin-backend --replicas=20 -n origin-production
kubectl scale deployment origin-frontend --replicas=10 -n origin-production

# Wait for recovery
kubectl rollout status deployment/origin-backend -n origin-production --timeout=600s
kubectl rollout status deployment/origin-frontend -n origin-production --timeout=600s
```

#### Step 3: Database Recovery
```bash
# Check database status
aws rds describe-db-instances --db-instance-identifier origin-rds-prod

# If database is down
aws rds start-db-instance --db-instance-identifier origin-rds-prod

# If failover needed
aws rds reboot-db-instance --db-instance-identifier origin-rds-prod --force-failover
```

#### Step 4: Cache Recovery
```bash
# Check Redis status
aws elasticache describe-replication-groups --replication-group-id origin-redis-prod

# If cache cluster is down
aws elasticache create-replication-group \
    --replication-group-id origin-redis-prod-temp \
    --replication-group-description "Emergency cache cluster" \
    --num-cache-cluster 2 \
    --cache-node-type cache.r6g.2xlarge \
    --engine redis \
    --engine-version 7.0
```

## SEV-1 Response Procedures

### Major Performance Degradation

#### Step 1: Identify Bottleneck
```bash
# Check system metrics
kubectl top pods -n origin-production --sort-by=cpu
kubectl top pods -n origin-production --sort-by=memory

# Check application metrics
curl 'http://prometheus-origin-production/api/v1/query?query=rate(http_requests_total[5m])'
curl 'http://prometheus-origin-production/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))'
```

#### Step 2: Database Performance
```bash
# Check database connections
kubectl exec -it $(kubectl get pods -n origin-production -l app=origin-postgres -o jsonpath='{.items[0].metadata.name}') -- psql -U postgres -c "SELECT * FROM pg_stat_activity;"

# Check slow queries
aws rds describe-db-log-files --db-instance-identifier origin-rds-prod
```

#### Step 3: Cache Performance
```bash
# Check Redis metrics
aws elasticache describe-replication-groups --replication-group-id origin-redis-prod

# Check Redis memory
aws cloudwatch get-metric-statistics \
    --namespace AWS/ElastiCache \
    --metric-name BytesUsedForCache \
    --dimensions Name=ReplicationGroupId,Value=origin-redis-prod \
    --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
    --period 60 \
    --statistics Average
```

#### Step 4: Auto-scale Response
```bash
# Manual scaling for immediate relief
kubectl patch hpa origin-backend-hpa -p '{"spec":{"minReplicas":10,"maxReplicas":100}}' -n origin-production
kubectl patch hpa origin-frontend-hpa -p '{"spec":{"minReplicas":5,"maxReplicas":50}}' -n origin-production

# Scale up immediately
kubectl scale deployment origin-backend --replicas=50 -n origin-production
kubectl scale deployment origin-frontend --replicas=25 -n origin-production
```

## Database-Specific Incidents

### Database Connection Exhaustion
```bash
# Check current connections
kubectl exec -it origin-postgres-0 -n origin-production -- psql -U postgres -d origin -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
kubectl exec -it origin-postgres-0 -n origin-production -- psql -U postgres -d origin -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query = '<IDLE>' AND backend_start < now() - interval '5 minutes';"

# Increase connection pool
kubectl patch configmap origin-backend-config -p '{"data":{"DB_POOL_MAX":"100"}}' -n origin-production
```

### Database Performance Issues
```bash
# Identify slow queries
kubectl exec -it origin-postgres-0 -n origin-production -- psql -U postgres -d origin -c "SELECT query, mean_time, calls, total_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Check locks
kubectl exec -it origin-postgres-0 -n origin-production -- psql -U postgres -d origin -c "SELECT blocked_locks.pid AS blocked_pid, blocked_activity.usename AS blocked_user, blocking_locks.pid AS blocking_pid, blocking_activity.usename AS blocking_user, blocked_activity.query AS blocked_statement, blocking_activity.query AS current_statement_in_blocking_process FROM pg_catalog.pg_locks blocked_locks JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid WHERE NOT blocked_locks.granted;"

# Restart database if necessary (requires downtime)
aws rds reboot-db-instance --db-instance-identifier origin-rds-prod
```

## Cache-Specific Incidents

### Redis Memory Exhaustion
```bash
# Check memory usage
redis-cli -h $REDIS_HOST info memory

# Clear expired keys
redis-cli -h $REDIS_HOST --scan --pattern "*:*" | xargs redis-cli -h $REDIS_HOST ttl

# Emergency cache flush (last resort)
redis-cli -h $REDIS_HOST FLUSHDB
```

### Redis Connection Issues
```bash
# Check cluster status
aws elasticache describe-replication-groups --replication-group-id origin-redis-prod

# Failed node replacement
aws elasticcache-modify-replication-group-shard-configuration \
    --replication-group-id origin-redis-prod \
    --node-group-id 0001 \
    --node-configuration-count 1
```

## Frontend-Specific Incidents

### CSS/JS Loading Issues
```bash
# Check CDN status
curl -I https://cdn.origin.example.com/assets/main.css
curl -I https://cdn.origin.example.com/assets/main.js

# Invalidate CDN cache if needed
aws cloudfront create-invalidation --distribution-id E123456789ABC --paths "/assets/*"

# Deploy frontend fix
kubectl set image deployment/origin-frontend origin-frontend=origin-frontend:emergency-fix -n origin-production
kubectl rollout status deployment/origin-frontend -n origin-production --timeout=600s
```

## Security Incidents

### Suspicious Activity Detection
```bash
# Check auth logs
kubectl logs -l app=origin-backend -n origin-production --tail=1000 | grep -i "auth\|login\|token"

# Check rate limiting
curl 'http://prometheus-origin-production/api/v1/query?query=rate(http_requests_total[5m])'

# Block suspicious IPs (if needed)
kubectl edit configmap nginx-config -n origin-production
# Add deny statements to nginx config
kubectl rollout restart deployment/nginx -n origin-production
```

### Data Breach Response
1. **Immediate Actions:**
   - Rotate all secrets and API keys
   - Enable enhanced logging
   - Notify security team
   - Consider temporary shutdown

2. **Investigation:**
   ```bash
   # audit recent access logs
   kubectl logs -l app=origin-backend -n origin-production --since=24h | grep suspicious-activity
   
   # Check database access
   kubectl exec -it origin-postgres-0 -n origin-production -- psql -U postgres -d origin -c "SELECT * FROM pg_stat_activity WHERE application_name = 'suspicious';"
   ```

3. **Recovery:**
   - Restore from clean backup if needed
   - Rotate all credentials
   - Implement additional security controls

## Communication Protocols

### Internal Communication
- **Incident Channel:** Use dedicated Slack channel
- **Updates:** Every 15 minutes for SEV-0/SEV-1
- **Leadership Updates:** Every 30 minutes
- **Customer Communication:** Follow approved messaging

### External Communication
- **Status Page:** Update status.origin.com
- **Twitter:** @originstatus for critical incidents
- **Email:** Send to org-wide distribution list
- **Customer Support:** Provide talking points and escalation paths

## Incident Analysis

### Data Collection
```bash
# Capture system state
kubectl get all -n origin-production -o yaml > incident-$(date +%Y%m%d-%H%M%S).yaml
kubectl top nodes > incident-nodes-$(date +%Y%m%d-%H%M%S).txt
kubectl top pods -n origin-production > incident-pods-$(date +%Y%m%d-%H%M%S).txt

# Capture metrics
curl 'http://prometheus-origin-production/api/v1/query_range?query=rate(http_requests_total[5m])&start=$(date -u -v-1H +%Y-%m-%dT%H%%3A%M%%3A%S)&end=$(date -u +%Y-%m-%dT%H%%3A%M%%3A%S)&step=60' > incident-metrics-$(date +%Y%m%d-%H%M%S).json

# Capture logs
kubectl logs -l app=origin-backend -n origin-production --since=1h > incident-backend-logs-$(date +%Y%m%d-%H%M%S).txt
kubectl logs -l app=origin-frontend -n origin-production --since=1h > incident-frontend-logs-$(date +%Y%m%d-%H%M%S).txt
```

### Incident Timeline Template
```markdown
## Incident Timeline
- **00:00 UTC** - Initial detection (alert triggered)
- **00:05 UTC** - Incident acknowledged, team mobilized
- **00:10 UTC** - Initial assessment completed, SEV-X assigned
- **00:15 UTC** - Mitigation actions started
- **00:30 UTC** - Service recovered
- **00:45 UTC** - Monitoring confirmed stable
- **01:00 UTC** - Incident resolved
```

## Prevention Measures

### Post-Incident Actions
- [ ] Update monitoring alerts
- [ ] Improve documentation
- [ ] Add automated failover
- [ ] Implement canary deployments
- [ ] Increase testing coverage
- [ ] Add more redundancy

### Automation Improvements
```bash
# Example: Auto-scaling rules based on metrics
kubectl apply -f - <<EOF
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: emergency-autoscale
  namespace: origin-production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: origin-backend
  minReplicas: 2
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 85
EOF
```

## Emergency Contacts

### On-Call Rotation
- **Platform Engineering:** +1-xxx-xxx-xxxx
- **Database Team:** +1-xxx-xxx-xxxx
- **Security Team:** +1-xxx-xxx-xxxx
- **Customer Support:** +1-xxx-xxx-xxxx

### Leadership Escalation
- **CTO:** +1-xxx-xxx-xxxx
- **VP Engineering:** +1-xxx-xxx-xxxx
- **CEO:** +1-xxx-xxx-xxxx

### External Contacts
- **AWS Support:** 1-800-xxx-xxxx
- **CDN Provider:** 1-xxx-xxx-xxxx
- **Security Consultant:** +1-xxx-xxx-xxxx

## Documentation Links

- [Runbook Index](../README.md)
- [Performance Monitoring](../../monitoring/README.md)
- [Backup Procedures](../backup-strategy.md)
- [Security Guidelines](../../security/README.md)
- [API Documentation](../../../docs/api.md)

---

**Remember:** Safety first - don't break things further. Communicate clearly and frequently. Document everything. Learn from every incident.
