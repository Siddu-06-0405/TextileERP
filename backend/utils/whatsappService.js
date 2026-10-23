import twilio from "twilio";
import dotenv from "dotenv";
import Admin from "../models/admin.js";

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;
export let sentToCount = 0;

// Initialize Twilio client only if credentials are available
let client = null;
let fromWhatsAppNumber = null;

if (accountSid && authToken && whatsappNumber) {
  client = new twilio(accountSid, authToken);
  fromWhatsAppNumber = `whatsapp:${whatsappNumber}`;
} else {
  console.warn("WhatsApp service not initialized - missing Twilio credentials");
}

/**
 * Sends a WhatsApp message to all admins whose 'active' is true.
 */
export async function sendWhatsAppMessage(message) {
  try {
    if (!client || !fromWhatsAppNumber) {
      return;
    }

    // 1️⃣ Get all active admins
    const activeAdmins = await Admin.find({ active: true });

    if (!activeAdmins.length) {
      return;
    }

    sentToCount = activeAdmins.length;
    // 2️⃣ Send message to each admin
    for (const admin of activeAdmins) {
      try {
        const response = await client.messages.create({
          from: fromWhatsAppNumber,
          to: `whatsapp:${admin.number}`,
          body: message,
        });
      } catch (err) {
        console.error(`Failed to send WhatsApp to ${admin.name} (${admin.number}):`, err);
      }
    }
  } catch (error) {
    console.error("Failed to send WhatsApp to admins:", error);
  }
}

/**
 * Sends a WhatsApp message to a list of customer phone numbers.
 */
export async function sendWhatsAppToCustomers(message, customerNumbers) {
  try {
    if (!client || !fromWhatsAppNumber) {
      return;
    }

    if (!customerNumbers.length) {
      return;
    }

    for (const number of customerNumbers) {
      try {
        const response = await client.messages.create({
          from: fromWhatsAppNumber,
          to: `whatsapp:${number}`,
          body: message,
        });
      } catch (err) {
        console.error(`Failed to send WhatsApp to customer (${number}):`, err);
      }
    }
  } catch (error) {
    console.error("Error sending WhatsApp to customers:", error);
  }
}