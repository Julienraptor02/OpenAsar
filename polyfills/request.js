const https = require('https');
const querystring = require("querystring");

// Generic polyfill for "request" npm package, wrapper for https
const nodeReq = ({ method, url, headers, qs, timeout, body, stream }) => {
  return new Promise((resolve, reject) => {
    const fullUrl = `${url}${qs != null ? `?${querystring.stringify(qs)}` : ''}`; // With query string
    const req = https.request(fullUrl, {
      method,
      headers,
      timeout
    }, async (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) { // Redirect, recall function
        return resolve(await nodeReq({
          url: res.headers.location,
          qs: null,
          method,
          headers,
          timeout,
          body,
          stream
        }));
      }

      resolve(res);
    });

    if (body) req.write(body); // Write POST body if included

    req.end();
  });
};

const request = (options, callback) => { // Main function
  if (typeof options === 'string') {
    options = {
      url: options
    };
  }

  // log('Polyfill > Request', options.method, options.url);

  const listener = {};

  nodeReq(options).then(async (res) => { // No error handling because yes
    let body = '';
    res.setEncoding('utf8');

    res.on('data', (chunk) => body += chunk);

    await new Promise((resolve) => res.on('end', resolve)); // Wait to read full body

    if (callback) callback(undefined, res, body);
    if (listener['response']) listener['response'](res);
  });

  return {
    on: (type, handler) => {
      listener[type] = handler;
    }
  }
};

// Method functions
request.get = (url, callback) => request({ url: url, method: 'GET' }, callback);

module.exports = request;