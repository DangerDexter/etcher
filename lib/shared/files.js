/*
 * Copyright 2018 resin.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const _ = require('lodash')
const path = require('path')
const Bluebird = require('bluebird')
const fs = Bluebird.promisifyAll(require('fs'))

/* eslint-disable lodash/prefer-lodash-method */

/**
 * @summary Check if a file exists
 * @function
 * @public
 *
 * @param {String} fullpath - full path
 * @returns {Boolean}
 *
 * @example
 * console.log('I have pictures: ' + files.exists('~/Pictures'))
 */
exports.exists = (fullpath) => {
  try {
    return Boolean(fs.statSync(fullpath))
  } catch (err) {
    return err.code !== 'ENOENT'
  }
}

/**
 * @summary Get file metadata
 * @function
 * @private
 *
 * @param {String} dirname - directory name
 * @param {String} [basename] - custom basename to append
 * @returns {Object} file metadata
 *
 * @example
 * const file = getFileMetadata('/home/user')
 * console.log(`Is ${file.basename} a directory? ${file.isDirectory}`)
 */
exports.getFileMetadataSync = (dirname, basename = '') => {
  // TODO(Shou): use path.parse object information here
  const fullpath = path.join(dirname, basename)
  const pathObj = path.parse(fullpath)

  // TODO(Shou): this is not true for Windows, figure out Windows hidden files
  const isHidden = pathObj.base.startsWith('.')
  const stats = fs.lstatSync(fullpath)

  return {
    basename: pathObj.base,
    dirname: pathObj.dir,
    fullpath,
    extension: pathObj.ext.replace('.', ''),
    name: pathObj.name,
    isDirectory: stats.isDirectory(),
    isHidden,
    size: stats.size
  }
}

exports.getFileMetadataAsync = (dirname, basename = '') => {
  // TODO(Shou): use path.parse object information here
  const fullpath = path.join(dirname, basename)
  const pathObj = path.parse(fullpath)

  // NOTE(Shou): this is not true for Windows
  const isHidden = pathObj.base.startsWith('.')
  return fs.lstatAsync(fullpath).then((stats) => {
    return {
      basename: pathObj.base,
      dirname: pathObj.dir,
      fullpath,
      extension: pathObj.ext.replace('.', ''),
      name: pathObj.name,
      isDirectory: stats.isDirectory(),
      isHidden,
      size: stats.size
    }
  })
}

exports.getAllFilesMetadataAsync = (dirname, basenames) => {
  return Bluebird.map(basenames, (basename) => {
    return exports.getFileMetadataAsync(dirname, basename)
  })
}

/**
 * @summary Get directory contents of a path
 * @function
 * @private
 *
 * @param {String} dirname - directory path
 * @returns {Promise<Array<Object>>}
 *
 * @example
 * const files = getDirectoryContents('/home/user')
 * files.map((file) => {
 *   if (file.isHidden) {
 *     return `Hidden: ${file.fullpath}`
 *   }
 *
 *   if (file.isDirectory) {
 *     return `Directory: ${file.fullpath}`
 *   }
 *
 *   return `File: ${file.basename} in ${dirname}`
 * })
 */
exports.getDirectoryContents = (dirname) => {
  return fs.readdirAsync(dirname).then((contents) => {
    return Bluebird.map(contents, (basename) => {
      return exports.getFileMetadata(dirname, basename)
    })
  })
}

exports.getDirectory = (dirname) => {
  return fs.readdirAsync(dirname)
}

/**
 * @summary Get all subpaths contained in a path
 * @function
 * @private
 *
 * @param {String} fullpath - path string
 * @returns {Array<Object>} - all subpaths as file objects
 *
 * @example
 * const subpaths = files.subpaths('/home/user/Downloads')
 * console.log(subpaths.map(file => file.fullpath))
 * > [ '/', '/home', '/home/user', '/home/user/Downloads' ]
 */
exports.subpaths = (fullpath) => {
  if (!_.isString(fullpath)) {
    return null
  }

  const dirs = _.compact(_.update(fullpath.split(path.sep), [ '0' ], (root) => {
    return root || '/'
  }))

  return _.map(dirs, (dir, index) => {
    // eslint-disable-next-line no-magic-numbers
    const subdir = dirs.slice(0, index + 1)
    return exports.getFileMetadataSync(path.join(...subdir))
  })
}
