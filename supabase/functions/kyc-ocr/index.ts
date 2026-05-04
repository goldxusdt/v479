import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders, sanitizeInput, validateExternalURL } from '../_shared/security.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const rawBody = await req.json()
    const { url, base64Image, language = 'eng' } = sanitizeInput(rawBody)
    
    // SSRF Protection (CWE-918)
    if (url && !validateExternalURL(url)) {
      throw new Error('Invalid or unauthorized image URL');
    }

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY')

    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY is not set')
    }

    const ocrApiUrl = 'https://app-a8oqo7dishz5-api-W9z3M6eONl3L.gateway.appmedo.com/parse/image'
    
    // Prepare the request to OCR.space API via Medo gateway
    const formData = new FormData()
    if (url) {
      formData.append('url', url)
    } else if (base64Image) {
      formData.append('base64Image', base64Image)
    } else {
      throw new Error('Either url or base64Image must be provided')
    }
    
    formData.append('language', language)
    formData.append('isOverlayRequired', 'false')
    formData.append('detectOrientation', 'true')
    formData.append('isTable', 'false')
    formData.append('OCREngine', '2') // Engine 2 is usually better for IDs

    const response = await fetch(ocrApiUrl, {
      method: 'POST',
      headers: {
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OCR API error: ${response.status} ${errorText}`)
      
      if (response.status === 429) {
        throw new Error('OCR API rate limit exceeded')
      }
      if (response.status === 402) {
        throw new Error('OCR API insufficient balance')
      }
      throw new Error(`OCR API request failed with status ${response.status}`)
    }

    const result = await response.json()
    
    if (result.IsErroredOnProcessing) {
      throw new Error(result.ErrorMessage || 'Error processing image')
    }

    const parsedText = result.ParsedResults?.[0]?.ParsedText || ''

    return new Response(
      JSON.stringify({ text: parsedText, raw: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('KYC OCR Function error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
