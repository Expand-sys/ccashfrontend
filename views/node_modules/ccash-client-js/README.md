# ccash-client-js

TypeScript/JavaScript client library for [CCash](https://github.com/EntireTwix/CCash) HTTP API.

## Installation

```
yarn add ccash-client-js
# or
npm install --save ccash-client-js
```

## Usage

```js
import { CCashClient } from 'ccash-client-js';

process.env.CCASH_API_BASE_URL = 'https://your.ccash.api';

const client = new CCashClient();

console.log(await client.balance('blinkblinko'));
```

Set environment variable `DEBUG=CCashClient` to log debug messages.

## Examples

- Web (react) example can be found in [`examples/web`](./examples/web)

- Server (node) example can be found in [`examples/node`](./examples/node)

Run `yarn start` to run the examples from their corresponding directory.

## Development

- Build for production: `yarn build`

- Build and watch for development: `yarn dev`

- Format source code w/ prettier: `yarn format`

- Test source units w/ jest: `yarn test`
