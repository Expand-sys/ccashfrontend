const got = require('got');



async function postUser(name, password){
  try{
    const {body} = await got.post('https://ccash.ryzerth.com/BankF/user',{
        json:{
          name: name,
          init_pass: password
        },
        responseType:'json'

    })
    return body
  } catch(err){
    console.log(err)
  }

  console.log(body)
  return body.value
}



module.exports = { postUser }
