# tinhte-api React Component

[![Travis][build-badge]][build]
[![npm package][npm-badge]][npm]
[![Codecov][codecov-badge]][codecov]

Quickly setup API authentication against [Tinh tế](https://tinhte.vn) for React applications. Demo:

 - [Client-only app](https://tinhte-api.now.sh/?client_id=2wseo5fywn)
 - [Next.js SSR app](https://tinhte-api.now.sh/nextjs/?client_id=2wseo5fywn)
 - The demos both use the same [set of components](https://github.com/daohoangson/js-tinhte-api/tree/master/packages/tinhte-api-react/demo/src/components)
 

## Usage

### Install

Install the React library:

```bash
npm install --save tinhte-api-react
```

Or install the core library only:

```bash
npm install --save tinhte-api
```

Both library works similarly in initialization, api calling, etc. The React library is built on top of the core one and provide React components for easy usage in React web app.

### Initialize

`clientId` is required for api instance to work. For React library: `callbackUrl` is also required (see below for callback explanation).

```js
import { apiFactory } from 'tinhte-api-react'

const api = apiFactory({
    clientId: 'clientId',
    callbackUrl: 'http://app.domain.com/api-callback'
})
```

### Render Page

Use ApiProvider higher order component to prepare parent component. The API context will be available for all children components.

```js
import React from 'react'

const Home = () => (
    <div>
        <ChildOne />
        <ChildTwo />
        ...
    </div>
)

const HomeWithApi = api.ProviderHoc(Home)
```

### Render Callback

The Provider HOC will attempt to authenticate user using [OAuth2 implicit flow](https://tools.ietf.org/html/rfc6749#section-1.3.2) and that requires serving an additional page as the target redirection URL. We are going to use [React Router](https://reacttraining.com/react-router/) below but you can use anything (Next.js page, expressjs route, etc.):

```js
import {BrowserRouter as Router, Route} from 'react-router-dom'

// const api = ☝️

// const HomeWithApi = ☝️

const App = () => (
    <Router>
        <div>
            <Route exact path='/' component={HomeWithApi} />
            <Route path='/api-callback' component={api.CallbackComponent} />
        </div>
    </Router>
)
```

You can also trigger the function `processCallback` directly on the callback page, 

```html
<script type="text/javascript" src="https://unpkg.com/react@^16/umd/react.production.min.js"></script>
<script type="text/javascript" src="https://unpkg.com/tinhte-api-react@4/umd/tinhte-api-react.min.js"></script>
<script type="text/javascript">TinhteApiReact.processCallback();</script>
```

### Fetch from API

In children components, use `apiHoc.ApiConsumer` to prepare the `api` prop and fetch data.
It's recommended to only use `api` if you fetch during some user action (e.g. `onClick`), in other cases,
implement `apiFetches` or `apiFetchesWithAuth` and let `ApiConsumer` manages those for better performance.

```js
import { apiHoc } from 'tinhte-api-react'

const UsersMeBase = ({ api }) => {
    const fetch = () => api.get('users/me')
        .then((json) => console.log(json))
        .error(reason) => console.error(reason))

    return <button onClick={fetch}>Fetch</button>
}

const UsersMeComponent = apiHoc.ApiConsumer(UsersMeBase)
```

Use the newly built component anywhere under Provider HOC sub-tree and it will have `props.api` setup.

```js
const ContainerComponent = () => (
    <UsersMeComponent />
)
```

## References

### apiFactory

Params:

 - `config` object
   - `apiRoot` default=`'https://tinhte.vn/appforo/index.php'`
   - `auth` object
     - `accessToken` default=`''`
     - `userId` default=`0`
   - `callbackUrl` default=`''`
   - `clientId` default=`''`
   - `cookiePrefix` default=`''`: it is possible to use `xf_` and the React component will **only** attempt authentication when `xf_session` or `xf_user` cookies exists -- effectively sync logged in status between server side XenForo and client side JavaScript. This requires a patched version of XenForo to work because XF sets the cookie to be http only.
   - `debug` default=`false`
   - `ott` default=`''`
   - `scope` default=`'read'`
   - `headers` default=`{}`: the headers to be sent with all requests. To delete some default header for a specific request, set it to `undefined`.

Returns an `api` object.

Example:

```js
import { apiFactory } from 'tinhte-api'

const api = apiFactory({ apiRoot, clientId })
```

### api.CallbackComponent

*tinhte-api-react only.*
Returns a React component.

### api.ConsumerHoc

*tinhte-api-react only.*
Alias: `apiHoc.ApiConsumer`

Params:

 - `Component` required React component

Props:

 - `onFetched` function
 - `onFetchedWithAuth` function

Returns a higher order React component, the underlying component will receive `api` and api data as props.
It can use `api` directly (`api.get()`, `api.post()`, `api.batch()`, etc.)
or it can let the HOC make the requests and benefit from multiple requests
from different components being batched together automatically.

Currenty, `ApiConsumer` supports 2 types of requests: `apiFetches` and `apiFetchesWithAuth`.
They can be configured this way:

```js
// const ComponentBase = ...

ComponentBase.apiFetches = {
  someKey: {
    method: 'GET',
    headers: [],
    params: {},
    uri: 'some-uri',
    success: (json) => json.jsonKey,
    error: (reason) => someDefaultValue
  },

  postById: (api, { postId }) => {
    if (!postId) {
      return null
    }

    return {
      uri: 'posts',
      params: {
        post_id: postId
      }
    }
  }
}

ComponentBase.apiFetchesWithAuth = {
  visitorThreads: (api) => {
    const userId = api.getUserId()
    if (!userId) {
      return null
    }

    return {
      uri: 'threads',
      params: {
        creator_user_id: userId
      }
    }
  }
}

const Component = api.ConsumerHoc(ComponentBase)
```

The ones declared in `apiFetches` will be fetched as soon as the parent `ApiProvider` is mounted.
While the ones in `apiFetchesWithAuth` wait until authentication complete before being fetched.
Please note that it's not guaranteed that fetches in `apiFetchesWithAuth` will have a valid token (a non-logged in user visit your app for example).
Each fetch can also be configured with a `function`, it will receive `api` and `props` as params and must return a valid object with `uri`, `method`, etc. for the fetch to work.

The HOC will do the fetches and pass data as props for the component to use (in the example above, `props.someKey` will become available).
By default, the HOC will use the response `JSON` object as the value, you can do some normalization via `success` to make it easier to render.
Additionally, you can specify the `error` callback to provide some default value in case of a failed request.

### api.ProviderHoc

*tinhte-api-react only.*
Params:

 - `Component` required React component

Props:

 - `apiConfig` object
 - `apiData` object

Returns a higher order React component, the underlying component will receive no additional props.

The props are completely optional and using them is considered advanced usage (yes, they are a bit complicated).
The general use case for these props are server side rendering, you can safely ignore them for client only app
(if you use `apiFetches` and `apiFetchesWithAuth`, it will be very easy to add SSR to your app later). A few examples:

 - **You need to pass the one time token from the server to client?** You may generate OTT per request and put it into `apiConfig`:
 ```js
 const ott = api.generateOneTimeToken(clientSecret)

 return <ApiProvider apiConfig={{ott}} />
 ```
 - **You want to render components on the server but they need api data to work?** You may use `fetchApiDataForProvider`, it will give you the `apiData` object, ready to be use with `ApiProvider`.

### api.fetchApiDataForProvider

Params:

 - `rootElement` required React root element

Returns a `Promise` that will resolve to the usable ApiProvider props object.

Example for Next.js:

```js
const ApiProvider = api.ProviderHoc(Page)

ApiProvider.getInitialProps = async () => {
  // clone api instance for security reason
  const reqApi = api.clone()
  const ReqApiProvider = reqApi.ProviderHoc(Page)
  
  const apiConfig = {}
  if (!process.browser) {
    // client secret should be accessible on server only
    apiConfig.ott = reqApi.generateOneTimeToken(clientSecret)
  }

  const apiData = await api.fetchApiDataForProvider(<ReqApiProvider apiConfig={apiConfig} />)
  return {apiConfig, apiData}
}
```

### api.fetchOne

Alias:

 - `api.del`
 - `api.get`
 - `api.post`
 - `api.put`

Params:
 
 - `options` object or string (will be used as `uri`)
   - `body` default=`null`
   - `method` default=`'GET'`
   - `headers` default=`{}`
   - `params` default=`{}`
   - `parseJson` default=`true`
   - `uri` default=`''`

Returns a `Promise` that will resolve to the parsed json or raw response object.

A GET request example:

```js
api.get('users/me')
    .then((json) => console.log('success', json.user))
    .catch((reason) => console.warn('error', reason))
```

Example with a POST request:

```js
api.post({
  uri: 'threads',
  params: {
    forum_id: 2,
    thread_title: 'Hello',
    post_body: 'World.'
  }
})
```

Example with a GET request with headers:
```js
api.get({
  uri: 'threads',
  headers: { 
    'foo': 'bar',
    'foo1': 'bar1',
  }
})
```

#### Helpers

- `api.login(clientSecret: string, username: string, password: string): Promise` executes POST request to oauth/token with OAuth2 [grant_type=password](https://oauth.net/2/grant-types/password/)
- `api.refreshToken(clientSecret: string, refreshToken: string): Promise` executes POST request to oauth/token with OAuth2 [grant_type=refresh_token](https://oauth.net/2/grant-types/refresh-token/)

### api.fetchMultiple

Alias:

 - `api.batch`

Params:

 - `fetches` required func
 - `options` object
   - `triggerHandlers` default=`true`

Returns a `Promise` that will resolve to the response `JSON` object.

Example:

```js
api.batch(() => {
    api.get('notifications')
        .then((json) => console.log('notifications', json.notifications))
        .catch((reason) => console.warn('notifications error', reason))

    api.get('conversations')
        .then((json) => console.log('conversations', json.conversations))
        .catch((reason) => console.warn('conversations error', reason))
})
```

### api.generateOneTimeToken

Params:

 - `clientSecret` string
 - `ttl` number|Date

Returns a string.

**Note:** This method will not work in browser unless debugging is turned on (`debug=true`).
It is strongly recommended against exposing client secret to visitors.

### api.getAccessToken

Returns the authenticated access token or empty string.

### api.getApiRoot

Returns the configured API root string.

### api.getAuth

Returns the authentication object.

### api.getCallbackUrl

Returns the configured callback URL string.

### api.getClientId

Returns the configured client ID string.

### api.getCookiePrefix

Returns the configured cookie prefix.

### api.getDebug

Returns `true` if debugging is turned on, or `false` otherwise.

### api.getOtt

Returns the configured one time token string.

### api.getScope

Returns the configured scope string.

### api.getFetchCount

Returns the number of fetches have been made since initialization.

### api.getUniqueId

Returns the unique ID string of this api instance.

### api.getUserId

Returns the authenticated access token or `0`.

### api.hasAuth

Returns `true` if authentication has been set, or `false` otherwise.

### api.onAuthenticated

*tinhte-api-react only.*
Params:

 - `callback` required func

Returns a `func` that can be used to cancel the callback.
It's recommended to use `apiFetchesWithAuth` instead of using this method directly.

### api.onProviderMounted

*tinhte-api-react only.*
Params:

 - `callback` required function

Returns a `function` that can be used to cancel the callback.
It's recommended to use `apiFetches` instead of using this method directly.

### Setters

 - `api.clone(newConfig)`
 - `api.updateConfig(newConfig)`

### crypt

```js
import { crypt } from 'tinhte-api'

const { algos, encrypt, decrypt } = crypt
const algo = algos[0] // aes128
const data = 'data'
const key = 'key'

const encrypted = encrypt(algo, data, key)
const decrypted = decrypt(algo, encrypted, key)
assert(encrypted === decrypted)
```

### standardizeReqOptions

```js
import { standardizeReqOptions } from 'tinhte-api'

const method = 'POST'
const params = { q: 'foo' }
const uri = 'search'
const uniqueId = standardizeReqOptions({ method, params, uri })
```

[build-badge]: https://img.shields.io/travis/daohoangson/js-tinhte-api/master.svg?style=flat-square
[build]: https://travis-ci.org/daohoangson/js-tinhte-api

[npm-badge]: https://img.shields.io/npm/v/tinhte-api.svg?style=flat-square
[npm]: https://www.npmjs.org/package/tinhte-api

[codecov-badge]: https://img.shields.io/codecov/c/github/daohoangson/js-tinhte-api.svg?style=flat-square
[codecov]: https://codecov.io/gh/daohoangson/js-tinhte-api
