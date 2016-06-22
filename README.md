# Apple Pay Merchant Session Server

At WWDC 2016, Apple announced they are bringing Apple Pay to Safari via
the [Apple Pay JS
"Framework"](https://developer.apple.com/reference/applepayjs). For an
overview, I recommend watching the [recorded WWDC
talk](https://developer.apple.com/videos/play/wwdc2016/703/), which
covers the details of the architecture. I expect Apple Pay on the web to
be a game changer, because it makes online payment so incredibly
frictionless.

Unfortunately, Apple Pay for the Web has launched in what I would
consider to be a pre-beta state. Documentation is sparse, and some
critical pieces are undocumented completely.

In particular, before processing a payment, Apple requires that you
retrieve a "merchant session" using a developer-specific certificate.
This ensures that a compromised site can have its certificate revoked by
Apple if fraudulent charges start appearing.

As of this writing, the process for retrieving a merchant session is
undocumented and you have to reverse engineer your way into a working
system. This server tries to encode everything I've learned about how to
get a merchant session into a server that you can deploy.

## Warnings

Apple Pay for the Web is still very much a work in progress, and this
server could stop working at any time. Additionally, this is just a
proof of concept; there is no real error handling or security to speak
of. Please use this as a basis for your own work, or submit PRs to
improve it, but at this point I would not consider it production-ready.

## How It Works

Before beginning, you'll want to watch the [WWDC
video](https://developer.apple.com/videos/play/wwdc2016/703/) to
familiarize yourself with the high-level architecture.

Towards the middle of the session, they will describe the "Merchant
Validation" flow. They show this sample code:

```js
session.onvalidatemerchant = function (event) {
  var promise = performValidation(event.validationURL);
  promise.then(function (merchantSession) {
    session.completeMerchantValidation(merchantSession);
  });
}
```

Unfortunately, the `performValidation` function is not shown, nor is it
really explained in any detail. All you know is that you have a
validation URL to get it from.

### Obtaining a Certificate

In order to validate yourself as a merchant, you will need a **Merchant
ID** and an **Apple Pay Merchant Identity Certificate** (note that this
is _not_ the same as an Apple Pay Certificate). You can create these at
<https://developer.apple.com/account/ios/identifier/merchant/>. Make
sure you also have verified your domain name.

Once completed, you should have a certificate you can download and add
to Keychain Access on your Mac. Once added to Keychain Access, it should
up under the Certificates category and start with "Merchant ID:
&lt;your-merchant-id&gt;". It should also have a disclosure triangle to
the left of it, and when clicked, it should show a private key
associated with the certificate.

### Converting the Certificate to PEM

Next we need to convert the certificate into a format that Node.js
understands. Click the certificate, right click, and choose "Export
&lt;certificate-name&gt;". Make sure the export format is set to
Personal Information Exchange (.p12) and save it into this server's git
repo as `apple-pay-cert.p12`. If it asks you to pick a passphrase, you
can just leave it blank since we'll be removing it in a second anyway.

Now we'll convert from a .p12 file into a .pem file. Run this command in
your terminal:

```
openssl pkcs12 -in apple-pay-cert.p12 -out apple-pay-cert.pem -nodes -clcerts
```

This converts the certificate from .p12 to .pem.

### Starting the Server

Start the server by typing `npm start`. By default it will listen on
port 3000, or you can set the `PORT` environment variable.

The app has one route: GET
`/merchant-session/new?validationURL=<validationURL>`.

When you deploy the server, ensure you have the
`apple-pay-cert.pem` file in the root of the server.

You will also need to set the following environment variables:

| `APPLE_PAY_DOMAIN_NAME` | The domain name where the merchant session will be used. |
|------------------------|----------------------------------------------------------|
| `APPLE_PAY_DISPLAY_NAME` | The display name of your Merchant ID from Apple. |

### Getting a Merchant Session

To get a merchant session, take the `validationURL` passed to your
`onvalidatemerchant` event handler, make an XHR request to this server
with the validation URL in the query string, and once the request
returns, pass it to `completeMerchantValidation`. The whole thing might
look like this:

```js
session.onvalidatemerchant = ({ validationURL }) => {
  fetch('https://apple-pay.example.com/merchant-validation/new')
    .then(res => res.json())
    .then(json => {
      session.completeMerchantValidation(json);
    });
};
```

## Thanks

A huge thanks to [Chris Boulton
(@surfichris)](https://twitter.com/surfichris) who figured all of this
out before I did and walked me through it. His crucial insight was that
the merchant ID passed to the Apple server is not the human readable
form, but a binary value embedded in the certificate, which this server
attempts to extract automatically.

This work was extracted from a project I am working on for
[Monegraph](https://monegraph.com).

## License

MIT
