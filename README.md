# ccashfrontend
## shit i have to learn how to document shit but to make things interesting no backspeace
oh okay its still going to boorin be boring as fuck its just going to be more annoying without backspaece


## USeing the fuckier
so to start using this beiutiful perice of shit you are going to need to do some things these thisgns inclugde heading over
to twixie boyis [Github](https://github.com/EntireTwix/CCash) and setting up the api for yourself follow his documentation he it will eb easier to foollow than this mess
thatbeing said goodluck.

from heere is will assume you have set up the api server

if deploying to a serverless application make sure you se t the environmental variables forst. these are as follwos
* BANKAPIURL=your api url including http/s and the trailing slash NOT BANKF
* SECURE=true if you have ssl on your front end host
* PORT=put the port in here
* MONGO=put your mongodb url here
* SETUP=true when you have set the above this just gets rid of the setup page that will show if it equals false or the .env file is not fojound

if you are deploying on a vps then
1. git clone repository
1. run npm install
1. run with your favourite node webserver if you dont know any use [pm2](https://pm2.keymetrics.io/)
1. go through set up at localhost:<port number you set earlier>
1. restart the application and badda bim badda boom you done

## Marketplace

now this is getting complex :sunglasses:
the market place is new and requires monogodb until Jolly finishes his rust api marketplace and i can integrate that
set up is pretty straight forward for now, it should just work:tm: as long as you import all the minecraft blocks into the database as per the item schema,
to do this there is a bit of code at the bottom of ./routes/marketplace.js uncomment that and run that url then comment it again cause you dont want to run it twice, it will messy up your shit. i will make it a one time run route in the future.
