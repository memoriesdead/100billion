import { NextResponse } from 'next/server';
// import { headers } from 'next/headers'; // Removed headers import
import Stripe from 'stripe';
import { supabase } from '@/lib/supabaseClient'; // Assuming supabase client is correctly set up for server-side
// TODO: Implement server-side auth check if needed (e.g., using Supabase Auth helpers for Route Handlers)

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!); // Removed apiVersion

export async function POST(request: Request) {
  // Get origin from request URL
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin; // e.g., 'http://localhost:3000'

  try {
    const { profileId } = await request.json();

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 });
    }

    // TODO: Add authentication check here - ensure a user is logged in
    // const { data: { user }, error: authError } = await supabase.auth.getUser(); // Example using Supabase
    // if (authError || !user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }
    // const loggedInUserId = user.id;

    console.log(`Creating checkout session for profile ID: ${profileId}`);

    // 1. Fetch the target profile data from Supabase
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('username, subscription_price')
      .eq('id', profileId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      if (profileError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch creator profile' }, { status: 500 });
    }

    if (!profile || !profile.subscription_price || profile.subscription_price <= 0) {
      console.error('Invalid profile or subscription price:', profile);
      return NextResponse.json({ error: 'Creator does not have a valid subscription price set.' }, { status: 400 });
    }

    const priceInCents = profile.subscription_price; // Assuming price is stored in cents
    const creatorUsername = profile.username ?? 'Creator';

    // Construct absolute URLs for success and cancel pages (using origin from request.url)
    const successUrl = `${origin}/profile/${creatorUsername}?subscribe=success`; // Redirect back to profile on success
    const cancelUrl = `${origin}/profile/${creatorUsername}?subscribe=cancel`;   // Redirect back to profile on cancel

    console.log(`Price: ${priceInCents} cents, Creator: ${creatorUsername}`);
    console.log(`Success URL: ${successUrl}`);
    console.log(`Cancel URL: ${cancelUrl}`);

    // 2. Create a Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: priceInCents, // Price in cents
            recurring: {
              interval: 'month',
            },
            product_data: {
              name: `Subscription to ${creatorUsername}`,
              description: `Monthly subscription to access content from ${creatorUsername}.`,
              // Add images if you have creator profile picture URLs accessible
              // images: [profile.profile_picture_url],
            },
          },
          quantity: 1,
        },
      ],
      // Add metadata if needed (e.g., to link the subscription to your users in webhook)
      // metadata: {
      //   subscribingUserId: loggedInUserId,
      //   creatorProfileId: profileId,
      // },
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    console.log('Stripe session created:', session.id);

    // 3. Return the session ID
    return NextResponse.json({ sessionId: session.id });

  } catch (error) {
    console.error('Error creating Stripe checkout session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: `Failed to create checkout session: ${errorMessage}` }, { status: 500 });
  }
}
