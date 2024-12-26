// Lambdas are imported here (from dist folder, so all dependencies are bundled).
// It'd be nice if it could be generated off the OpenAPI spec but... this is it for now
import { handler as postWatchEvents } from '../dist/lambdas/api/post-watch-events/index.cjs';
import { handler as postLogin } from '../dist/lambdas/api/post-login/index.cjs';
import { handler as getUserProfile } from '../dist/lambdas/api/get-user-profile/index.cjs';

const routes = {
  watchEvent: {
    POST: postWatchEvents
  },
  'user-profile': {
    GET: getUserProfile
  },
  login: {
    POST: postLogin
  }
};

export default routes;
