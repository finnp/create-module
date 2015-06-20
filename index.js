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

function createModule(name, token, options, cb) {
  var headers = {"user-agent": "npm create-module"}
  var dir = path.join(process.cwd(), name)
  headers['Authorization'] = 'token ' + token
  var input = {
    name: name
  }

  var repo,
      processList = [
                      createDir,
                      gitInit,
                      createReadme,
                      createGitignore,
                      npmInit,
                      gitAddAndCommit
                    ]
  // Was the offline flag provided?
  if (options.offline === undefined) {
    // The offline flag was not provided, hit npm and github
    processList = processList.concat([createGitHubrepo, gitRemoteAddOrigin])
    processList.push(parallel.bind(null, [gitPush, changeDescription]))
  }
  if (options.check !== undefined) {
    // Check flag was provided, check npm
    console.log('Checking npm for pre-existing module name')
    processList = [checkName].concat(processList)
  }

  series(processList, function (err) {
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
    fs.mkdir(dir, function() {
      process.chdir(dir);
      cb()
    })
  }

  function gitInit(cb) {
    console.log('Initialize git..')
    exec('git init', function (err, stdo, stde) {
      process.stderr.write(stde)
      cb(err)
    })
  }

  function gitRemoteAddOrigin(cb) {
    console.log('Adding remote origin')
    exec('git remote add origin ' + repo.clone_url, {cwd: dir}, function (err, stdo, stde) {
      process.stderr.write(stde)
      cb(err)
    })
  }

  function createReadme(cb) {
    console.log('Create readme.md...')
    fs.writeFile(path.join(dir, 'readme.md'), readmeTemplate.replace(/<package>/g, name), cb)
  }

  function createGitignore(cb) {
    console.log('Create .gitignore...')
    fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\n', cb)
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

  function gitAddAndCommit(cb){
    console.log('Adding all and committing all')
    var finishGit = [
       'git add --all',
       'git commit -m "Initial commit"'
     ]
     exec(finishGit.join(' && '), {cwd: dir}, function (err, stdo, stde) {
       process.stderr.write(stde)
       cb(err)
     })
  }

  function gitPush(cb) {
    console.log('Push to GitHub: ' + dir)
    exec('git push origin master', {cwd: dir}, function (err, stdo, stde) {
      process.stderr.write(stde)
      cb(err)
    })
  }

}
