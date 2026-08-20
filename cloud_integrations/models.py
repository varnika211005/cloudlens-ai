from django.db import models

# Cloud integrations app handles cloud provider connections
# All models are stored in api.models (CloudCredentials, BillingCache, etc.)
# This app provides: AWSCostClient, AzureCostClient, GCPCostClient, EncryptionUtils
# Views are in cloud_integrations/views.py
