var request = require('request');
var express = require('express');
var x509 = require('x509');
var fs = require('fs');

var CERT_PATH = './apple-pay-cert.pem';

var cert = fs.readFileSync(CERT_PATH, 'utf8');
var merchantIdentifier = extractMerchantID(cert);

var app = express();

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/merchant-session/new', function(req, res) {
  var uri = req.query.validationURL || 'https://apple-pay-gateway-cert.apple.com/paymentservices/startSession';

  var options = {
    uri: uri,
    json: {
      merchantIdentifier: merchantIdentifier,
      domainName: process.env.APPLE_PAY_DOMAIN,
      displayName: process.env.APPLE_PAY_DISPLAY_NAME
    },

    agentOptions: {
      cert: cert,
      key: cert
    }
  };

  request.post(options, function(error, response, body) {
    if (body) {
      // Apple returns a payload with `displayName`, but passing this
      // to `completeMerchantValidation` causes it to error.
      delete body.displayName;
    }

    res.send(body);
  });
});

var server = app.listen(process.env.PORT || 3000, function() {
  console.log('Apple Pay server running on ' + server.address().port);
  console.log('GET /merchant-session/new to retrieve a merchant session');
});

function extractMerchantID(cert) {
  try {
    var info = x509.parseCert(cert);
    console.log(info);
    return info.extensions['1.2.840.113635.100.6.32'].substr(2);
  } catch (e) {
    console.error("Unable to extract merchant ID from certificate " + CERT_PATH);
  }
}
