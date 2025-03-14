import bodyParser from 'body-parser';
import express from 'express';

import timeout from 'connect-timeout';

import { c as testingContext, unsafeTestEvent } from '../dist/testing/data/apigateway.cjs';
import routes from './routes.js';

const port = process.env.PORT || 8080;

const isJSONString = (string) => {
  try {
    JSON.parse(string);
    return true;
  } catch {
    return false;
  }
};

const normalizeQueryParams = (query) => {
  return Object.keys(query).reduce((acc, key) => {
    acc[key] = Array.isArray(query[key])
      ? query[key].map(String) // Convert array elements to strings
      : String(query[key]); // Convert everything to a string
    return acc;
  }, {});
};

const initialize = (router) => {
  const respond = (promise, response) => {
    promise
      .then((data) => {
        // Some responses do not have a body. In this case, the end message must be used to send the response.
        if (data.body) {
          if (isJSONString(data.body)) {
            response.status(data.statusCode).set(data.headers).json(JSON.parse(data.body));
          } else {
            response.status(data.statusCode).set(data.headers).send(data.body);
          }
        } else {
          response.status(data.statusCode).set(data.headers).end();
        }
      })
      .catch((err) => {
        try {
          const error = JSON.parse({ error: err });
          response.status(500).json(error);
        } catch {
          console.log(err);
        }
      });
  };

  const routerMethods = {
    GET: router.get,
    PUT: router.put,
    PATCH: router.patch,
    POST: router.post,
    DELETE: router.delete
  };

  const respondParam = (endpoint, method) => (req, res) => {
    // TODO: only valid while all endpoints are of type APIGatewayProxyEvent.
    const event = unsafeTestEvent(req.body || {}, req.headers, normalizeQueryParams(req.query));
    const responsePromise = routes[endpoint][method](event, testingContext);
    respond(responsePromise, res);
  };

  Object.keys(routes).forEach((endpoint) => {
    const methods = routes[endpoint];
    Object.keys(methods).forEach((method) => {
      const fullEndpoint = `/api/v1/${endpoint}`;
      console.log(`Setting up ${method} ${fullEndpoint}`);
      const params = [fullEndpoint, respondParam(endpoint, method)];

      routerMethods[method].apply(router, params);
    });
  });
};

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use((req, res, next) => {
  res.append('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.append('Access-Control-Allow-Headers', '*');
  res.append('Access-Control-Allow-Methods', '*');
  next();
});

app.use(timeout('30s'));
app.use((req, res, next) => {
  if (!req.timedout) {
    next();
  }
});

const router = express.Router();
initialize(router);

app.use('/', router);
app.listen(port, () => console.log('Local dev server started listening on port: ', port));
