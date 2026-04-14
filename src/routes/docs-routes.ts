import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';

export function createDocsRoutes(): Router {
  const router = Router();
  const specPath = path.join(process.cwd(), 'openapi.yaml');
  const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));

  router.use('/', swaggerUi.serve);
  router.get('/', swaggerUi.setup(spec, { customSiteTitle: 'StreamAMG API Docs' }));

  return router;
}
