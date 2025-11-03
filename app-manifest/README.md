# Create a Zoom Workplace Team Chat Chatbot app with the App Manifest API

This guide shows how to create a Zoom Team Chatbot app using the **App Manifest API**.

* First, add the following marketplace scopes:
  * Create apps: marketplace:write:app
  * View an app: marketplace:read:app

* Use the [Update an app by manifest](https://developers.zoom.us/docs/api/marketplace/#tag/manifest/put/marketplace/apps/{appId}/manifest) endpoint to quickly configure a Zoom Marketplace app.
  
* Replace `example.ngrok.app` with your actual ngrok domain when testing locally.

### Endpoint

```http
PUT /marketplace/apps/{appId}/manifest
```

### Sample request payload

```json
{
    "manifest": {
        "display_information": {
            "display_name": "Zoom Claude Chatbot Sample"
        },
        "oauth_information": {
            "usage": "USER_OPERATION",
            "development_redirect_uri": "https://example.ngrok.app",
            "production_redirect_uri": "",
            "oauth_allow_list": [
                "https://example.ngrok.app",
                "https://oauth.pstmn.io/v1/callback"
            ],
            "strict_mode": false,
            "subdomain_strict_mode": false,
            "scopes": [
                {
                    "scope": "imchat:userapp",
                    "optional": false
                },
                {
                    "scope": "marketplace:read:app",
                    "optional": false
                },
                {
                    "scope": "marketplace:write:app",
                    "optional": false
                }
            ]
        },
        "features": {
            "products": [
                "ZOOM_CHAT"
            ],
            "development_home_uri": "",
            "production_home_uri": "",
            "in_client_feature": {
                "zoom_app_api": {
                    "enable": false,
                    "zoom_app_apis": []
                },
                "guest_mode": {
                    "enable": false,
                    "enable_test_guest_mode": false
                },
                "in_client_oauth": {
                    "enable": false
                },
                "collaborate_mode": {
                    "enable": false,
                    "enable_screen_sharing": false,
                    "enable_play_together": false,
                    "enable_start_immediately": false,
                    "enable_join_immediately": false
                }
            },
            "zoom_client_support": {
                "mobile": {
                    "enable": false
                },
                "zoom_room": {
                    "enable": false,
                    "enable_personal_zoom_room": false,
                    "enable_shared_zoom_room": false,
                    "enable_digital_signage": false,
                    "enable_zoom_rooms_controller": false
                },
                "pwa_client": {
                    "enable": false
                }
            },
            "embed": {
                "meeting_sdk": {
                    "enable": false,
                    "enable_device": false,
                    "devices": []
                },
                "contact_center_sdk": {
                    "enable": false
                },
                "phone_sdk": {
                    "enable": false
                }
            },
            "team_chat_subscription": {
                "enable": true,
                "enable_support_channel": false,
                "slash_command": {
                    "command": "",
                    "command_hints": [],
                    "enable_add_to_channel": false,
                    "development_message_url": "https://example.ngrok.app/anthropic",
                    "production_message_url": "",
                    "sender_type": "zoom",
                    "welcome_msg": {
                        "title": "",
                        "body": ""
                    },
                    "trust_domain_list": []
                },
                "shortcuts": []
            },
            "event_subscription": {
                "enable": false,
                "events": []
            }
        }
    }
}
```