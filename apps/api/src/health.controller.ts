import { Controller, Get } from '@nestjs/common';

// Unauthenticated GET endpoint for Render's health check. render.yaml's
// healthCheckPath was previously set to /api/auth/refresh, which is POST-only
// and requires a valid refresh token cookie -- Render's checker sends a plain
// GET with no auth, so it could never get a 2xx response and the deploy would
// hang forever waiting for a "successful response code".
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok' };
  }
}
