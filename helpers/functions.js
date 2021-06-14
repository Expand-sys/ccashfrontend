const { CCashClient } = require("ccash-client-js");

const client = new CCashClient(process.env.BANKAPIURL);

async function postUser(name, password) {
  console.log(process.env.BANKAPIURL);
  try {
    return await client.addUser(name, password);
  } catch (err) {
    console.log(err);
  }
}

module.exports = { postUser };
