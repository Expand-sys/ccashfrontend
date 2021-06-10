const got = require("got");

async function postUser(name, password) {
  console.log(process.env.BANKAPIURL);
  try {
    const { body } = await got.post(
      process.env.BANKAPIURL + "BankF/user/" + name,
      {
        headers: {
          Password: password,
        },
        responseType: "json",
      }
    );
    return body;
  } catch (err) {
    console.log(err);
  }
}

module.exports = { postUser };
