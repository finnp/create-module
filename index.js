var fs = require('fs')
var path = require('path')
var request = require('request')
var exec = require('child_process').exec
var spawn = require('child_process').spawn
var series = require('run-series')
var parallel = require('run-parallel')
var base = 'https://api.github.com'
var registry = 'https://registry.npmjs.org'

module.exports = createModule

var readmeTemplate = '# <package>\n[![NPM](https://nodei.co/npm/<package>.png)](https://nodei.co/npm/<package>/)\n'

function createModule(name, token, cb) {
  var headers = {"user-agent": "npm create-module"}
  var dir = path.join(process.cwd(), name)
  headers['Authorization'] = 'token ' + token
  var input = {
    name: name
  }
  
  var repo

  series([
    checkName,
    createGitHubrepo,
    createDir,
    gitInit,
    createReadme,
    npmInit,
    parallel.bind(null, [gitPush, changeDescription])
    ], function (err) {
      if(err) console.error('Error: ' + err.message)
      else console.log('Done.')
    })

  function checkName(fn) {
    request.head(registry + '/' + name, { headers: headers }, function (err, res) {
      if (err) return fn(err)
      if (res.statusCode === 200) return fn(new Error('"' + name + '" is already taken on npm.'))
      fn(null)
    })
  }

  function createGitHubrepo(cb) {
    console.log('Creating GitHub repo..')
    request.post(base + '/user/repos', {json: input, headers: headers}, function (err, res, repository) {
      if(err) return cb(err)
      repo = repository
      console.log('Created repo', repo.full_name)
      cb(null, repo)
    })
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

  function createReadme(cb) {
    fs.writeFile(path.join(dir, 'readme.md'), readmeTemplate.replace(/<package>/g, name), cb)
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

  function changeDescription (cb) {
    input.description = require(path.join(dir, 'package.json')).description
    var repoUrl = [base, 'repos', repo.full_name].join('/')
    request.patch(repoUrl, { json: input, headers: headers }, cb)
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

}


