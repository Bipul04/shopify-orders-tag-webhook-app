
import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate, unauthenticated } from "../shopify.server";
import { processOrderCreationWebhook } from "app/components/utils/orderWebhookHandler";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // Authenticate the incoming webhook request from Shopify
    const { topic, shop, payload } = await authenticate.webhook(request);
    const { admin, session } = await unauthenticated.admin('cartmade-dev.myshopify.com');

    // Call the utility function to process the order creation webhook data
    processOrderCreationWebhook(admin, shop, payload, topic);

    // Return a success response
    return new Response();

  } catch (error) {
    // Handle any errors that occur during the processing of the webhook
    console.error("Error processing order creation webhook:", error);
    return new Response();
  }
};
