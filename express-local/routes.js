// Lambdas are imported here (from dist folder, so all dependencies are bundled).
// It'd be nice if it could be generated off the OpenAPI spec but... this is it for now
import { handler as postLogin } from '../dist/lambdas/api/post-login/index.cjs';
import { handler as postRefresh } from '../dist/lambdas/api/post-refresh/index.cjs';
import { handler as getUserProfile } from '../dist/lambdas/api/get-user-profile/index.cjs';

const routes = {
  'user-profile': {
    GET: getUserProfile
  },
  login: {
    POST: postLogin
  },
  refresh: {
    POST: postRefresh
  }
};

export default routes;
