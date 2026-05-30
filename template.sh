#!/bin/bash

# Copyright 2021-present, Facebook, Inc. All rights reserved.

# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree.

APPTOKEN="EAAVhXjCVePYBRqrZCW5cVhkFRgHUnDgqoIxaEc665OjGnjz8ZA0ZB8MyHCL1ZC4pgUaEcBpXabwu2sOJ2ZC91BYFZCAfezpN2ZCmPrs1bGJeKiZAJtoNtD0q4QXhjBNZCSXd7bZAI9C58NtB9UfiFiVrxbKWqdFZAHNZAp3xSZCQQiv7MWXnYDuZBNUmOQtMA5DOHJ4R8ozgZDZD"
APPID="1514432053475574"
WABAID="849031811609441"
APIVERSION="v23.0"

# winget installs jq; Git Bash often does not see the updated user PATH
if ! command -v jq >/dev/null 2>&1; then
    _localappdata="${LOCALAPPDATA:-$HOME/AppData/Local}"
    _winget_links="${_localappdata}/Microsoft/WinGet/Links"
    if [[ -d "$_winget_links" ]]; then
        PATH="${_winget_links}:${PATH}"
    fi
    for _jq_pkg in "${_localappdata}"/Microsoft/WinGet/Packages/jqlang.jq_*/; do
        if [[ -x "${_jq_pkg}jq.exe" ]]; then
            PATH="${_jq_pkg}:${PATH}"
            break
        fi
    done
    export PATH
    unset _localappdata _winget_links _jq_pkg
fi
if ! command -v jq >/dev/null 2>&1; then
    echo "Error: jq is required. Install with: winget install jqlang.jq"
    echo "Then restart Git Bash, or add WinGet's jq folder to PATH."
    exit 1
fi

echo "Downloading image assets from Meta"
mkdir -p public
curl -o public/groceries.jpg https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e\&ab_page=AssetManagerID\&ab_entry=1530053877871776
curl -o public/salad_bowl.jpg https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e\&ab_page=AssetManagerID\&ab_entry=3255815791260974
curl -o public/sheet_pan_dinner.jpg https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e\&ab_page=AssetManagerID\&ab_entry=1389202275965231
curl -o public/strawberries.jpg https://scontent.xx.fbcdn.net/mci_ab/uap/asset_manager/id/?ab_b=e\&ab_page=AssetManagerID\&ab_entry=1393969325614091

declare -A handles
for image in "groceries" "salad_bowl" "sheet_pan_dinner" "strawberries"; do
    echo "Uploading $image"

    file_length=$(wc -c < "public/$image.jpg" | tr -d ' ')

    response=$(curl -s -X POST "https://graph.facebook.com/${APIVERSION}/${APPID}/uploads?file_name=${image}.jpg&file_length=${file_length}&file_type=image/jpg&access_token=${APPTOKEN}")

    upload_session_id=$(echo "$response" | jq -r '.id')
    echo "Upload session id: $upload_session_id"

    upload_response=$(curl -s -X POST "https://graph.facebook.com/${APIVERSION}/${upload_session_id}" \
        --header "Authorization: OAuth ${APPTOKEN}" \
        --header "file_offset: 0" \
        --data-binary @"public/${image}.jpg")
    echo "Upload response: $upload_response"
    handle=$(echo "$upload_response" | jq -r '.h')

    echo "Handle: $handle"

    handles["$image"]="$handle"
done

echo "Creating interactive media template"
curl -X POST "https://graph.facebook.com/${APIVERSION}/${WABAID}/message_templates" \
  -H "Authorization: Bearer ${APPTOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "grocery_delivery_utility",
    "language": "en_US",
    "category": "marketing",
    "components": [
      {
        "type": "header",
        "format": "image",
        "example": {
          "header_handle": [
            "'"${handles["groceries"]}"'"
          ]
        }
      },
      {
        "type": "body",
        "text": "Free delivery for all online orders with Jasper’s Market"
      },
      {
        "type": "footer",
        "text": "developers.facebook.com"
      },
      {
        "type": "buttons",
        "buttons": [
          {
            "type": "url",
            "text": "Get free delivery",
            "url": "https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/utility-templates/utility-templates"
          }
        ]
      }
    ]
  }'
echo

echo "Creating recipe media carousel template..."
curl -X POST "https://graph.facebook.com/${APIVERSION}/${WABAID}/message_templates" \
  -H "Authorization: Bearer ${APPTOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "recipe_media_carousel",
    "language": "en_US",
    "category": "marketing",
    "components": [
        {
            "type": "body",
            "text": "Our in-house chefs have prepared some delicious and fresh summer recipes."
        },
        {
            "type": "carousel",
            "cards": [
                {
                    "components": [
                        {
                            "type": "header",
                            "format": "image",
                            "example": {
                                "header_handle": [
                                    "'"${handles["sheet_pan_dinner"]}"'"
                                ]
                            }
                        },
                        {
                            "type": "body",
                            "text": "Simple and Healthy Sheet Pan Dinner to Feed the Whole Family"
                        },
                        {
                            "type": "buttons",
                            "buttons": [
                                {
                                    "type": "url",
                                    "text": "Get this recipe",
                                    "url": "https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/media-card-carousel-templates"
                                }
                            ]
                        }
                    ]
                },
                {
                    "components": [
                        {
                            "type": "header",
                            "format": "image",
                            "example": {
                                "header_handle": [
                                    "'"${handles["salad_bowl"]}"'"
                                ]
                            }
                        },
                        {
                            "type": "body",
                            "text": "3 Plant-Powered Salad Bowls to Fuel Your Week"
                        },
                        {
                            "type": "buttons",
                            "buttons": [
                                {
                                    "type": "url",
                                    "text": "Get this recipe",
                                    "url": "https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/media-card-carousel-templates"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
    ]
}'
echo

echo "Creating strawberries limited offer template..."
curl -X POST "https://graph.facebook.com/${APIVERSION}/${WABAID}/message_templates" \
  -H "Authorization: Bearer ${APPTOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "strawberries_limited_offer",
    "language": "en_US",
    "category": "marketing",
    "components": [
      {
        "type": "header",
        "format": "image",
        "example": {
          "header_handle": [
            "'"${handles["strawberries"]}"'"
          ]
        }
      },
      {
        "type": "limited_time_offer",
        "limited_time_offer": {
          "text": "Expiring offer!",
          "has_expiration": true
        }
      },
      {
        "type": "body",
        "text": "Fresh strawberries at Jasper'\''s Market are now 20% off! Get them while they last"
      },
      {
        "type": "buttons",
        "buttons": [
          {
            "type": "copy_code",
            "example": "BERRIES20"
          },
          {
            "type": "url",
            "text": "Shop now",
            "url": "https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/marketing-templates/limited-time-offer-templates"
          }
        ]
      }
    ]
  }'
echo

echo "Finished! Please check for errors if any"
