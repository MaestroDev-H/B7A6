import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env';
import { prisma } from './prisma';
import { Role } from '@prisma/client';

// GCP Social Login strategy. Requires a real OAuth 2.0 Client ID/Secret from
// the Google Cloud Console (APIs & Services -> Credentials) with
// GOOGLE_CALLBACK_URL added to the authorized redirect URIs.
//
// Flow:
//   GET /api/v1/auth/google              -> redirects to Google's consent screen
//   GET /api/v1/auth/google/callback     -> Google redirects back here with a code
//
// On first login for a given Google account we create a User with
// provider=GOOGLE and no password (so local login stays impossible for that
// account unless they also set a password later). On subsequent logins we
// just look the account up by googleId.
if (env.google.clientId && env.google.clientSecret) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: env.google.clientId,
                clientSecret: env.google.clientSecret,
                callbackURL: env.google.callbackUrl,
            },
            async (_accessToken, _refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    if (!email) return done(new Error('Google account has no accessible email.'));

                    let user = await prisma.user.findFirst({
                        where: { OR: [{ googleId: profile.id }, { email }] },
                    });

                    if (!user) {
                        user = await prisma.user.create({
                            data: {
                                name: profile.displayName || 'Google User',
                                email,
                                googleId: profile.id,
                                provider: 'GOOGLE',
                                avatar: profile.photos?.[0]?.value,
                                role: Role.TENANT, // social sign-ups default to TENANT; admin/owner upgrade happens via admin panel
                                isVerified: true,
                            },
                        });
                    } else if (!user.googleId) {
                        // Existing local account signing in with Google for the first time - link it.
                        user = await prisma.user.update({ where: { id: user.id }, data: { googleId: profile.id } });
                    }

                    return done(null, user);
                } catch (err) {
                    return done(err as Error);
                }
            }
        )
    );
} else {
    console.warn('[google-oauth] GOOGLE_CLIENT_ID/SECRET not set - /auth/google routes will 501 until configured.');
}

export default passport;
