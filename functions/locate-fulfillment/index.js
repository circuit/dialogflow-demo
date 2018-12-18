'use strict';

const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const fetch = require('node-fetch');

const DOMAIN = 'circuitsandbox.net';

// Get your own credentials, see https://circuit.github.io/, then get a token using those credentials, e.g. via
// curl https://circuitsandbox.net/oauth/token -d 'grant_type=client_credentials&client_id=<client_id>&client_secret=<client_secret>&scope=READ_CONVERSATIONS,READ_USER'
const TOKEN = '3381b161fdb744a39b5354cc41604f52';

exports.locateFulfillment = (request, response) => {
  const agent = new WebhookClient({ request, response });
  // console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  // console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

  function welcome(agent) {
    agent.add(`Welcome to the Circuit fulfillment demo.`);
  }

  async function locate(agent) {
    // Search user
    let res = await fetch(`https://${DOMAIN}/rest/users?name=${agent.parameters.name}`, {
      headers: { 'Authorization': 'Bearer ' + TOKEN }
    });
    res = await res.json();

    if (res.length === 1) {
      // One user found. Lookup his/her presence
      const user = res[0];
      res = await fetch(`https://${DOMAIN}/rest/users/presence?userIds=${user.userId}`, {
        headers: { 'Authorization': 'Bearer ' + TOKEN }
      });
      res = await res.json();
      const presence = res[0];

      if (presence.locationText) {
        agent.add(`${user.displayName} is ${presence.state.toLowerCase()} and currently in ${presence.locationText}`);
        agent.add(new Card({
          title: presence.locationText,
          imageUrl: await getImage(presence.locationText),
          //text: ,
          accessibility_text: presence.locationText, // required to work on some devices such as Smart Display
          buttonText: 'Show map',
          buttonUrl: `https://www.google.com/maps/place/${presence.latitude},${presence.longitude}`
        }));
      } else {
        agent.add(`${user.displayName} is ${presence.state}`);
      }
    } else if (res.length > 1) {
      agent.add(`Found ${res.length} users called ${agent.parameters.name}. Try using the full name.`);
    } else {
      agent.add(`I cannot find ${agent.parameters.name}.`);
    }
  }

  async function getImage(q) {
    try {
      let res = await fetch(`https://api.qwant.com/api/search/images?count=1&q=${q}&t=images&safesearch=1&uiv=4`);
      res = await res.json();
      return res.data.result.items[0].media.replace('http:', 'https:');
    } catch (err) {
      console.error('getImage error', err);
    }
  }

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('Default Welcome Intent', welcome);
  intentMap.set('Locate', locate);
  agent.handleRequest(intentMap);
};
