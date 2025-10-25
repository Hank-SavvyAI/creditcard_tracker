import { Router } from 'express'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'

const router = Router()

// Configure Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:9001/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id
          const email = profile.emails?.[0]?.value
          const firstName = profile.name?.givenName
          const lastName = profile.name?.familyName
          const avatar = profile.photos?.[0]?.value

          // Find or create user
          let user = await prisma.user.findUnique({
            where: { googleId },
          })

          if (!user && email) {
            // Try to find by email
            user = await prisma.user.findUnique({
              where: { email },
            })

            if (user) {
              // Link Google account to existing user
              user = await prisma.user.update({
                where: { id: user.id },
                data: {
                  googleId,
                  avatar: avatar || user.avatar,
                },
              })
            }
          }

          if (!user) {
            // Create new user
            user = await prisma.user.create({
              data: {
                googleId,
                email,
                firstName,
                lastName,
                username: email?.split('@')[0] || `user_${googleId}`,
                avatar,
                language: 'zh-TW',
                tier: 'FREE',
                role: 'USER',
              },
            })
          }

          return done(null, user)
        } catch (error) {
          return done(error as Error)
        }
      }
    )
  )
}

// Initialize Passport
passport.serializeUser((user: any, done) => {
  done(null, user.id)
})

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } })
    done(null, user)
  } catch (error) {
    done(error)
  }
})

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/?error=google_auth_failed`,
  }),
  (req, res) => {
    try {
      const user = req.user as any

      // Generate JWT
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET!,
        { expiresIn: '30d' }
      )

      // Redirect to frontend with token
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:9000'
      res.redirect(`${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user))}`)
    } catch (error) {
      console.error('Google auth callback error:', error)
      res.redirect(`${process.env.FRONTEND_URL}/?error=token_generation_failed`)
    }
  }
)

export default router
