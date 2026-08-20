"""
Serializers for API endpoints
Converts Python objects to/from JSON
"""

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile, CloudCredentials


class UserSerializer(serializers.ModelSerializer):
    """Serialize User model"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']
        read_only_fields = ['id']


class UserProfileSerializer(serializers.ModelSerializer):
    """Serialize UserProfile"""
    
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'monthly_budget', 'currency', 'alert_email',
            'alert_slack_webhook', 'alert_whatsapp', 'alert_threshold_percent',
            'timezone', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class SignupSerializer(serializers.Serializer):
    """Handle user registration"""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    
    def validate(self, data):
        """Validate passwords match"""
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError("Passwords do not match")
        
        # Check if user exists
        if User.objects.filter(username=data['email']).exists():
            raise serializers.ValidationError("Email already registered")
        
        return data
    
    def create(self, validated_data):
        """Create new user"""
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', '')
        )

        return user


class LoginSerializer(serializers.Serializer):
    """Handle user login"""
    
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class CloudCredentialsSerializer(serializers.ModelSerializer):
    """Serialize cloud credentials (without exposing encrypted data)"""
    
    cloud_provider_display = serializers.CharField(
        source='get_cloud_provider_display',
        read_only=True
    )
    is_mock_mode = serializers.SerializerMethodField()
    
    class Meta:
        model = CloudCredentials
        fields = [
            'id', 'cloud_provider', 'cloud_provider_display',
            'is_active', 'is_verified', 'connection_error',
            'connected_at', 'last_tested_at', 'last_used_at',
            'is_mock_mode'
        ]
        read_only_fields = [
            'id', 'connected_at', 'last_tested_at', 'last_used_at',
            'is_verified', 'connection_error'
        ]

    def get_is_mock_mode(self, obj):
        data = obj.additional_data or {}
        return bool(
            data.get('is_mock') or
            data.get('demo_mode') or
            data.get('is_demo')
        )


class CloudCredentialsCreateSerializer(serializers.Serializer):
    """Handle incoming cloud credentials"""
    
    cloud_provider = serializers.ChoiceField(choices=['AWS', 'AZURE', 'GCP'])
    
    # AWS
    aws_access_key = serializers.CharField(required=False, write_only=True)
    aws_secret_key = serializers.CharField(required=False, write_only=True)
    
    # Azure
    azure_subscription_id = serializers.CharField(required=False, write_only=True)
    azure_client_id = serializers.CharField(required=False, write_only=True)
    azure_client_secret = serializers.CharField(required=False, write_only=True)
    azure_tenant_id = serializers.CharField(required=False, write_only=True)
    
    # GCP
    gcp_service_account_json = serializers.JSONField(required=False, write_only=True)
    
    def validate(self, data):
        """Validate required fields"""
        provider = data.get('cloud_provider')
        
        if provider == 'AWS':
            if not data.get('aws_access_key') or not data.get('aws_secret_key'):
                raise serializers.ValidationError(
                    "AWS requires: aws_access_key, aws_secret_key"
                )
        
        elif provider == 'AZURE':
            required = ['azure_subscription_id', 'azure_client_id', 
                       'azure_client_secret', 'azure_tenant_id']
            for field in required:
                if not data.get(field):
                    raise serializers.ValidationError(f"Azure requires: {field}")
        
        elif provider == 'GCP':
            if not data.get('gcp_service_account_json'):
                raise serializers.ValidationError(
                    "GCP requires: gcp_service_account_json"
                )
        
        return data
