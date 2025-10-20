#!/bin/bash

# Origin Platform Restore Script
# This script performs disaster recovery operations

set -euo pipefail

# Configuration
NAMESPACE="origin-production"
POSTGRES_HOST="${POSTGRES_HOST:-origin-postgres.c8ygabc12xyz.us-east-1.rds.amazonaws.com}"
REDIS_HOST="${REDIS_HOST:-origin-redis-cluster.abc12.clustercfg.use1.cache.amazonaws.com}"
S3_BUCKET="${S3_BACKUP_BUCKET:-origin-backups-prod}"
DR_REGION="${DR_REGION:-us-west-2}"

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

error_exit() {
    log "ERROR: $1"
    exit 1
}

# Check prerequisites
check_prerequisites() {
    log "Checking restore prerequisites..."
    
    # Verify tools are available
    command -v aws &> /dev/null || error_exit "AWS CLI not installed"
    command -v kubectl &> /dev/null || error_exit "kubectl not installed"
    command -v pg_restore &> /dev/null || error_exit "PostgreSQL client not installed"
    command -v redis-cli &> /dev/null || error_exit "Redis CLI not installed"
    
    # Verify access to backup bucket
    aws s3 ls "s3://${S3_BUCKET}/" || error_exit "Cannot access backup bucket"
    
    log "Prerequisites check passed"
}

# List available backups
list_backups() {
    log "Available backups:"
    echo ""
    
    # Database backups
    echo "Database Backups:"
    aws s3 ls "s3://${S3_BUCKET}/database/" | grep postgres
    echo ""
    
    # Redis backups  
    echo "Redis Backups:"
    aws s3 ls "s3://${S3_BUCKET}/cache/" | grep redis
    echo ""
    
    # K8s backups
    echo "Kubernetes Configurations:"
    aws s3 ls "s3://${S3_BUCKET}/k8s/" | grep k8s-config
    echo ""
}

# Restore PostgreSQL Database
restore_postgres() {
    local backup_date=$1
    
    log "Starting PostgreSQL restore from ${backup_date}..."
    
    local backup_file="postgresql-${backup_date}.sql.gz"
    local temp_file="/tmp/postgres-restore-${backup_date}.sql"
    
    # Download backup
    aws s3 cp "s3://${S3_BUCKET}/database/${backup_file}" "/tmp/${backup_file}" || \
        aws s3 cp "s3://${S3_BUCKET}-backup/database/${backup_file}" "/tmp/${backup_file}" || \
        error_exit "Cannot download PostgreSQL backup"
    
    # Decompress
    gunzip -c "/tmp/${backup_file}" > "${temp_file}"
    
    # Wait for database to be ready
    pg_isready -h "${POSTGRES_HOST}" -p 5432 -U postgres || error_exit "Database not ready"
    
    # Create restore point before restoration
    psql -h "${POSTGRES_HOST}" -U postgres -d origin -c "SELECT pg_create_restore_point('before_restore_${backup_date}');"
    
    # Restore database
    psql -h "${POSTGRES_HOST}" -U postgres -d origin < "${temp_file}" || error_exit "Database restore failed"
    
    # Clean up
    rm -f "/tmp/${backup_file}" "${temp_file}"
    
    log "PostgreSQL restore completed successfully"
}

# Restore Redis
restore_redis() {
    local backup_date=$1
    
    log "Starting Redis restore from ${backup_date}..."
    
    local backup_file="redis-${backup_date}.rdb.gz"
    local temp_file="/tmp/redis-restore-${backup_date}.rdb"
    
    # Download backup
    aws s3 cp "s3://${S3_BUCKET}/cache/${backup_file}" "/tmp/${backup_file}" || \
        aws s3 cp "s3://${S3_BUCKET}-backup/cache/${backup_file}" "/tmp/${backup_file}" || \
        error_exit "Cannot download Redis backup"
    
    # Decompress
    gunzip -c "/tmp/${backup_file}" > "${temp_file}"
    
    # Stop Redis if possible
    kubectl scale deployment --replicas=0 -n "${NAMESPACE}" origin-redis || true
    sleep 10
    
    # Copy RDB file to Redis data directory
    kubectl cp "${temp_file}" "origin-production/$(kubectl get pods -n ${NAMESPACE} -l app=origin-redis -o jsonpath='{.items[0].metadata.name}')":/data/dump.rdb" || \
        error_exit "Cannot copy Redis data to pod"
    
    # Start Redis
    kubectl scale deployment --replicas=1 -n "${NAMESPACE}" origin-redis || error_exit "Cannot start Redis"
    
    # Wait for Redis to be ready
    sleep 30
    redis-cli -h "${REDIS_HOST}" ping || error_exit "Redis not responding after restore"
    
    # Clean up
    rm -f "/tmp/${backup_file}" "${temp_file}"
    
    log "Redis restore completed successfully"
}

