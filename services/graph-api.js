/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const { FacebookAdsApi } = require('facebook-nodejs-business-sdk');
const config = require("./config");

const GRAPH_API_VERSION = "v23.0";

FacebookAdsApi.init(config.accessToken);
const api = FacebookAdsApi.getDefaultApi();

module.exports = class GraphApi {
  static async #uploadMedia(senderPhoneNumberId, filePath) {
    const fileBuffer = fs.readFileSync(filePath);
    const formData = new FormData();
    formData.append("messaging_product", "whatsapp");
    formData.append("type", "image/jpeg");
    formData.append(
      "file",
      new Blob([fileBuffer], { type: "image/jpeg" }),
      path.basename(filePath)
    );

    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${senderPhoneNumberId}/media`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${config.accessToken}` },
        body: formData,
      }
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(`Media upload failed: ${JSON.stringify(data)}`);
    }
    return data.id;
  }

  static async #makeApiCall(messageId, senderPhoneNumberId, requestBody) {
    try {
      if (messageId) {
        const typingBody = {
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
          typing_indicator: {
            type: "text"
          }
        };

        await api.call(
          'POST',
          [`${senderPhoneNumberId}`, 'messages'],
          typingBody
        );
      }

      const response = await api.call(
        'POST',
        [`${senderPhoneNumberId}`, 'messages'],
        requestBody
      );
      console.log('API call successful:', response);
      return response;
    } catch (error) {
      console.error('Error making API call:', error);
      throw error;
    }
  }

  static async messageWithInteractiveReply(messageId, senderPhoneNumberId, recipientPhoneNumber, messageText, replyCTAs) {
    const requestBody = {
      messaging_product: "whatsapp",
      to: recipientPhoneNumber,
      type: "interactive",
      interactive: {
        type: "button",
        body: {
          text: messageText
        },
        action: {
          buttons: replyCTAs.map(cta => ({
            type: "reply",
            reply: {
              id: cta.id,
              title: cta.title
            }
          }))
        }
      }
    };

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
  }

  static async messageWithUtilityTemplate(messageId, senderPhoneNumberId, recipientPhoneNumber, options) {
    const { templateName, locale, imagePath } = options;
    const mediaId = await this.#uploadMedia(senderPhoneNumberId, imagePath);

    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhoneNumber,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: locale
        },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  id: mediaId
                }
              }
            ]
          },
        ]
      }
    };

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
  }

  static async messageWithLimitedTimeOfferTemplate(messageId, senderPhoneNumberId, recipientPhoneNumber, options) {
    const { templateName, locale, imagePath, offerCode } = options;
    const mediaId = await this.#uploadMedia(senderPhoneNumberId, imagePath);

    const currentTime = new Date();
    const futureTime = new Date(currentTime.getTime() + (48 * 60 * 60 * 1000));

    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhoneNumber,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: locale
        },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  id: mediaId
                }
              }
            ]
          },
          {
            type: "limited_time_offer",
            parameters: [
              {
                type: "limited_time_offer",
                limited_time_offer: {
                  expiration_time_ms: futureTime.getTime()
                }
              }
            ]
          },
          {
            type: "button",
            sub_type: "copy_code",
            index: 0,
            parameters: [
              {
                type: "coupon_code",
                coupon_code: offerCode
              }
            ]
          }
        ]
      }
    };

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
  }

  static async messageWithMediaCardCarousel(messageId, senderPhoneNumberId, recipientPhoneNumber, options) {
    const { templateName, locale, imagePaths } = options;
    const mediaIds = await Promise.all(
      imagePaths.map((filePath) => this.#uploadMedia(senderPhoneNumberId, filePath))
    );

    const requestBody = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: recipientPhoneNumber,
      type: "template",
      template: {
        name: templateName,
        language: {
          code: locale
        },
        components: [
          {
            type: "carousel",
            cards: mediaIds.map((mediaId, idx) => ({
              card_index: idx,
              components: [
                {
                  type: "header",
                  parameters: [
                    {
                      type: "image",
                      image: {
                        id: mediaId
                      }
                    }
                  ]
                }
              ]
            }))
          }
        ]
      }
    };

    return this.#makeApiCall(messageId, senderPhoneNumberId, requestBody);
  }

};
