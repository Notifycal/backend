// Lambdas are imported here (from dist folder, so all dependencies are bundled).
// It'd be nice if it could be generated off the OpenAPI spec but... this is it for now
import { handler as getCalendarEvents } from '../dist/api/get-calendar-events/index.cjs';
import { handler as postWatchEvents } from '../dist/api/post-watch-events/index.cjs';
import { handler as login } from '../dist/api/login/index.cjs';

const routes = {
  watchEvent: {
    POST: postWatchEvents
  },
  calendarEvent: {
    GET: getCalendarEvents
  },
  login: {
    POST: login
  }
};

export default routes;