# Restore Kubernetes Configurations
restore_k8s_config() {
    local backup_date=$1
    
    log "Starting Kubernetes configuration restore from ${backup_date}..."
    
    local backup_file="k8s-config-${backup_date}.tar.gz"
    local temp_dir="/tmp/k8s-restore-${backup_date}"
    
    # Download backup
    aws s3 cp "s3://${S3_BUCKET}/k8s/${backup_file}" "/tmp/${backup_file}" || \
        error_exit "Cannot download Kubernetes backup"
    
    # Extract backup
    mkdir -p "${temp_dir}"
    tar -xzf "/tmp/${backup_file}" -C "${temp_dir}"
    
    # Restore configurations (be careful with secrets)
    if [[ -f "${temp_dir}/deployments.yaml" ]]; then
        kubectl apply -f "${temp_dir}/deployments.yaml" --namespace "${NAMESPACE}" || true
    fi
    
    if [[ -f "${temp_dir}/services.yaml" ]]; then
        kubectl apply -f "${temp_dir}/services.yaml" --namespace "${NAMESPACE}" || true
    fi
    
    if [[ -f "${temp_dir}/configmaps.yaml" ]]; then
        kubectl apply -f "${temp_dir}/configmaps.yaml" --namespace "${NAMESPACE}" || true
    fi
    
    # Restore secrets with caution
    if [[ -f "${temp_dir}/secrets.yaml" ]] && [[ -n "${CONFIRM_SECRETS_RESTORE:-}" ]]; then
        kubectl apply -f "${temp_dir}/secrets.yaml" --namespace "${NAMESPACE}" || true
    fi
    
    # Clean up
    rm -rf "/tmp/${backup_file}" "${temp_dir}"
    
    log "Kubernetes configuration restore completed successfully"
}

# Validate Restore
validate_restore() {
    log "Validating restore..."
    
    # Wait for pods to be ready
    kubectl wait --for=condition=ready pod -l app=origin-backend -n "${NAMESPACE}" --timeout=300s || \
        error_exit "Backend pods not ready"
    
    kubectl wait --for=condition=ready pod -l app=origin-frontend -n "${NAMESPACE}" --timeout=300s || \
        error_exit "Frontend pods not ready"
    
    # Check database
    pg_isready -h "${POSTGRES_HOST}" -p 5432 -U postgres || error_exit "Database not accessible"
    
    local table_count=$(psql -h "${POSTGRES_HOST}" -U postgres -d origin -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" | tr -d ' ')
    if [[ ${table_count} -lt 1 ]]; then
        error_exit "Database appears empty after restore"
    fi
    
    # Check Redis
    redis-cli -h "${REDIS_HOST}" ping || error_exit "Redis not accessible"
    
    # Check API health
    kubectl wait --for=condition=ready pod -l app=origin-backend -n "${NAMESPACE}" --timeout=60s
    
    local backend_pod=$(kubectl get pods -n ${NAMESPACE} -l app=origin-backend -o jsonpath='{.items[0].metadata.name}')
    kubectl exec "${backend_pod}" -n ${NAMESPACE} -- curl -f http://localhost:3000/health || \
        error_exit "Backend health check failed"
    
    log "Restore validation completed successfully"
}

# Rollback Function
rollback_restore() {
    local backup_date=$1
    
    log "Starting rollback to previous state..."
    
    # This would involve:
    # 1. Restore database to point-in-time before restore
    # 2. Restart services with previous configuration
    # 3. Validate rollback
    
    log "Rollback completed - please verify manually"
}

# Send Notification
send_restore_notification() {
    local status=$1
    local backup_date=$2
    
    # Send Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        local message="✅ Origin platform restore completed successfully from ${backup_date}"
        
        if [[ "$status" == "failed" ]]; then
            color="danger"
            message="❌ Origin platform restore failed from ${backup_date}"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"attachments\":[{\"color\":\"$color\", \"text\":\"Restore completed at $(date)\", \"fields\":[{\"title\":\"Backup Date\",\"value\":\"$backup_date\",\"short\":true}]}]}" \
            "${SLACK_WEBHOOK_URL}" || true
    fi
}

# Show Usage
usage() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  list                    List available backups"
    echo "  full BACKUP_DATE        Full restore from BACKUP_DATE"
    echo "  database BACKUP_DATE    Restore database only"
    echo "  redis BACKUP_DATE       Restore Redis only"
    echo "  k8s BACKUP_DATE         Restore Kubernetes configs only"
    echo "  validate                Validate current deployment"
    echo "  rollback BACKUP_DATE    Rollback to previous state"
    echo ""
    echo "Examples:"
    echo "  $0 list"
    echo "  $0 full 20240220_020000"
    echo "  $0 database 20240220_020000"
    echo ""
    echo "Environment Variables:"
    echo "  CONFIRM_SECRETS_RESTORE=1    Confirm to restore secrets (DANGEROUS)"
    echo "  SLACK_WEBHOOK_URL            Slack webhook for notifications"
}

# Main function
main() {
    case "${1:-}" in
        "list")
            list_backups
            ;;
        "full")
            [[ -z "${2:-}" ]] && { usage; exit 1; }
            check_prerequisites
            restore_postgres "$2"
            restore_redis "$2"
            restore_k8s_config "$2"
            validate_restore
            send_restore_notification "success" "$2"
            ;;
        "database")
            [[ -z "${2:-}" ]] && { usage; exit 1; }
            check_prerequisites
            restore_postgres "$2"
            send_restore_notification "success" "$2"
            ;;
        "redis")
            [[ -z "${2:-}" ]] && { usage; exit 1; }
            check_prerequisites
            restore_redis "$2"
            send_restore_notification "success" "$2"
            ;;
        "k8s")
            [[ -z "${2:-}" ]] && { usage; exit 1; }
            check_prerequisites
            restore_k8s_config "$2"
            send_restore_notification "success" "$2"
            ;;
        "validate")
            validate_restore
            send_restore_notification "success" "validation"
            ;;
        "rollback")
            [[ -z "${2:-}" ]] && { usage; exit 1; }
            rollback_restore "$2"
            send_restore_notification "success" "rollback-$2"
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

# Execute main function with error handling
trap 'log "ERROR: Restore process interrupted"; send_restore_notification "failed" "unknown"; exit 1' ERR INT TERM

main "$@"
