"""
Heleerra Payment Gateway API Client

This module provides a Python client for integrating with the Heleerra payment gateway API.
Supports both sandbox and production environments with comprehensive error handling.
"""

import requests
import hmac
import hashlib
import json
import logging
from typing import Dict, Any, Optional, Union
from datetime import datetime
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HeleerraAPI:
    """
    Heleerra Payment Gateway API Client
    
    Provides methods for payment initiation, verification, and webhook handling.
    """

    def __init__(self, merchant_key: str, api_key: str, environment: str = 'sandbox', 
                 webhook_secret: Optional[str] = None, timeout: int = 30):
        """
        Initialize Heleerra API client

        Args:
            merchant_key (str): Your merchant ID from Heleerra dashboard
            api_key (str): Your API key from Heleerra dashboard
            environment (str): 'sandbox' or 'production'
            webhook_secret (str, optional): Webhook secret for signature verification
            timeout (int): Request timeout in seconds
        """
        self.base_url = 'https://heleerra.com'
        self.merchant_key = merchant_key
        self.api_key = api_key
        self.environment = environment.lower()
        self.webhook_secret = webhook_secret
        self.timeout = timeout
        
        # Set appropriate webhook secret based on environment
        if not webhook_secret:
            self.webhook_secret = f"test_webhook_secret" if self.environment == 'sandbox' else "webhook_secret"
        
        # Validate environment
        if self.environment not in ['sandbox', 'production']:
            raise ValueError("Environment must be either 'sandbox' or 'production'")
        
        logger.info(f"Heleerra API client initialized for {self.environment} environment")

    def initiate_payment(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Initiate a new payment request

        Args:
            payment_data (dict): Payment details including amount, currency, etc.

        Returns:
            dict: API response with payment URL and transaction details

        Raises:
            ValueError: If required fields are missing or invalid
            requests.RequestException: If API request fails
        """
        self._validate_payment_data(payment_data)
        
        headers = {
            'Content-Type': 'application/json',
            'X-Environment': self.environment,
            'X-Merchant-Key': self.merchant_key,
            'X-API-Key': self.api_key
        }
        
        try:
            logger.info(f"Initiating payment for ref_trx: {payment_data.get('ref_trx', 'unknown')}")
            
            response = requests.post(
                f'{self.base_url}/api/v1/initiate-payment',
                json=payment_data,
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            result = response.json()
            logger.info("Payment initiated successfully", extra={
                'ref_trx': payment_data.get('ref_trx'),
                'amount': payment_data.get('payment_amount'),
                'environment': self.environment
            })
            
            return result
            
        except requests.HTTPError as e:
            error_data = response.json() if response.content else {}
            error_message = error_data.get('message', 'Payment initiation failed')
            error_code = error_data.get('error_code', 'UNKNOWN_ERROR')
            
            logger.error("Payment initiation failed", extra={
                'status_code': response.status_code,
                'error_code': error_code,
                'message': error_message,
                'ref_trx': payment_data.get('ref_trx')
            })
            
            raise requests.RequestException(f"Payment initiation failed: {error_message}")
            
        except requests.RequestException as e:
            logger.error("Network error during payment initiation", extra={
                'error': str(e),
                'ref_trx': payment_data.get('ref_trx')
            })
            raise

    def verify_payment(self, transaction_id: str) -> Dict[str, Any]:
        """
        Verify payment status

        Args:
            transaction_id (str): Heleerra transaction ID

        Returns:
            dict: Payment details and status

        Raises:
            requests.RequestException: If API request fails
        """
        headers = {
            'Accept': 'application/json',
            'X-Environment': self.environment,
            'X-Merchant-Key': self.merchant_key,
            'X-API-Key': self.api_key
        }
        
        try:
            logger.info(f"Verifying payment status for transaction: {transaction_id}")
            
            response = requests.get(
                f'{self.base_url}/api/v1/verify-payment/{transaction_id}',
                headers=headers,
                timeout=self.timeout
            )
            
            response.raise_for_status()
            
            result = response.json()
            logger.info("Payment verification successful", extra={
                'transaction_id': transaction_id,
                'status': result.get('status')
            })
            
            return result
            
        except requests.HTTPError as e:
            error_data = response.json() if response.content else {}
            error_message = error_data.get('message', 'Payment verification failed')
            
            logger.error("Payment verification failed", extra={
                'transaction_id': transaction_id,
                'status_code': response.status_code,
                'message': error_message
            })
            
            raise requests.RequestException(f"Payment verification failed: {error_message}")
            
        except requests.RequestException as e:
            logger.error("Network error during payment verification", extra={
                'transaction_id': transaction_id,
                'error': str(e)
            })
            raise

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """
        Verify webhook signature authenticity

        Args:
            payload (str): Raw webhook payload
            signature (str): Signature from X-Signature header

        Returns:
            bool: True if signature is valid
        """
        if not self.webhook_secret:
            logger.warning("Webhook secret not configured")
            return False

        try:
            expected_signature = hmac.new(
                self.webhook_secret.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            ).hexdigest()
            
            # Use compare_digest to prevent timing attacks
            is_valid = hmac.compare_digest(expected_signature, signature)
            
            if not is_valid:
                logger.warning("Webhook signature verification failed")
            
            return is_valid
            
        except Exception as e:
            logger.error("Error verifying webhook signature", extra={'error': str(e)})
            return False

    def handle_webhook(self, payload: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Handle webhook notification

        Args:
            payload (dict): Webhook payload
            headers (dict): Request headers

        Returns:
            dict: Response data
        """
        signature = headers.get('x-signature', '')
        environment = headers.get('x-environment', 'production')
        webhook_id = headers.get('x-webhook-id', '')

        # Verify signature
        if not self.verify_webhook_signature(json.dumps(payload), signature):
            logger.warning("Webhook signature verification failed", extra={
                'webhook_id': webhook_id,
                'environment': environment
            })
            
            return {
                'status': 'error',
                'message': 'Invalid signature'
            }

        # Handle based on environment
        if environment == 'sandbox':
            return self._handle_sandbox_webhook(payload)
        else:
            return self._handle_production_webhook(payload)

    def _handle_sandbox_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle sandbox webhook (testing environment)"""
        transaction_id = payload.get('data', {}).get('ref_trx')
        status = payload.get('status')
        amount = payload.get('data', {}).get('amount')

        logger.info("Processing sandbox webhook", extra={
            'transaction_id': transaction_id,
            'status': status,
            'amount': amount
        })

        # Sandbox-specific logic
        # Don't fulfill orders, don't send emails to real customers, etc.

        return {
            'status': 'sandbox_processed',
            'message': 'Webhook processed in sandbox mode'
        }

    def _handle_production_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Handle production webhook (live environment)"""
        status = payload.get('status', 'unknown')
        transaction_id = payload.get('data', {}).get('ref_trx')
        amount = payload.get('data', {}).get('amount', 0)

        logger.info("Processing production webhook", extra={
            'transaction_id': transaction_id,
            'status': status,
            'amount': amount
        })

        # Process based on payment status
        if status == 'completed':
            self._process_completed_payment(payload)
        elif status == 'failed':
            self._process_failed_payment(payload)
        elif status == 'cancelled':
            self._process_cancelled_payment(payload)
        elif status == 'expired':
            self._process_expired_payment(payload)
        else:
            logger.warning("Unknown payment status in webhook", extra={
                'status': status,
                'transaction_id': transaction_id
            })

        return {
            'status': 'processed',
            'message': 'Webhook processed successfully'
        }

    def _validate_payment_data(self, payment_data: Dict[str, Any]) -> None:
        """Validate payment data before sending to API"""
        required_fields = ['payment_amount', 'currency_code', 'ref_trx']
        
        for field in required_fields:
            if field not in payment_data or not payment_data[field]:
                raise ValueError(f"Required field '{field}' is missing or empty")

        amount = payment_data['payment_amount']
        if not isinstance(amount, (int, float)) or amount < 1.00:
            raise ValueError("Payment amount must be a number and at least 1.00")

        currency = payment_data['currency_code']
        if len(currency) != 3 or not currency.isalpha():
            raise ValueError("Currency code must be a 3-letter code (e.g., USD)")

        # Validate URLs if provided
        url_fields = ['success_redirect', 'failure_url', 'cancel_redirect', 'ipn_url']
        for field in url_fields:
            if field in payment_data and payment_data[field]:
                if not payment_data[field].startswith('http'):
                    raise ValueError(f"{field} must be a valid URL")

    def _process_completed_payment(self, payload: Dict[str, Any]) -> None:
        """Process completed payment"""
        transaction_id = payload.get('data', {}).get('ref_trx')
        amount = payload.get('data', {}).get('amount')
        customer_email = payload.get('data', {}).get('customer_email')

        # Update order status to completed
        # Send confirmation email to customer
        # Update inventory
        # Trigger any additional business logic

        logger.info("Payment completed successfully", extra={
            'transaction_id': transaction_id,
            'amount': amount,
            'customer_email': customer_email
        })

    def _process_failed_payment(self, payload: Dict[str, Any]) -> None:
        """Process failed payment"""
        transaction_id = payload.get('data', {}).get('ref_trx')
        
        # Update order status to failed
        # Send failure notification to customer
        # Log the failure for analysis

        logger.warning("Payment failed", extra={
            'transaction_id': transaction_id,
            'reason': payload.get('message', 'Unknown reason')
        })

    def _process_cancelled_payment(self, payload: Dict[str, Any]) -> None:
        """Process cancelled payment"""
        transaction_id = payload.get('data', {}).get('ref_trx')
        
        # Update order status to cancelled
        # Release any reserved inventory
        # Send cancellation notification

        logger.info("Payment cancelled by user", extra={
            'transaction_id': transaction_id
        })

    def _process_expired_payment(self, payload: Dict[str, Any]) -> None:
        """Process expired payment"""
        transaction_id = payload.get('data', {}).get('ref_trx')
        
        # Update order status to expired
        # Release any reserved inventory
        # Optionally send reminder to customer

        logger.info("Payment session expired", extra={
            'transaction_id': transaction_id
        })

    def get_config(self) -> Dict[str, Any]:
        """Get API configuration (for debugging)"""
        return {
            'environment': self.environment,
            'base_url': self.base_url,
            'merchant_key': self.merchant_key[:8] + '...',  # Mask for security
            'webhook_configured': bool(self.webhook_secret)
        }


class HeleerraAPIException(Exception):
    """Custom exception for Heleerra API errors"""
    pass


# Example usage
if __name__ == "__main__":
    # Initialize API client
    api = HeleerraAPI(
        merchant_key='test_merchant_123',
        api_key='test_api_key_abc',
        environment='sandbox'
    )

    # Example payment data
    payment_data = {
        'payment_amount': 250.00,
        'currency_code': 'USD',
        'ref_trx': f'ORDER_{int(time.time())}',
        'description': 'Premium Subscription',
        'success_redirect': 'https://yoursite.com/success',
        'failure_url': 'https://yoursite.com/failed',
        'cancel_redirect': 'https://yoursite.com/cancelled',
        'ipn_url': 'https://yoursite.com/webhooks/heleerra'
    }

    try:
        # Initiate payment
        result = api.initiate_payment(payment_data)
        print(f"Payment URL: {result['payment_url']}")
        
        # Verify payment (using example transaction ID)
        # verification_result = api.verify_payment('TXNQ5V8K2L9N3XM1')
        # print(f"Payment status: {verification_result['status']}")
        
    except Exception as e:
        print(f"Error: {e}")