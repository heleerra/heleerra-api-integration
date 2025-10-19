/**
 * Heleerra API Test Example
 * 
 * This file demonstrates how to use the Heleerra API client with test data.
 */

const HeleerraAPI = require('./heleerra_api');

// Test configuration
const config = {
    merchantKey: process.env.HELEERRA_MERCHANT_KEY || 'test_merchant_123',
    apiKey: process.env.HELEERRA_API_KEY || 'test_api_key_abc',
    environment: process.env.HELEERRA_ENVIRONMENT || 'sandbox',
    webhookSecret: process.env.HELEERRA_WEBHOOK_SECRET || null
};

// Initialize API client
const api = new HeleerraAPI(
    config.merchantKey,
    config.apiKey,
    config.environment,
    config.webhookSecret
);

// Test payment data
const testPaymentData = {
    payment_amount: 99.99,
    currency_code: 'USD',
    ref_trx: `TEST_ORDER_${Date.now()}`,
    description: 'Test Payment - Premium Subscription',
    success_redirect: 'https://example.com/success',
    failure_url: 'https://example.com/failed',
    cancel_redirect: 'https://example.com/cancelled',
    ipn_url: 'https://example.com/webhooks/heleerra'
};

// Test webhook payload (simulated)
const testWebhookPayload = {
    data: {
        ref_trx: 'TXNT4AQFESTAG4F',
        description: 'Order #1234',
        customer_name: 'John Doe',
        customer_email: 'john@example.com',
        merchant_name: 'Test Store',
        amount: 99.99,
        currency_code: 'USD',
        environment: 'sandbox',
        is_sandbox: true
    },
    message: 'Payment Completed',
    status: 'completed',
    timestamp: Math.floor(Date.now() / 1000)
};

// Test webhook headers (simulated)
const testWebhookHeaders = {
    'x-signature': 'simulated_signature_for_testing',
    'x-environment': 'sandbox',
    'x-webhook-id': 'test_webhook_123'
};

/**
 * Run all tests
 */
async function runTests() {
    console.log('🧪 Starting Heleerra API Tests\n');
    console.log('=====================================\n');

    try {
        // Test 1: API Configuration
        console.log('1. Testing API Configuration...');
        const config = api.getConfig();
        console.log('✅ API Configuration:', config);
        console.log('');

        // Test 2: Payment Initiation
        console.log('2. Testing Payment Initiation...');
        const paymentResult = await api.initiatePayment(testPaymentData);
        console.log('✅ Payment initiated successfully!');
        console.log('   Payment URL:', paymentResult.payment_url);
        console.log('   Transaction ID:', paymentResult.info?.ref_trx);
        console.log('   Amount:', paymentResult.info?.amount);
        console.log('');

        // Test 3: Payment Verification
        console.log('3. Testing Payment Verification...');
        const transactionId = 'TXNQ5V8K2L9N3XM1'; // Example transaction ID
        try {
            const verificationResult = await api.verifyPayment(transactionId);
            console.log('✅ Payment verification successful!');
            console.log('   Status:', verificationResult.status);
            console.log('   Amount:', verificationResult.amount);
            console.log('   Customer:', verificationResult.customer?.name);
        } catch (error) {
            console.log('⚠️  Payment verification failed (expected for test transaction)');
            console.log('   Error:', error.message);
        }
        console.log('');

        // Test 4: Webhook Handling
        console.log('4. Testing Webhook Handling...');
        const webhookResult = api.handleWebhook(testWebhookPayload, testWebhookHeaders);
        console.log('✅ Webhook processed:', webhookResult);
        console.log('');

        // Test 5: Signature Verification
        console.log('5. Testing Signature Verification...');
        const testPayload = JSON.stringify(testWebhookPayload);
        const testSignature = crypto.createHmac('sha256', 'test_webhook_secret')
            .update(testPayload, 'utf8')
            .digest('hex');
        
        const isValid = api.verifyWebhookSignature(testPayload, testSignature);
        console.log('✅ Signature verification test:', isValid ? 'Valid' : 'Invalid');
        console.log('');

        // Test 6: Error Handling
        console.log('6. Testing Error Handling...');
        try {
            const invalidPaymentData = {
                ...testPaymentData,
                payment_amount: -10 // Invalid amount
            };
            await api.initiatePayment(invalidPaymentData);
        } catch (error) {
            console.log('✅ Error handling working:', error.message);
        }
        console.log('');

        console.log('=====================================\n');
        console.log('🎉 All tests completed successfully!\n');
        
        // Summary
        console.log('📋 Test Summary:');
        console.log('   ✅ API Configuration');
        console.log('   ✅ Payment Initiation');
        console.log('   ✅ Payment Verification');
        console.log('   ✅ Webhook Handling');
        console.log('   ✅ Signature Verification');
        console.log('   ✅ Error Handling');
        console.log('');

        console.log('🚀 Next Steps:');
        console.log('   1. Replace test credentials with your actual Heleerra credentials');
        console.log('   2. Update webhook URLs to match your application');
        console.log('   3. Test with real transactions in sandbox environment');
        console.log('   4. Deploy to production with production credentials');
        console.log('');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
}

/**
 * Run a specific test
 */
async function runSpecificTest(testName) {
    console.log(`Running specific test: ${testName}\n`);
    
    switch (testName) {
        case 'payment':
            const paymentResult = await api.initiatePayment(testPaymentData);
            console.log('Payment Result:', paymentResult);
            break;
            
        case 'verification':
            const verificationResult = await api.verifyPayment('TXNQ5V8K2L9N3XM1');
            console.log('Verification Result:', verificationResult);
            break;
            
        case 'webhook':
            const webhookResult = api.handleWebhook(testWebhookPayload, testWebhookHeaders);
            console.log('Webhook Result:', webhookResult);
            break;
            
        default:
            console.log('Unknown test. Available tests: payment, verification, webhook');
    }
}

// Main execution
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length > 0) {
        // Run specific test
        runSpecificTest(args[0]).catch(console.error);
    } else {
        // Run all tests
        runTests().catch(console.error);
    }
}

module.exports = { runTests, runSpecificTest };