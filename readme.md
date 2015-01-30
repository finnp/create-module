# create-module
[![NPM](https://nodei.co/npm/create-module.png)](https://nodei.co/npm/create-module/)

Helper tool for the usual steps to create a module:

## Usage
```
create-module <package>
```

Does the following work-flow:
```sh
mkdir <package>
cd <package>
# create <githubrepo> for <package>
git init
git remote add origin <githubrepo>
echo <readme> > readme.md
npm init
git add readme.md package.json
git commit -m "initial commit"
git push origin master
# set github repo description to package.json description
```

The readme.md is initialised with this template:
```md
#<package>
[![NPM](https://nodei.co/npm/<package>.png)](https://nodei.co/npm/<package>/)

```

