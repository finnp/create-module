var fs = require('fs')
var path = require('path')
var request = require('request')
var exec = require('child_process').exec
var spawn = require('child_process').spawn
var base = 'https://api.github.com'

module.exports = createModule

var readmeTemplate = '#<package>\n[![NPM](https://nodei.co/npm/<package>.png)](https://nodei.co/npm/<package>/)\n'

function createModule(name, token, cb) {
  var headers = {"user-agent": "npm create-module"}
  var dir = path.join(process.cwd(), name)
  headers['Authorization'] = 'token ' + token
  var input = {
    name: name // TODO: description, see https://developer.github.com/v3/repos/#create
  }

  console.log('Creating GitHub repo..')
  request.post(base + '/user/repos', {json: input, headers: headers}, function (err, res, repo) {
    if(err) return cb(err)
    console.log('Created repo', repo.full_name)
    createDir(function (err) {
      if(err) return cb(err)
      gitInit(function () {
        if(err) return cb(err)
        fs.writeFile(path.join(dir, 'readme.md'), readmeTemplate.replace(/<package>/g, name), function (err) {
          if(err) return cb(err)
          npmInit(function (err) {
            if(err) return cb(err)

            var cnt = 2
            function done (err) {
              if (--cnt === 0) cb(err)
            }

            // git push and change github description in parallel
            gitPush(done)
            changeDescription(done)
          })
        })
      })
    })

    function changeDescription (cb) {
      input.description = require(path.join(dir, 'package.json')).description
      var repoUrl = [base, 'repos', repo.full_name].join('/')
      request.patch(repoUrl, { json: input, headers: headers }, cb)
    }

    function createDir(cb) {
      console.log('Creating directory ' + dir)
      fs.mkdir(dir, cb)
    }
    
    function gitInit(cb) {
      console.log('Initialize git..')
      exec('git init && git remote add origin ' + repo.clone_url, {cwd: dir}, function (err, stdo, stde) {
        process.stderr.write(stde)
        cb(err)
      })
    }
    
    function gitPush(cb) {
      console.log('Commit and push to GitHub')
      var finishGit = [
        'git add package.json readme.md',
        'git commit -m "Initial commit"',
        'git push origin master'
      ]
      exec(finishGit.join(' && '), {cwd: dir}, function (err, stdo, stde) {
        process.stderr.write(stde)
        cb(err)
      })
    }

    function npmInit(cb) {
      var npmInit = spawn('npm', ['init'], {cwd: dir, stdio: [process.stdin, 'pipe', 'pipe']})
      npmInit.stdout.pipe(process.stdout)
      npmInit.stderr.pipe(process.stderr)
      npmInit.on('close', function (code) {
        var err
        if(code > 0) err = new Error('Failed npm init')
          cb(err)
      })
    }  
  })
}


