#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function mkdir (dir) {
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o755 })
  } catch (err) {
    if (err.code !== 'EEXIST') {
      throw err
    }
  }
}

function copyDir (src, dest) {
  mkdir(dest)

  const files = fs.readdirSync(src)

  for (let i = 0; i < files.length; i++) {
    if (['.git', 'create-module.js', 'node_modules'].includes(files[i])) {
      continue
    }

    const current = fs.lstatSync(path.join(src, files[i]))
    if (current.isDirectory()) {
      copyDir(path.join(src, files[i]), path.join(dest, files[i]))
    } else if (current.isSymbolicLink()) {
      const symlink = fs.readlinkSync(path.join(src, files[i]))
      fs.symlinkSync(symlink, path.join(dest, files[i]))
    } else {
      fs.copyFileSync(path.join(src, files[i]), path.join(dest, files[i]))
    }
  }
}

function dirIsEmpty (directory) {
  try {
    const files = fs.readdirSync(directory)
    return !files.length
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err
    }
  }
  return true
}

function editFile (filepath, transform) {
  fs.writeFileSync(filepath, transform(fs.readFileSync(filepath)))
}

const log = message => console.log(`@geut/create-module - ${message}`)

const moduleName = process.argv[2]

if (!moduleName) {
  log('You need to set a name for your module.')
  process.exit(1)
}

const dest = path.join(process.cwd(), process.argv[2] || '.')

try {
  log(`Creating module in ${dest}.`)

  if (dirIsEmpty(dest)) {
    copyDir(__dirname, dest)

    // delete bin prop in package.json
    editFile(path.join(dest, 'package.json'), data => {
      const packageJSON = JSON.parse(data)
      packageJSON.bin = undefined
      return JSON.stringify(packageJSON, 0, 2)
    });

    ['CONTRIBUTING.md', 'package.json', 'README.md'].forEach(filepath => {
      editFile(path.join(dest, filepath), data => {
        return data.toString('utf-8').replace(/create-module/gi, moduleName)
      })
    })

    log('Module created.')
  } else {
    log('Destination directory is not empty.')
  }
} catch (err) {
  log(err.message)
  process.exit(1)
}
