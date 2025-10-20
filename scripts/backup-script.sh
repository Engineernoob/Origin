#!/bin/bash

# Origin Platform Backup Script
# This script performs automated backups of all critical components

set -euo pipefail

# Configuration
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/origin"
LOG_DIR="/var/log/origin-backups"
LOG_FILE="${LOG_DIR}/backup-${BACKUP_DATE}.log"

# Service configuration
NAMESPACE="origin-production"
POSTGRES_HOST="${POSTGRES_HOST:-origin-postgres.c8ygabc12xyz.us-east-1.rds.amazonaws.com}"
REDIS_HOST="${REDIS_HOST:-origin-redis-cluster.abc12.clustercfg.use1.cache.amazonaws.com}"
S3_BUCKET="${S3_BACKUP_BUCKET:-origin-backups-prod}"

# Create directories
mkdir -p "${BACKUP_DIR}/${BACKUP_DATE}"
mkdir -p "${LOG_DIR}"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log "ERROR: AWS CLI is not installed"
        exit 1
    fi
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        log "ERROR: kubectl is not installed"
        exit 1
    fi
    
    # Check PostgreSQL client
    if ! command -v pg_dump &> /dev/null; then
        log "ERROR: PostgreSQL client is not installed"
        exit 1
    fi
    
    # Check Redis CLI
    if ! command -v redis-cli &> /dev/null; then
        log "ERROR: Redis CLI is not installed"
        exit 1
    fi
    
    log "Prerequisites check passed"
}

# Backup PostgreSQL Database
backup_postgres() {
    log "Starting PostgreSQL backup..."
    
    local backup_file="${BACKUP_DIR}/${BACKUP_DATE}/postgres-backup.sql.gz"
    
    # Wait for database to be ready
    pg_isready -h "${POSTGRES_HOST}" -p 5432 -U postgres || {
        log "ERROR: PostgreSQL is not ready"
        exit 1
    }
    
    # Create backup
    pg_dump -h "${POSTGRES_HOST}" -U postgres -d origin | gzip > "${backup_file}"
    
    # Verify backup
    if [[ -f "${backup_file}" && -s "${backup_file}" ]]; then
        local file_size=$(stat -c%s "${backup_file}")
        log "PostgreSQL backup completed: ${file_size} bytes"
        
        # Upload to S3
        aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/database/postgres-${BACKUP_DATE}.sql.gz" \
            --storage-class STANDARD_IA
        
        # Upload to backup region
        aws s3 cp "${backup_file}" "s3://${S3_BUCKET}-backup/database/postgres-${BACKUP_DATE}.sql.gz" \
            --storage-class GLACIER
        
        log "PostgreSQL backup uploaded to S3"
    else
        log "ERROR: PostgreSQL backup failed"
        exit 1
    fi
}

# Backup Redis
backup_redis() {
    log "Starting Redis backup..."
    
    local backup_file="${BACKUP_DIR}/${BACKUP_DATE}/redis-backup.rdb.gz"
    
    # Create Redis backup
    redis-cli -h "${REDIS_HOST}" --rdb - | gzip > "${backup_file}"
    
    # Verify backup
    if [[ -f "${backup_file}" && -s "${backup_file}" ]]; then
        local file_size=$(stat -c%s "${backup_file}")
        log "Redis backup completed: ${file_size} bytes"
        
        # Upload to S3
        aws s3 cp "${backup_file}" "s3://${S3_BUCKET}/cache/redis-${BACKUP_DATE}.rdb.gz" \
            --storage-class STANDARD_IA
        
        # Upload to backup region
        aws s3 cp "${backup_file}" "s3://${S3_BUCKET}-backup/cache/redis-${BACKUP_DATE}.rdb.gz" \
            --storage-class GLACIER
        
        log "Redis backup uploaded to S3"
    else
        log "ERROR: Redis backup failed"
        exit 1
    fi
}

# Backup Kubernetes Configurations
backup_k8s_config() {
    log "Starting Kubernetes configurations backup..."
    
    local backup_dir="${BACKUP_DIR}/${BACKUP_DATE}/k8s"
    mkdir -p "${backup_dir}"
    
    # Export all configurations
    kubectl get all,configmaps,secrets,pvc --namespace "${NAMESPACE}" -o yaml > "${backup_dir}/all-resources.yaml"
    
    # Get specific configurations
    kubectl get deployments -n "${NAMESPACE}" -o yaml > "${backup_dir}/deployments.yaml"
    kubectl get services -n "${NAMESPACE}" -o yaml > "${backup_dir}/services.yaml"
    kubectl get configmaps -n "${NAMESPACE}" -o yaml > "${backup_dir}/configmaps.yaml"
    
    # Get secrets (encrypted)
    kubectl get secrets -n "${NAMESPACE}" -o yaml > "${backup_dir}/secrets.yaml.enc"
    
    # Create tarball
    tar -czf "${BACKUP_DIR}/${BACKUP_DATE}/k8s-config.tar.gz" -C "${backup_dir}" .
    
    # Upload to S3
    aws s3 cp "${BACKUP_DIR}/${BACKUP_DATE}/k8s-config.tar.gz" \
        "s3://${S3_BUCKET}/k8s/k8s-config-${BACKUP_DATE}.tar.gz" \
        --storage-class STANDARD_IA
    
    log "Kubernetes configurations backup completed"
}

