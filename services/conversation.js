/**
 * Copyright 2021-present, Facebook, Inc. All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use strict";

const path = require("path");

const constants = require("./constants");
const config = require("./config");
const GraphApi = require('./graph-api');
const Message = require('./message');
const Status = require('./status');
const Cache = require('./redis');


const DEMO_REPLY_CTAS = [
  {
    id: constants.REPLY_INTERACTIVE_MEDIA_ID,
    title: constants.REPLY_INTERACTIVE_WITH_MEDIA_CTA,
  },
  {
    id: constants.REPLY_MEDIA_CAROUSEL_ID,
    title: constants.REPLY_MEDIA_CARD_CAROUSEL_CTA,
  },
  {
    id: constants.REPLY_OFFER_ID,
    title: constants.REPLY_OFFER_CTA,
  },
];

function getDemoReplyCTAs() {
  return DEMO_REPLY_CTAS.filter((cta) => cta.id && cta.title);
}

function sendTryOutDemoMessage(messageId, senderPhoneNumberId, recipientPhoneNumber, messageBody) {
  return GraphApi.messageWithInteractiveReply(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    messageBody,
    getDemoReplyCTAs()
  );
}

function sendInteractiveMediaMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
  const publicDir = path.join(__dirname, "..", "public");
  return GraphApi.messageWithUtilityTemplate(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    {
      templateName: "grocery_delivery_utility",
      locale: "en_US",
      imagePath: path.join(publicDir, "groceries.jpg"),
    }
  );
}

function sendLimitedTimeOfferMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
  const publicDir = path.join(__dirname, "..", "public");
  return GraphApi.messageWithLimitedTimeOfferTemplate(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    {
      templateName: "strawberries_limited_offer",
      locale: "en_US",
      imagePath: path.join(publicDir, "strawberries.jpg"),
      offerCode: "BERRIES20",
    }
  );
}

function sendMediaCarouselMessage(messageId, senderPhoneNumberId, recipientPhoneNumber) {
  const publicDir = path.join(__dirname, "..", "public");
  return GraphApi.messageWithMediaCardCarousel(
    messageId,
    senderPhoneNumberId,
    recipientPhoneNumber,
    {
      templateName: "recipe_media_carousel",
      locale: "en_US",
      imagePaths: [
        path.join(publicDir, "sheet_pan_dinner.jpg"),
        path.join(publicDir, "salad_bowl.jpg"),
      ]
    }
  );
}

async function markMessageForFollowUp(messageId) {
  await Cache.insert(messageId);
}


module.exports = class Conversation {
  constructor(phoneNumberId) {
    this.phoneNumberId = phoneNumberId;
  }

  static async handleMessage(senderPhoneNumberId, rawMessage) {
    const message = new Message(rawMessage);

    try {
      switch (message.type) {
        case constants.REPLY_INTERACTIVE_MEDIA_ID: {
          const interactiveMediaResponse = await sendInteractiveMediaMessage(
            message.id,
            senderPhoneNumberId,
            message.senderPhoneNumber
          );
          await markMessageForFollowUp(interactiveMediaResponse.messages[0].id);
          break;
        }
        case constants.REPLY_MEDIA_CAROUSEL_ID: {
          const mediaCarouselResponse = await sendMediaCarouselMessage(
            message.id,
            senderPhoneNumberId,
            message.senderPhoneNumber
          );
          await markMessageForFollowUp(mediaCarouselResponse.messages[0].id);
          break;
        }
        case constants.REPLY_OFFER_ID: {
          const ltoResponse = await sendLimitedTimeOfferMessage(
            message.id,
            senderPhoneNumberId,
            message.senderPhoneNumber
          );
          await markMessageForFollowUp(ltoResponse.messages[0].id);
          break;
        }
        default:
          await sendTryOutDemoMessage(
            message.id,
            senderPhoneNumberId,
            message.senderPhoneNumber,
            constants.APP_DEFAULT_MESSAGE
          );
          break;
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  }

  static async handleStatus(senderPhoneNumberId, rawStatus) {
    const status = new Status(rawStatus);

    // Only handle delivered and read statuses
    if (!(status.status === 'delivered' || status.status === 'read')) {
      return;
    }

    // Only send a follow up message if the current message is flagged
    // as needing one in the cache.
    if (await Cache.remove(status.messageId)) {
      await sendTryOutDemoMessage(
        undefined,
        senderPhoneNumberId,
        status.recipientPhoneNumber,
        constants.APP_TRY_ANOTHER_MESSAGE
      );
    }
  }
};
