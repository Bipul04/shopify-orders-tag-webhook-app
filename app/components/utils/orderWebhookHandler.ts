// utils/orderWebhookHandler.ts
export const processOrderCreationWebhook = async (
    admin: any,
    shopDomain: string,
    orderData: any,
    webhookTopic: string
) => {
    try {
        // Log the incoming webhook details
        // console.log(`Received ${webhookTopic} webhook for shop: ${shopDomain}`);
        // console.log("Order data:", JSON.stringify(orderData, null, 2));

        // Extract the order ID and sourceName dynamically from the incoming webhook payload
        // const orderId = orderData.id;
        // const sourceName = orderData.source_name;
        const orderId = 5307269152923;
        const sourceName = "shopify_draft_order";
        if (!orderId) {
            throw new Error("Order ID is missing from the webhook payload");
        }

        if (sourceName === "shopify_draft_order") {
            // Send GraphQL request to Shopify Admin API to fetch order details
            const graphqlQuery = `
                query {
                    order(id: "gid://shopify/Order/${orderId}") {
                    name
                    sourceName
                    events(first:1){
                        edges{
                            node{
                                id
                                message
                            }
                        }
                     }
                    }
                }
                `;

            const response = await admin.graphql(graphqlQuery);
            if (!response.ok) {
                throw new Error(`Failed to fetch order details for order ID: ${orderId}`);
            }

            const orderEventData = await response.json();
            // Extract the message from the event's node and parse out the name before 'created'
            const eventMessage = orderEventData?.data?.order?.events?.edges?.[0]?.node?.message;
            if (!eventMessage) {
                throw new Error("Event message not found");
            }

            // Extract the name from the message (before 'created')
            const createdString = "created this order";
            const nameMatch = eventMessage.match(new RegExp(`(.*?) ${createdString}`));
            const extractedName = nameMatch ? nameMatch[1].trim() : null;
            if (!extractedName) {
                throw new Error("Unable to extract the name from the event message");
            }

            // Log the extracted name for debugging
            console.log(`Extracted name: ${extractedName}`);

            // Mutation to update order metafields
            const mutationQuery = `
          mutation updateOrderMetafields($input: OrderInput!) {
            orderUpdate(input: $input) {
              order {
                id
                name
              }
              userErrors {
                message
                field
              }
            }
          }
        `;

            const mutationVariables = {
                input: {
                    tags: extractedName, // Using the extracted name in tags
                    id: `gid://shopify/Order/${orderId}`
                }
            };

            // Call the GraphQL mutation
            const mutationResponse = await admin.graphql(mutationQuery, { variables: mutationVariables });
            const mutationData = await mutationResponse.json();

            // // Check for userErrors in the mutation response
            // if (mutationData.data?.orderUpdate?.userErrors?.length > 0) {
            //     console.error("Mutation failed with errors:", mutationData.data.orderUpdate.userErrors);
            //     throw new Error(`Failed to update order: ${mutationData.data.orderUpdate.userErrors[0].message}`);
            // }

            // Log successful order update
            console.log("Order updated successfully:", mutationData);
            return null;
        }

        return null; // If source is not 'shopify_draft_order', no further action is taken

    } catch (error) {
        console.error(`Error processing order creation webhook for ${shopDomain}:`, error);
        throw new Error('Failed to process order creation webhook');
    }
};
