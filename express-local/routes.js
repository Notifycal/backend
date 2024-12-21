// Lambdas are imported here (from dist folder, so all dependencies are bundled).
// It'd be nice if it could be generated off the OpenAPI spec but... this is it for now
import { handler as postWatchEvents } from '../dist/lambdas/api/post-watch-events/index.cjs';
import { handler as postLogin } from '../dist/lambdas/api/post-login/index.cjs';
import { handler as getUser } from '../dist/lambdas/api/get-user/index.cjs';

const routes = {
  watchEvent: {
    POST: postWatchEvents
  },
  user: {
    GET: getUser
  },
  login: {
    POST: postLogin
  }
};

export default routes;
