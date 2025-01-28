// Lambdas are imported here (from dist folder, so all dependencies are bundled).
// It'd be nice if it could be generated off the OpenAPI spec but... this is it for now
import { handler as getUserCalendars } from '../dist/lambdas/api/get-user-calendars/index.cjs';
import { handler as getUserProfile } from '../dist/lambdas/api/get-user-profile/index.cjs';
import { handler as postLogin } from '../dist/lambdas/api/post-login/index.cjs';
import { handler as postRefresh } from '../dist/lambdas/api/post-refresh/index.cjs';

const routes = {
  'user-calendars': {
    GET: getUserCalendars
  },
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
