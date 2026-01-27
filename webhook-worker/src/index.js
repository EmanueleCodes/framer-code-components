var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.ts
var KLAVIYO_BASE_URL = "https://a.klaviyo.com/api";
var src_default = {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      });
    }
    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed. Use POST." }),
        {
          status: 405,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
    try {
      const contentType = request.headers.get("content-type") || "";
      let formData;
      if (contentType.includes("application/json")) {
        formData = await request.json();
      } else if (contentType.includes("application/x-www-form-urlencoded")) {
        const formDataObj = await request.formData();
        formData = Object.fromEntries(formDataObj.entries());
      } else {
        try {
          formData = await request.json();
        } catch {
          const formDataObj = await request.formData();
          formData = Object.fromEntries(formDataObj.entries());
        }
      }
      console.log("\u{1F4E5} Webhook received from Framer:", JSON.stringify(formData, null, 2));
      console.log("\u{1F4CB} Headers:", JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
      if (!formData || Object.keys(formData).length === 0) {
        console.warn("\u26A0\uFE0F Warning: Received empty form data");
        return new Response(
          JSON.stringify({
            success: false,
            message: "No form data received",
            received: formData
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          }
        );
      }
      let klaviyoResult = null;
      if (env.KLAVIYO_ENABLED === "true" && env.KLAVIYO_API_KEY) {
        try {
          klaviyoResult = await sendToKlaviyo(formData, env.KLAVIYO_API_KEY, env.KLAVIYO_LIST_ID);
          console.log("\u2705 Klaviyo integration result:", JSON.stringify(klaviyoResult, null, 2));
        } catch (klaviyoError) {
          console.error("\u274C Klaviyo error:", klaviyoError);
          klaviyoResult = {
            success: false,
            error: klaviyoError instanceof Error ? klaviyoError.message : "Unknown Klaviyo error"
          };
        }
      } else {
        console.log("\u2139\uFE0F Klaviyo integration disabled or API key not set");
      }
      const response = {
        success: true,
        message: "Webhook received successfully",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        data: formData,
        klaviyo: klaviyoResult
      };
      console.log("\u2705 Successfully processed webhook:", JSON.stringify(response, null, 2));
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } catch (error) {
      console.error("\u274C Error processing webhook:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }
  }
};
async function sendToKlaviyo(formData, apiKey, listId) {
  const results = {
    profile: null,
    subscription: null,
    event: null,
    list: null
  };
  const email = formData.email || formData.Email || formData.EMAIL;
  if (!email) {
    throw new Error("Email is required for Klaviyo integration");
  }
  try {
    const customProperties = {};
    const standardFields = [
      "email",
      "Email",
      "name",
      "Name",
      "firstName",
      "FirstName",
      "first_name",
      "lastName",
      "LastName",
      "last_name",
      "phone",
      "Phone",
      "phoneNumber",
      "PhoneNumber",
      "phone_number",
      "company",
      "Company",
      "address",
      "Address",
      "address1",
      "Address1",
      "address2",
      "Address2",
      "city",
      "City",
      "location",
      "Location",
      "state",
      "State",
      "region",
      "Region",
      "country",
      "Country",
      "zip",
      "Zip",
      "postalCode",
      "PostalCode"
    ];
    for (const [key, value] of Object.entries(formData)) {
      if (!standardFields.includes(key) && value !== null && value !== void 0 && value !== "") {
        customProperties[key] = value;
      }
    }
    const locationFields = {};
    if (formData.address || formData.Address || formData.address1 || formData.Address1) {
      locationFields.address1 = formData.address || formData.Address || formData.address1 || formData.Address1;
    }
    if (formData.address2 || formData.Address2) {
      locationFields.address2 = formData.address2 || formData.Address2;
    }
    if (formData.city || formData.City || formData.location || formData.Location) {
      locationFields.city = formData.city || formData.City || formData.location || formData.Location;
    }
    if (formData.state || formData.State || formData.region || formData.Region) {
      locationFields.region = formData.state || formData.State || formData.region || formData.Region;
    }
    if (formData.country || formData.Country) {
      locationFields.country = formData.country || formData.Country;
    }
    if (formData.zip || formData.Zip || formData.postalCode || formData.PostalCode) {
      locationFields.zip = formData.zip || formData.Zip || formData.postalCode || formData.PostalCode;
    }
    const profilePayload = {
      data: {
        type: "profile",
        attributes: {
          email,
          // Map common form fields
          ...formData.name && { first_name: formData.name },
          ...formData.Name && { first_name: formData.Name },
          ...formData.firstName && { first_name: formData.firstName },
          ...formData.first_name && { first_name: formData.first_name },
          ...formData.lastName && { last_name: formData.lastName },
          ...formData.last_name && { last_name: formData.last_name },
          ...formData.phone && { phone_number: formData.phone },
          ...formData.Phone && { phone_number: formData.Phone },
          ...formData.phoneNumber && { phone_number: formData.phoneNumber },
          ...formData.phone_number && { phone_number: formData.phone_number },
          // Add any other standard properties
          ...formData.company && { organization: formData.company },
          // Location object (per Klaviyo API 2024-10-15)
          ...Object.keys(locationFields).length > 0 && { location: locationFields }
        }
      }
    };
    if (Object.keys(customProperties).length > 0) {
      profilePayload.data.attributes.properties = customProperties;
    }
    const profileResponse = await fetch(`${KLAVIYO_BASE_URL}/profiles/`, {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${apiKey}`,
        "Content-Type": "application/json",
        "revision": "2026-01-15"
        // Use latest API version
      },
      body: JSON.stringify(profilePayload)
    });
    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      throw new Error(`Klaviyo profile API error: ${profileResponse.status} - ${errorText}`);
    }
    results.profile = await profileResponse.json();
    console.log("\u2705 Profile created/updated in Klaviyo");
  } catch (error) {
    console.error("\u274C Error creating Klaviyo profile:", error);
    throw error;
  }
  try {
    const subscribePayload = {
      data: {
        type: "profile-subscription-bulk-create-job",
        attributes: {
          profiles: {
            data: [
              {
                type: "profile",
                attributes: {
                  email,
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: "SUBSCRIBED"
                      }
                    }
                  }
                }
              }
            ]
          }
        }
      }
    };
    if (listId) {
      subscribePayload.data.relationships = {
        list: {
          data: {
            type: "list",
            id: listId
          }
        }
      };
    }
    const subscribeResponse = await fetch(`${KLAVIYO_BASE_URL}/profile-subscription-bulk-create-jobs/`, {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${apiKey}`,
        "Content-Type": "application/json",
        "revision": "2026-01-15"
      },
      body: JSON.stringify(subscribePayload)
    });
    if (!subscribeResponse.ok) {
      const errorText = await subscribeResponse.text();
      console.warn("\u26A0\uFE0F Warning: Could not subscribe profile:", errorText);
      results.subscription = { error: `Subscription failed: ${subscribeResponse.status} - ${errorText}` };
    } else {
      const subscribeText = await subscribeResponse.text();
      if (subscribeText && subscribeText.trim().length > 0) {
        try {
          results.subscription = JSON.parse(subscribeText);
        } catch {
          results.subscription = { success: true, message: "Profile subscribed with email consent" };
        }
      } else {
        results.subscription = { success: true, message: "Profile subscribed with email consent" };
      }
      console.log("\u2705 Profile subscribed with email consent (SUBSCRIBED)");
    }
  } catch (error) {
    console.error("\u274C Error subscribing profile:", error);
    results.subscription = { error: error instanceof Error ? error.message : "Unknown subscription error" };
  }
  try {
    const eventPayload = {
      data: {
        type: "event",
        attributes: {
          profile: {
            data: {
              type: "profile",
              attributes: {
                email
              }
            }
          },
          metric: {
            data: {
              type: "metric",
              attributes: {
                name: "Form Submitted"
              }
            }
          },
          properties: {
            // Include all form data as event properties
            ...formData,
            submitted_at: (/* @__PURE__ */ new Date()).toISOString()
          }
        }
      }
    };
    const eventResponse = await fetch(`${KLAVIYO_BASE_URL}/events/`, {
      method: "POST",
      headers: {
        "Authorization": `Klaviyo-API-Key ${apiKey}`,
        "Content-Type": "application/json",
        "revision": "2026-01-15"
      },
      body: JSON.stringify(eventPayload)
    });
    if (!eventResponse.ok) {
      const errorText = await eventResponse.text();
      throw new Error(`Klaviyo event API error: ${eventResponse.status} - ${errorText}`);
    }
    const eventText = await eventResponse.text();
    if (eventText && eventText.trim().length > 0) {
      try {
        results.event = JSON.parse(eventText);
      } catch {
        results.event = { success: true, message: "Event tracked" };
      }
    } else {
      results.event = { success: true, message: "Event tracked" };
    }
    console.log("\u2705 Event tracked in Klaviyo");
  } catch (error) {
    console.error("\u274C Error tracking Klaviyo event:", error);
    results.event = { error: error instanceof Error ? error.message : "Unknown error" };
  }
  if (listId) {
    try {
      let profileId = null;
      if (results.profile?.data?.id) {
        profileId = results.profile.data.id;
      } else {
        const profileLookupResponse = await fetch(
          `${KLAVIYO_BASE_URL}/profiles/?filter=equals(email,"${encodeURIComponent(email)}")`,
          {
            method: "GET",
            headers: {
              "Authorization": `Klaviyo-API-Key ${apiKey}`,
              "Content-Type": "application/json",
              "revision": "2026-01-15"
            }
          }
        );
        if (profileLookupResponse.ok) {
          const profileData = await profileLookupResponse.json();
          if (profileData.data && profileData.data.length > 0) {
            profileId = profileData.data[0].id;
          }
        }
      }
      if (profileId) {
        const listPayload = {
          data: [
            {
              type: "profile",
              id: profileId
            }
          ]
        };
        const listResponse = await fetch(
          `${KLAVIYO_BASE_URL}/lists/${listId}/relationships/profiles/`,
          {
            method: "POST",
            headers: {
              "Authorization": `Klaviyo-API-Key ${apiKey}`,
              "Content-Type": "application/json",
              "revision": "2026-01-15"
            },
            body: JSON.stringify(listPayload)
          }
        );
        if (!listResponse.ok) {
          const errorText = await listResponse.text();
          throw new Error(`Klaviyo list API error: ${listResponse.status} - ${errorText}`);
        }
        const responseText = await listResponse.text();
        if (responseText && responseText.trim().length > 0) {
          try {
            results.list = JSON.parse(responseText);
          } catch {
            results.list = { success: true, message: "Profile added to list", raw: responseText };
          }
        } else {
          results.list = { success: true, message: "Profile added to list" };
        }
        console.log(`\u2705 Profile added to list ${listId} in Klaviyo`);
      } else {
        console.warn("\u26A0\uFE0F Could not find profile ID to add to list");
        results.list = { error: "Profile ID not found" };
      }
    } catch (error) {
      console.error("\u274C Error adding profile to list:", error);
      results.list = { error: error instanceof Error ? error.message : "Unknown error" };
    }
  } else {
    console.log("\u2139\uFE0F No list ID provided, skipping list addition");
  }
  return {
    success: true,
    ...results
  };
}
__name(sendToKlaviyo, "sendToKlaviyo");
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
