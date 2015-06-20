#!/usr/bin/env node

var ghauth = require('ghauth')

var authOptions = {
  configName : 'create-module'

  // (optional) whatever GitHub auth scopes you require
  , scopes     : ['public_repo']

  // (optional) saved with the token on GitHub
  , note       : 'npm create-module module'

  // (optional)
  , userAgent  : 'npm create-module'
}

if(process.argv.length === 2) {
  console.log('Usage: create-module <name> [--check] [--offline]');
  process.exit()
}

var argv = require('minimist')(process.argv.slice(2));
if (argv._.length < 1) {
  console.log('Usage: create-module <name> [--check] [--offline]');
  process.exit(0);
}

ghauth(authOptions, function (err, authData) {
  if(err) return console.error(err)
  require('./')(process.argv[2], authData.token, argv, function (err) {
    if(err) return console.error(err)
  })

})
  
