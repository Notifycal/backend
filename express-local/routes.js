// Lambdas are imported here (from dist folder, so all dependencies are bundled).
// It'd be nice if it could be generated off the OpenAPI spec but... this is it for now
import { handler as getUserProfile } from '../dist/lambdas/api/get-user-profile/index.cjs';
import { handler as getUserCalendars } from '../dist/lambdas/api/idp/get-user-calendars/index.cjs';
import { handler as patchUserProfile } from '../dist/lambdas/api/patch-user-profile/index.cjs';
import { handler as postLogin } from '../dist/lambdas/api/post-login/index.cjs';
import { handler as postRefresh } from '../dist/lambdas/api/post-refresh/index.cjs';
import { handler as postMessageDeliveryWebhook } from '../dist/lambdas/api/post-reminder-delivery-status-webhook/index.cjs';

const routes = {
  'idp/user-calendars': {
    GET: getUserCalendars
  },
  'user-profile': {
    GET: getUserProfile,
    PATCH: patchUserProfile
  },
  login: {
    POST: postLogin
  },
  refresh: {
    POST: postRefresh
  },
  'webhook/reminder-status': {
    POST: postMessageDeliveryWebhook
  }
};

export default routes;
