const { CCashClient } = require("ccash-client-js");

async function postUser(name, password) {
  const client = new CCashClient(process.env.BANKAPIURL);
  console.log(process.env.BANKAPIURL);
  try {
    return await client.addUser(name, password);
  } catch (err) {
    console.log(err);
  }
}

module.exports = { postUser };
