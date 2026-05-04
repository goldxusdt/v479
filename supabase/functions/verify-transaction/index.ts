import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, sanitizeInput } from '../_shared/security.ts';

interface VerifyRequest {
  transactionHash: string;
  network: 'BEP20' | 'TRC20';
  expectedAddress: string;
  expectedAmount: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const rawBody: VerifyRequest = await req.json();
    const { transactionHash, network, expectedAddress, expectedAmount } = sanitizeInput(rawBody);

    // --- SECURITY: Rate Limiting ---
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const { data: isAllowed, error: limitError } = await supabaseClient.rpc('check_rate_limit', {
      p_identifier: `${clientIp}:${transactionHash}`, // Rate limit per IP + Hash
      p_endpoint: 'verify-transaction',
      p_limit: 10,
      p_window_seconds: 60
    });

    if (limitError) {
      console.error('Rate limit error:', limitError);
    }

    if (isAllowed === false) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again in 1 minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // --- END SECURITY ---

    if (!transactionHash || !network || !expectedAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let verified = false;
    let actualAmount = 0;
    let errorMessage = '';

    if (network === 'BEP20') {
      // Verify BEP-20 transaction using BSCScan API
      const { data: settings } = await supabaseClient
        .from('platform_settings')
        .select('setting_value')
        .eq('setting_key', 'bscscan_api_key')
        .single();

      const apiKey = settings?.setting_value;
      
      if (!apiKey) {
        return new Response(
          JSON.stringify({ verified: false, error: 'BSCScan API key not configured' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      try {
        // Get transaction details from BSCScan
        const bscUrl = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${transactionHash}&apikey=${apiKey}`;
        const bscResponse = await fetch(bscUrl);
        const bscData = await bscResponse.json();

        if (bscData.result && bscData.result.to) {
          const toAddress = bscData.result.to.toLowerCase();
          const expectedAddr = expectedAddress.toLowerCase();
          
          // Check if transaction is to the expected address
          if (toAddress === expectedAddr) {
            // Get transaction receipt to check if it was successful
            const receiptUrl = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=${transactionHash}&apikey=${apiKey}`;
            const receiptResponse = await fetch(receiptUrl);
            const receiptData = await receiptResponse.json();

            if (receiptData.result && receiptData.result.status === '0x1') {
              // Transaction successful
              // For USDT (BEP-20), we need to decode the input data to get the amount
              // The value is in the input data, not in the value field
              const inputData = bscData.result.input;
              
              // USDT transfer has 18 decimals on BSC
              // The amount is in the last 64 characters of input (after method signature and address)
              if (inputData && inputData.length >= 138) {
                const amountHex = inputData.slice(-64);
                const amountWei = BigInt('0x' + amountHex);
                actualAmount = Number(amountWei) / 1e18;
                
                // Allow 1% tolerance for amount verification
                const tolerance = expectedAmount * 0.01;
                if (Math.abs(actualAmount - expectedAmount) <= tolerance) {
                  verified = true;
                }
              }
            } else {
              errorMessage = 'Transaction failed or pending';
            }
          } else {
            errorMessage = 'Transaction sent to wrong address';
          }
        } else {
          errorMessage = 'Transaction not found';
        }
      } catch (error) {
        errorMessage = `BSCScan API error: ${error.message}`;
      }

    } else if (network === 'TRC20') {
      // Verify TRC-20 transaction using TronGrid API
      try {
        const tronUrl = `https://api.trongrid.io/v1/transactions/${transactionHash}`;
        const tronResponse = await fetch(tronUrl);
        const tronData = await tronResponse.json();

        if (tronData.ret && tronData.ret[0]?.contractRet === 'SUCCESS') {
          // Check if transaction is to the expected address
          const contract = tronData.raw_data?.contract?.[0];
          
          if (contract?.type === 'TriggerSmartContract') {
            const parameter = contract.parameter?.value;
            
            // For USDT TRC-20, decode the data field
            if (parameter?.data) {
              // The first 8 characters are the method signature (transfer)
              // Next 64 characters are the recipient address
              // Last 64 characters are the amount
              const data = parameter.data;
              if (data.length >= 136) {
                const recipientHex = data.slice(8, 72);
                const amountHex = data.slice(72);
                
                // Convert TRC-20 address (remove leading zeros and add T prefix)
                // For simplicity, we'll check the contract address instead
                const contractAddress = parameter.contract_address;
                
                // USDT TRC-20 contract: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
                // Amount has 6 decimals for USDT on TRON
                const amountInt = BigInt('0x' + amountHex);
                actualAmount = Number(amountInt) / 1e6;
                
                // Allow 1% tolerance
                const tolerance = expectedAmount * 0.01;
                if (Math.abs(actualAmount - expectedAmount) <= tolerance) {
                  verified = true;
                }
              }
            }
          }
        } else {
          errorMessage = 'Transaction failed or not found';
        }
      } catch (error) {
        errorMessage = `TronGrid API error: ${error.message}`;
      }
    }

    return new Response(
      JSON.stringify({
        verified,
        actualAmount,
        expectedAmount,
        error: errorMessage || undefined
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
