#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

function log (message) {
  console.log(`@geut/create-module - ${message}`)
}

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
    const current = fs.lstatSync(path.join(src, files[i]))
    if (current.isDirectory()) {
      copyDir(path.join(src, files[i]), path.join(dest, files[i]))
    } else if (current.isSymbolicLink()) {
      const symlink = fs.readlinkSync(path.join(src, files[i]))
      fs.symlinkSync(symlink, path.join(dest, files[i]))
    } else {
      let filename = files[i]
      if (filename === '_package.json') {
        filename = 'package.json'
      } else if (filename.startsWith('_')) {
        filename = '.' + filename.slice(1)
      }
      const pathname = path.join(dest, filename)
      fs.copyFileSync(path.join(src, files[i]), pathname)
      log(`Copy ${pathname}`)
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

const moduleName = process.argv[2]

if (!moduleName) {
  log('You need to set a name for your module.')
  process.exit(1)
}

const dest = path.join(process.cwd(), process.argv[2] || '.')

try {
  log(`Creating module in ${dest}.`)

  if (dirIsEmpty(dest)) {
    copyDir(path.join(__dirname, 'templates'), dest)

    ;['CONTRIBUTING.md', 'package.json', 'README.md'].forEach(filepath => {
      editFile(path.join(dest, filepath), data => {
        return data.toString('utf-8').replace(/<moduleName>/gi, moduleName)
      })
    })

    editFile(path.join(dest, 'LICENSE'), data => {
      return data.toString('utf-8').replace(/<year>/gi, new Date().getFullYear())
    })

    log('Module created.')
  } else {
    log('Destination directory is not empty.')
  }
} catch (err) {
  log(err.message)
  process.exit(1)
}
