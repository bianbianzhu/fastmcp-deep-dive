import { createRemoteJWKSet, jwtVerify } from "jose";
import { Request, Response, NextFunction } from "express";

/**
 * Environment configuration type for Stytch authentication
 */
type StytchEnvironment = {
  STYTCH_DOMAIN: string;
  STYTCH_PROJECT_ID: string;
};

/**
 * Extended Request interface that includes user authentication data
 */
export interface AuthenticatedRequest extends Request {
  userID?: string;
  claims?: any;
  accessToken?: string;
}

/**
 * stytchSessionAuthMiddleware is an Express middleware that validates that the user is logged in
 * It checks for the stytch_session_jwt cookie set by the Stytch FE SDK
 */
export const createStytchSessionAuthMiddleware = (env: StytchEnvironment) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const sessionCookie = req.cookies?.stytch_session_jwt;

    if (!sessionCookie) {
      res.status(401).json({ message: "Missing session cookie" });
      return;
    }

    try {
      const verifyResult = await validateStytchJWT(sessionCookie, env);
      req.userID = verifyResult.payload.sub!;
      next();
    } catch (error) {
      console.error("Session validation error:", error);
      res.status(401).json({ message: "Unauthenticated" });
    }
  };
};

/**
 * stytchBearerTokenAuthMiddleware is an Express middleware that validates that the request has a Stytch-issued bearer token
 * Tokens are issued to clients at the end of a successful OAuth flow
 */
export const createStytchBearerTokenAuthMiddleware = (
  env: StytchEnvironment
) => {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    const authHeader = req.headers.authorization;
    const protocol = req.protocol;
    const host = req.get("host");
    const origin = `${protocol}://${host}`;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      const wwwAuthValue = `Bearer error="Unauthorized", error_description="Unauthorized", resource_metadata="${origin}/.well-known/oauth-protected-resource"`;

      res
        .status(401)
        .set("WWW-Authenticate", wwwAuthValue)
        .json({ message: "Missing or invalid access token" });
      return;
    }

    const accessToken = authHeader.substring(7);

    try {
      const verifyResult = await validateStytchJWT(accessToken, env);
      req.claims = verifyResult.payload;
      req.accessToken = accessToken;
      next();
    } catch (error) {
      console.error("Bearer token validation error:", error);
      res.status(401).json({ message: "Unauthenticated" });
    }
  };
};

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/**
 * Validates a Stytch JWT token using JWKS
 */
async function validateStytchJWT(token: string, env: StytchEnvironment) {
  if (!jwks) {
    jwks = createRemoteJWKSet(
      new URL(`${env.STYTCH_DOMAIN}/.well-known/jwks.json`)
    );
  }

  return await jwtVerify(token, jwks, {
    audience: env.STYTCH_PROJECT_ID,
    issuer: [env.STYTCH_DOMAIN],
    typ: "JWT",
    algorithms: ["RS256"],
  });
}
