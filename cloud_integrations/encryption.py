"""
Encryption utilities for storing sensitive credentials
"""

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


class CredentialEncryptor:
    """Encrypt and decrypt sensitive credentials"""
    
    def __init__(self):
        key = settings.ENCRYPTION_KEY
        if not key:
            raise ImproperlyConfigured("ENCRYPTION_KEY not set in environment.")
        self.cipher = Fernet(key.encode())
    
    def encrypt(self, data: str) -> str:
        """Encrypt a string"""
        try:
            encrypted = self.cipher.encrypt(data.encode())
            return encrypted.decode()
        except Exception as e:
            raise Exception(f"Encryption failed: {str(e)}")
    
    def decrypt(self, encrypted_data: str) -> str:
        """Decrypt a string"""
        try:
            decrypted = self.cipher.decrypt(encrypted_data.encode())
            return decrypted.decode()
        except Exception as e:
            raise Exception(f"Decryption failed: {str(e)}")


# Create singleton instance
encryptor = CredentialEncryptor()
