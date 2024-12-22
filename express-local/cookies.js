import setCookie from 'set-cookie-parser';

// Transforming from set-cookie format to something that express' cookie-parser understands (an object)
// https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie
export const parseLambdaCookie = (cookieString) => {
  const parsedCookie = setCookie.parse(cookieString);
  // parse always return an array, even when parsing a single set-cookie string
  return parsedCookie[0];
};

export const parseLambdaCookies = (cookieArray) => {
  return cookieArray.map(parseLambdaCookie);
};
