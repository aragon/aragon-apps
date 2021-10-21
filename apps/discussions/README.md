# Contextual Aragon Discussions

This repository is the starting point of contextual aragon discussions, it's composed of a few core components that a developer wishing to incorporate discussions needs to be aware of:

1. Contextual discussion smart contract - in charge of storing all the DAO's discussion data. Each discussion post is represented as an IPFS content hash to keep storage costs as efficient as possible.
2. `DiscussionsWrapper` component - a redux-like provider that provides discussion data through React context to all nested children and grandchildren.
3. `Discussion` component - a discussion thread component that displays all the discussion posts of a specific discussion thread and allows the user to take specific actions like post, hide, and revise.

The purpose of this readme is to document how all the moving parts are working together, how a developer could use this code in their own DAO, and what still needs to be done.

### Prerequisites

You first need to be running your contextual discussioned app + [aragon client](https://github.com/aragon/aragon) with a very specific version of aragon.js. You will need a version with the following 3 features:

1. [External transaction intents](https://github.com/aragon/aragon.js/pull/328)
2. [Ability to get information about the DAO's installed apps](https://github.com/aragon/aragon.js/pull/332)
3. [New forwarder API changes](https://github.com/aragon/aragon.js/pull/314)

We'd recommend running the latest master branch of the [aragon client](https://github.com/aragon/aragon).

These features should be included by default in aragon.js and aragon client come October 2019.

### Setup

##### Including the discussions app in your repo

If there is more demand for including contextual discussions in applications, we'll rip out the discussions app in this repo and publish it as a node module(s). For now, you should just copy and paste the `/apps/discussions` directory into your app, and look at the `apps/planning-suite-kit` as a reference for deploying it as a dependency for your own app.

##### Installing the discussions app

Here's a function we use to install the discussion app within the DAO:

```
function createDiscussionApp(address root, ACL acl, Kernel dao) internal returns (DiscussionApp app) {
    bytes32 appId = apmNamehash("discussions");
    app = DiscussionApp(dao.newAppInstance(appId, latestVersionAppBase(appId)));
    app.initialize();
    acl.createPermission(ANY_ENTITY, app, app.DISCUSSION_POSTER_ROLE(), root);
}
```

##### Setting up the discussions app as a forwarder

Every action that gets forwarded through the discussions app creates a new discussion thread. So we need to add the discussions app to the forwarding chain of any action we want to trigger a discussion. In this example, we have a new discussion created _before_ a new dot-vote gets created:

```
acl.createPermission(discussions, dotVoting, dotVoting.ROLE_CREATE_VOTES(), voting);
```
If discussions is the only app granted the `ROLE_CREATE_VOTES` permission, every new vote will have its own discussion thread.

When you send an intent to trigger the action that gets forwarded through the discussions app, you should see the appropriate radspec in the aragon client transaction confirmation panel.

##### Displaying and adding to discussion threads in the application frontend

You should first take the `discussions/app/modules/Discussions.js` component, and wrap your entire react tree inside of it. You need to pass your instance of [`AragonApp`](https://hack.aragon.org/docs/api-js-ref-api#examples) to it as well

```js
import { useAragonApi } from '@aragon/api-react'
import Discussions from 'discussions/app/modules/Discussions'

const App = () => {
  const { api } = useAragonApi()
  return {
    <Discussions app={api}>
      {...}
    </Discussions>
  }
}
```

Then, wherever you want to render a contextual discussion thread, you render the `Discussion` component, passing in a `discussionId` and the `ethereumAddress` of the logged in user:

```js
import Discussion from 'discussions/app/modules/Discussion'

const ComponentThatRendersDiscussionThread = ({ discussionId, ethereumAddress }) => {
  return {
    <Discussion discussionId={discussionId} ethereumAddress={ethereumAddress} />
  }
}

```

Where does the `discussionId` come from? It's basically the unique identifier used by the Discussions App to keep track off all the threads it has created.

This id will be returned to your app context as a `ForwardedActions` event, similar to an external contract event, so it's important that it gets passed into the `<Discussion />` component successfully.

###### DiscussionId In-depth

The `discussionId` is a `Number` that represents the relative order in which this specific transaction intent was forwarded through the discussion app. For example, let's say you had 5 transactions that were forwarded through the discussion app - the discussionId relative to these 5 transactions is the order in which they occured. It could be:

1, 2, 3, 4, 5 or 14, 15, 16, 19, 20. The only thing that matters is the _order_ the transactions occured. The discussion app will figure out the rest for you.


##### How this all works under the hood

The discussions app generates a new discussion thread every time an action gets successfully forwarded. When the discussions app script loads, it uses the latest [forwarder api](https://github.com/aragon/aragon.js/pull/314) to [keep track of which discussion threads belong to which app](https://github.com/AutarkLabs/planning-suite/blob/discussions/apps/discussions/app/script.js#L36).

On the frontend, the `Discussions.js` component senses when the handshake has been established between the front-end and client. [Once it does](https://github.com/AutarkLabs/planning-suite/blob/discussions/apps/discussions/app/modules/Discussions.js#L26), it initializes a new instance of the [`DiscussionApi`](https://github.com/AutarkLabs/planning-suite/blob/discussions/apps/discussions/app/modules/DiscussionsApi.js).

The discussionApi is responsible for [keeping track of all the discussion threads and posts for your app](https://github.com/AutarkLabs/planning-suite/blob/discussions/apps/discussions/app/modules/DiscussionsApi.js#L136). Its also equipped with methods to [post](https://github.com/AutarkLabs/planning-suite/blob/discussions/apps/discussions/app/modules/DiscussionsApi.js#L162), [hide](https://github.com/AutarkLabs/planning-suite/blob/discussions/apps/discussions/app/modules/DiscussionsApi.js#L197), and [revise](https://github.com/AutarkLabs/planning-suite/blob/discussions/apps/discussions/app/modules/DiscussionsApi.js#L175) Discussion Posts.