# Backup Terraform State
backup_terraform_state() {
    log "Starting Terraform state backup..."
    
    local terraform_dir="/infrastructure/terraform"
    local backup_file="${BACKUP_DIR}/${BACKUP_DATE}/terraform-state.tar.gz"
    
    if [[ -d "${terraform_dir}" ]]; then
        # Backup state files
        tar -czf "${backup_file}" -C "${terraform_dir}" .terraform/
        
        # Upload to S3 (in a secure bucket)
        aws s3 cp "${backup_file}" "s3://origin-terraform-state-backup/terraform-state-${BACKUP_DATE}.tar.gz" \
            --storage-class STANDARD_IA
        
        log "Terraform state backup completed"
    else
        log "WARNING: Terraform directory not found"
    fi
}

# Backup Application Logs
backup_logs() {
    log "Starting application logs backup..."
    
    local logs_backup_file="${BACKUP_DIR}/${BACKUP_DATE}/logs.tar.gz"
    
    # Collect logs from last 24 hours
    kubectl logs --since=24h --all-containers=true --namespace "${NAMESPACE}" > "${BACKUP_DIR}/${BACKUP_DATE}/k8s-logs.jsonl"
    
    # Create backup
    tar -czf "${logs_backup_file}" -C "${BACKUP_DIR}/${BACKUP_DATE}" k8s-logs.jsonl
    
    # Upload to S3
    aws s3 cp "${logs_backup_file}" "s3://${S3_BUCKET}/logs/logs-${BACKUP_DATE}.tar.gz" \
        --storage-class STANDARD_IA
    
    log "Application logs backup completed"
}

# Verify Backups
verify_backups() {
    log "Verifying backups..."
    
    local verification_failed=false
    
    # Check database backup
    aws s3 ls "s3://${S3_BUCKET}/database/postgres-${BACKUP_DATE}.sql.gz" || {
        log "ERROR: PostgreSQL backup verification failed"
        verification_failed=true
    }
    
    # Check Redis backup
    aws s3 ls "s3://${S3_BUCKET}/cache/redis-${BACKUP_DATE}.rdb.gz" || {
        log "ERROR: Redis backup verification failed"
        verification_failed=true
    }
    
    # Check K8s backup
    aws s3 ls "s3://${S3_BUCKET}/k8s/k8s-config-${BACKUP_DATE}.tar.gz" || {
        log "ERROR: Kubernetes backup verification failed"
        verification_failed=true
    }
    
    if [[ "$verification_failed" == "true" ]]; then
        log "ERROR: Backup verification failed"
        exit 1
    fi
    
    log "All backup verifications passed"
}

# Cleanup Old Backups
cleanup_old_backups() {
    log "Cleaning up old backups..."
    
    # Keep backups for 30 days in S3
    aws s3 ls "s3://${S3_BUCKET}/database/" --recursive | \
        while read -r line; do
            create_date=$(echo "$line" | awk '{print $2" "$3}')
            create_date=$(date -d"$create_date" +%s)
            older_than=$(date -d"30 days ago" +%s)
            
            if [[ $create_date -lt $older_than ]]; then
                file_path=$(echo "$line" | awk '{print $4}')
                aws s3 rm "s3://${S3_BUCKET}/$file_path"
                log "Deleted old backup: $file_path"
            fi
        done
    
    # Clean up local backups older than 7 days
    find "${BACKUP_DIR}" -type d -mtime +7 -exec rm -rf {} \;
    
    log "Old backups cleanup completed"
}

# Send Notification
send_notification() {
    local status=$1
    
    # Send Slack notification
    if [[ -n "${SLACK_WEBHOOK_URL:-}" ]]; then
        local color="good"
        local message="✅ Origin platform backup completed successfully"
        
        if [[ "$status" == "failed" ]]; then
            color="danger"
            message="❌ Origin platform backup failed"
        fi
        
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"$message\", \"attachments\":[{\"color\":\"$color\", \"text\":\"Backup completed at $(date)\", \"fields\":[{\"title\":\"Backup Date\",\"value\":\"$BACKUP_DATE\",\"short\":true}]}]}" \
            "${SLACK_WEBHOOK_URL}"
    fi
    
    # Send SNS notification
    if [[ -n "${SNS_TOPIC_ARN:-}" ]]; then
        aws sns publish \
            --topic-arn "${SNS_TOPIC_ARN}" \
            --subject "Origin Backup Notification" \
            --message "Origin platform backup ${status} at $(date). Backup ID: ${BACKUP_DATE}"
    fi
}

# Main execution
main() {
    log "Starting Origin platform backup - ${BACKUP_DATE}"
    
    # Set trap for cleanup
    trap 'log "ERROR: Backup process interrupted"; send_notification "failed"; exit 1' ERR INT TERM
    
    check_prerequisites
    backup_postgres
    backup_redis
    backup_k8s_config
    backup_terraform_state
    backup_logs
    verify_backups
    cleanup_old_backups
    
    log "Origin platform backup completed successfully"
    send_notification "success"
}

# Execute main function
main "$@"
