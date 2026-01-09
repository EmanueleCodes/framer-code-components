/**
 * Cloudflare Worker for receiving Framer form webhooks and forwarding to Klaviyo
 * 
 * This worker:
 * 1. Receives POST requests from Framer forms
 * 2. Logs the data to verify it's received
 * 3. Creates/updates profile in Klaviyo
 * 4. Tracks form submission event in Klaviyo
 * 5. Returns a proper response
 * 
 * Based on Klaviyo API documentation: https://developers.klaviyo.com/en/reference/api_overview
 */

export interface Env {
  KLAVIYO_API_KEY?: string; // Your Klaviyo private API key
  KLAVIYO_ENABLED?: string; // Set to "true" to enable Klaviyo integration
  KLAVIYO_LIST_ID?: string; // Optional: Klaviyo list ID to add profiles to
}

const KLAVIYO_BASE_URL = 'https://a.klaviyo.com/api';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Only accept POST requests
    if (request.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed. Use POST.' }),
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    try {
      // Parse the request body
      const contentType = request.headers.get('content-type') || '';
      let formData: any;

      if (contentType.includes('application/json')) {
        formData = await request.json();
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        const formDataObj = await request.formData();
        formData = Object.fromEntries(formDataObj.entries());
      } else {
        // Try to parse as JSON anyway (Framer might send JSON)
        try {
          formData = await request.json();
        } catch {
          const formDataObj = await request.formData();
          formData = Object.fromEntries(formDataObj.entries());
        }
      }

      // Log the received data (this will appear in Cloudflare dashboard)
      console.log('📥 Webhook received from Framer:', JSON.stringify(formData, null, 2));
      console.log('📋 Headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));

      // Verify we received data
      if (!formData || Object.keys(formData).length === 0) {
        console.warn('⚠️ Warning: Received empty form data');
        return new Response(
          JSON.stringify({
            success: false,
            message: 'No form data received',
            received: formData,
          }),
          {
            status: 400,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }

      // ✅ Data received successfully!
      
      // Forward to Klaviyo if enabled
      let klaviyoResult = null;
      if (env.KLAVIYO_ENABLED === 'true' && env.KLAVIYO_API_KEY) {
        try {
          klaviyoResult = await sendToKlaviyo(formData, env.KLAVIYO_API_KEY, env.KLAVIYO_LIST_ID);
          console.log('✅ Klaviyo integration result:', JSON.stringify(klaviyoResult, null, 2));
        } catch (klaviyoError) {
          console.error('❌ Klaviyo error:', klaviyoError);
          klaviyoResult = {
            success: false,
            error: klaviyoError instanceof Error ? klaviyoError.message : 'Unknown Klaviyo error',
          };
        }
      } else {
        console.log('ℹ️ Klaviyo integration disabled or API key not set');
      }

      const response = {
        success: true,
        message: 'Webhook received successfully',
        timestamp: new Date().toISOString(),
        data: formData,
        klaviyo: klaviyoResult,
      };

      console.log('✅ Successfully processed webhook:', JSON.stringify(response, null, 2));

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      // Log errors
      console.error('❌ Error processing webhook:', error);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};

/**
 * Send form data to Klaviyo
 * Creates/updates a profile, tracks a form submission event, and optionally adds to a list
 * Based on: https://developers.klaviyo.com/en/reference/api_overview
 */
async function sendToKlaviyo(formData: any, apiKey: string, listId?: string) {
  const results = {
    profile: null as any,
    event: null as any,
    list: null as any,
  };

  // Extract email (required for Klaviyo)
  const email = formData.email || formData.Email || formData.EMAIL;
  if (!email) {
    throw new Error('Email is required for Klaviyo integration');
  }

  // Step 1: Create/Update Profile
  try {
    // Build custom properties object for any non-standard fields
    // Custom properties go in a "properties" object within attributes
    const customProperties: Record<string, any> = {};
    
    // Collect all form fields that aren't standard profile attributes
    // Standard attributes: email, first_name, last_name, phone_number, organization, 
    // address1, address2, city, state, country, zip
    const standardFields = ['email', 'Email', 'name', 'Name', 'firstName', 'FirstName', 
      'first_name', 'lastName', 'LastName', 'last_name', 'phone', 'Phone', 'phoneNumber', 
      'PhoneNumber', 'phone_number', 'company', 'Company', 'address', 'Address', 'address1', 
      'Address1', 'address2', 'Address2', 'city', 'City', 'location', 'Location', 'state', 
      'State', 'region', 'Region', 'country', 'Country', 'zip', 'Zip', 'postalCode', 'PostalCode'];
    
    // Add any non-standard fields as custom properties
    for (const [key, value] of Object.entries(formData)) {
      if (!standardFields.includes(key) && value !== null && value !== undefined && value !== '') {
        customProperties[key] = value;
      }
    }
    
    const profilePayload: any = {
      data: {
        type: 'profile',
        attributes: {
          email: email,
          // Map common form fields
          ...(formData.name && { first_name: formData.name }),
          ...(formData.firstName && { first_name: formData.firstName }),
          ...(formData.first_name && { first_name: formData.first_name }),
          ...(formData.lastName && { last_name: formData.lastName }),
          ...(formData.last_name && { last_name: formData.last_name }),
          ...(formData.phone && { phone_number: formData.phone }),
          ...(formData.Phone && { phone_number: formData.Phone }),
          ...(formData.phoneNumber && { phone_number: formData.phoneNumber }),
          ...(formData.phone_number && { phone_number: formData.phone_number }),
          // Map address fields directly (NOT as a location object!)
          // Klaviyo uses: address1, address2, city, state, country, zip as direct attributes
          ...((formData.address || formData.Address || formData.address1 || formData.Address1) && {
            address1: formData.address || formData.Address || formData.address1 || formData.Address1
          }),
          ...((formData.address2 || formData.Address2) && {
            address2: formData.address2 || formData.Address2
          }),
          ...((formData.city || formData.City || formData.location || formData.Location) && { 
            city: formData.city || formData.City || formData.location || formData.Location 
          }),
          ...((formData.state || formData.State || formData.region || formData.Region) && {
            state: formData.state || formData.State || formData.region || formData.Region
          }),
          ...((formData.country || formData.Country) && { country: formData.country || formData.Country }),
          ...((formData.zip || formData.Zip || formData.postalCode || formData.PostalCode) && {
            zip: formData.zip || formData.Zip || formData.postalCode || formData.PostalCode
          }),
          // Add any other standard properties
          ...(formData.company && { organization: formData.company }),
        },
      },
    };
    
    // Add custom properties if any exist (for fields like "height", etc.)
    if (Object.keys(customProperties).length > 0) {
      profilePayload.data.attributes.properties = customProperties;
    }

    const profileResponse = await fetch(`${KLAVIYO_BASE_URL}/profiles/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15', // Use latest API version
      },
      body: JSON.stringify(profilePayload),
    });

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      throw new Error(`Klaviyo profile API error: ${profileResponse.status} - ${errorText}`);
    }

    results.profile = await profileResponse.json();
    console.log('✅ Profile created/updated in Klaviyo');
  } catch (error) {
    console.error('❌ Error creating Klaviyo profile:', error);
    throw error;
  }

  // Step 2: Track Form Submission Event
  try {
    // Klaviyo Events API requires profile and metric to be wrapped in "data" objects
    // Reference: https://developers.klaviyo.com/en/reference/create_event
    const eventPayload = {
      data: {
        type: 'event',
        attributes: {
          profile: {
            data: {
              type: 'profile',
              attributes: {
                email: email,
              },
            },
          },
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: 'Form Submitted',
              },
            },
          },
          properties: {
            // Include all form data as event properties
            ...formData,
            submitted_at: new Date().toISOString(),
          },
        },
      },
    };

    const eventResponse = await fetch(`${KLAVIYO_BASE_URL}/events/`, {
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'Content-Type': 'application/json',
        'revision': '2024-10-15',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      throw new Error(`Klaviyo event API error: ${eventResponse.status} - ${errorText}`);
    }

    // Events API may return 202 Accepted with no body
    const eventText = await eventResponse.text();
    if (eventText && eventText.trim().length > 0) {
      try {
        results.event = JSON.parse(eventText);
      } catch {
        results.event = { success: true, message: 'Event tracked' };
      }
    } else {
      results.event = { success: true, message: 'Event tracked' };
    }
    console.log('✅ Event tracked in Klaviyo');
  } catch (error) {
    console.error('❌ Error tracking Klaviyo event:', error);
    // Don't throw here - profile was created successfully
    results.event = { error: error instanceof Error ? error.message : 'Unknown error' };
  }

  // Step 3: Add Profile to List (if list ID is provided)
  if (listId) {
    try {
      // First, we need to get the profile ID from the created profile
      // The profile response should contain the profile ID
      let profileId: string | null = null;
      
      if (results.profile?.data?.id) {
        profileId = results.profile.data.id;
      } else {
        // If we don't have the ID, we need to fetch the profile by email
        const profileLookupResponse = await fetch(
          `${KLAVIYO_BASE_URL}/profiles/?filter=equals(email,"${encodeURIComponent(email)}")`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Klaviyo-API-Key ${apiKey}`,
              'Content-Type': 'application/json',
              'revision': '2024-10-15',
            },
          }
        );

        if (profileLookupResponse.ok) {
          const profileData: any = await profileLookupResponse.json();
          if (profileData.data && profileData.data.length > 0) {
            profileId = profileData.data[0].id;
          }
        }
      }

      if (profileId) {
        // Add profile to list using the relationships endpoint
        // Reference: https://developers.klaviyo.com/en/reference/add_profiles
        const listPayload = {
          data: [
            {
              type: 'profile',
              id: profileId,
            },
          ],
        };

        const listResponse = await fetch(
          `${KLAVIYO_BASE_URL}/lists/${listId}/relationships/profiles/`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Klaviyo-API-Key ${apiKey}`,
              'Content-Type': 'application/json',
              'revision': '2024-10-15',
            },
            body: JSON.stringify(listPayload),
          }
        );

        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          throw new Error(`Klaviyo list API error: ${listResponse.status} - ${errorText}`);
        }

        // Some API responses might be empty (204 No Content) or have no body
        // Check if there's content before parsing JSON
        const responseText = await listResponse.text();
        if (responseText && responseText.trim().length > 0) {
          try {
            results.list = JSON.parse(responseText);
          } catch {
            // JSON parsing failed, but request succeeded
            results.list = { success: true, message: 'Profile added to list', raw: responseText };
          }
        } else {
          results.list = { success: true, message: 'Profile added to list' };
        }
        console.log(`✅ Profile added to list ${listId} in Klaviyo`);
      } else {
        console.warn('⚠️ Could not find profile ID to add to list');
        results.list = { error: 'Profile ID not found' };
      }
    } catch (error) {
      console.error('❌ Error adding profile to list:', error);
      // Don't throw here - profile and event were created successfully
      results.list = { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  } else {
    console.log('ℹ️ No list ID provided, skipping list addition');
  }

  return {
    success: true,
    ...results,
  };
}

