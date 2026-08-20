"""
API Views for CloudLens AI
Handles authentication and user management
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from .serializers import (
    SignupSerializer, LoginSerializer, UserSerializer,
    UserProfileSerializer, CloudCredentialsSerializer,
    CloudCredentialsCreateSerializer
)
from .models import UserProfile, CloudCredentials
from cloud_integrations.encryption import encryptor
import json


class SignupView(APIView):
    """User registration"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Create new user account
        POST /api/auth/signup/
        """
        serializer = SignupSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = serializer.save()
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                'message': 'User created successfully',
                'user': UserSerializer(user).data,
                'token': token.key
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class LoginView(APIView):
    """User login"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        """
        Authenticate user and return token
        POST /api/auth/login/
        """
        serializer = LoginSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Authenticate user
        user = authenticate(
            username=serializer.validated_data['email'],
            password=serializer.validated_data['password']
        )
        
        if not user:
            return Response(
                {'error': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Get or create token
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data,
            'token': token.key
        }, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """User logout"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Logout user"""
        try:
            request.user.auth_token.delete()
            return Response(
                {'message': 'Logout successful'},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ProfileView(APIView):
    """Get/Update user profile"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user profile"""
        try:
            profile = request.user.cloudlens_profile
            serializer = UserProfileSerializer(profile)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    def put(self, request):
        """Update user profile"""
        try:
            profile = request.user.cloudlens_profile
            serializer = UserProfileSerializer(profile, data=request.data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class ChangePasswordView(APIView):
    """Change user password"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')

        if not old_password or not new_password:
            return Response(
                {'error': 'old_password and new_password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not request.user.check_password(old_password):
            return Response(
                {'error': 'Old password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            validate_password(new_password, request.user)
        except ValidationError as exc:
            return Response({'errors': exc.messages}, status=status.HTTP_400_BAD_REQUEST)

        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])

        Token.objects.filter(user=request.user).delete()
        token = Token.objects.create(user=request.user)

        return Response(
            {'message': 'Password changed successfully', 'token': token.key},
            status=status.HTTP_200_OK
        )


class ConnectCloudView(APIView):
    """Connect cloud account"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Connect a cloud account
        POST /api/auth/connect/
        """
        serializer = CloudCredentialsCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            provider = serializer.validated_data['cloud_provider']
            
            # Encrypt credentials
            if provider == 'AWS':
                key_1 = encryptor.encrypt(serializer.validated_data['aws_access_key'])
                key_2 = encryptor.encrypt(serializer.validated_data['aws_secret_key'])
                key_3 = ''
                additional = {}
                if (
                    serializer.validated_data['aws_access_key'] == 'demo-access-key' and
                    serializer.validated_data['aws_secret_key'] == 'demo-secret-key'
                ):
                    additional = {
                        'is_mock': True,
                        'demo_mode': True
                    }
            
            elif provider == 'AZURE':
                key_1 = encryptor.encrypt(serializer.validated_data['azure_client_id'])
                key_2 = encryptor.encrypt(serializer.validated_data['azure_client_secret'])
                key_3 = ''
                additional = {
                    'subscription_id': serializer.validated_data['azure_subscription_id'],
                    'tenant_id': serializer.validated_data['azure_tenant_id']
                }
            
            elif provider == 'GCP':
                json_str = json.dumps(serializer.validated_data['gcp_service_account_json'])
                key_1 = encryptor.encrypt(json_str)
                key_2 = ''
                key_3 = ''
                additional = {}
            
            # Save to database
            credentials, created = CloudCredentials.objects.update_or_create(
                user=request.user,
                cloud_provider=provider,
                defaults={
                    'encrypted_key_1': key_1,
                    'encrypted_key_2': key_2,
                    'encrypted_key_3': key_3,
                    'additional_data': additional,
                    'is_active': True
                }
            )
            
            return Response({
                'message': f'{provider} account connected successfully',
                'credential': CloudCredentialsSerializer(credentials).data
            }, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': f'Connection failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ListConnectedCloudsView(APIView):
    """List all connected cloud accounts"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all connected clouds"""
        credentials = CloudCredentials.objects.filter(user=request.user)
        serializer = CloudCredentialsSerializer(credentials, many=True)
        
        return Response({
            'connected_clouds': serializer.data,
            'count': credentials.count(),
            'is_mock_mode': any(item.get('is_mock_mode') for item in serializer.data)
        }, status=status.HTTP_200_OK)


class DisconnectCloudView(APIView):
    """Disconnect cloud account"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, provider):
        """
        Disconnect a cloud account
        DELETE /api/auth/disconnect/AWS/
        """
        try:
            credentials = CloudCredentials.objects.get(
                user=request.user,
                cloud_provider=provider
            )
            credentials.delete()
            
            return Response({
                'message': f'{provider} account disconnected'
            }, status=status.HTTP_200_OK)
        
        except CloudCredentials.DoesNotExist:
            return Response(
                {'error': 'Cloud account not found'},
                status=status.HTTP_404_NOT_FOUND
            )
