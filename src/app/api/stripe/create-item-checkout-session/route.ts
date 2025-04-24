import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient'; // Import supabase client
// TODO: Implement server-side auth check if needed

// Initialize Stripe with the secret key from environment variables
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  // Get origin from request URL for constructing redirect URLs
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;

  try {
    const { postId } = await request.json(); // Expecting postId now

    if (!postId) {
      return NextResponse.json({ error: 'Post ID (postId) is required' }, { status: 400 });
    }

    // TODO: Add authentication check here - ensure a user is logged in before allowing purchase
    // const { data: { user }, error: authError } = await supabase.auth.getUser(); // Example
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    // const loggedInUserId = user.id; // Keep for potential future use (e.g., linking purchase)

    console.log(`Creating item checkout session for Post ID: ${postId}`);

    // 1. Fetch post details from Supabase
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('caption, price, currency, user_id, is_for_sale') // Select necessary fields
      .eq('id', postId)
      .single();

    if (postError) {
      console.error('Error fetching post:', postError);
      return NextResponse.json({ error: 'Failed to fetch post details' }, { status: 500 });
    }

    if (!post || !post.is_for_sale || !post.price || post.price <= 0) {
      console.error('Post not found, not for sale, or invalid price:', post);
      return NextResponse.json({ error: 'This item is not available for purchase.' }, { status: 400 });
    }

    const priceInCents = post.price;
    const currencyCode = post.currency || 'usd'; // Default to usd if null
    const postCaption = post.caption || 'Digital Content Purchase'; // Default product name

    // 2. Dynamically create Stripe Price (and potentially Product if needed)
    // For simplicity, we'll create a price directly.
    // You might want a more robust system involving pre-created products or linking.
    let stripePriceId = '';
    try {
      const priceObject = await stripe.prices.create({
        currency: currencyCode,
        unit_amount: priceInCents,
        product_data: { // Create product info on the fly
          name: postCaption,
          // Add more product details if desired
        },
      });
      stripePriceId = priceObject.id;
      console.log(`Dynamically created Stripe Price ID: ${stripePriceId}`);
    } catch (stripeError) {
       console.error('Error creating Stripe price:', stripeError);
       return NextResponse.json({ error: 'Failed to prepare payment details.' }, { status: 500 });
    }

    // 3. Define success and cancel URLs
    // Redirect back to the profile page or a dedicated order status page
    // You might want to include query parameters to show success/cancel messages
    const successUrl = `${origin}/profile?purchase=success&session_id={CHECKOUT_SESSION_ID}`; // Example success URL
    const cancelUrl = `${origin}/profile?purchase=cancel`;   // Example cancel URL

    console.log(`Success URL: ${successUrl}`);
    console.log(`Cancel URL: ${cancelUrl}`);

    // Create a Stripe Checkout Session for a one-time payment
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment', // Use 'payment' mode for one-time purchases
      line_items: [
        {
          price: stripePriceId, // Use the newly created Price ID
          quantity: 1,
        },
      ],
      // Add metadata if needed (e.g., link purchase to user, item ID)
      // metadata: {
      //   buyerUserId: loggedInUserId,
      //   storeItemId: 'some_item_id_from_db', // You might need to pass this from frontend too
      // },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log('Stripe item checkout session created:', session.id);

    // Return the session ID to the frontend
    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error('Error creating Stripe item checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    // Provide a more generic error message to the client
    return NextResponse.json({ error: 'Failed to create checkout session.' }, { status: 500 });
  }
}
