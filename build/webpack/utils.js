import path from 'path'
import promisify from '../../lib/promisify'
import globModule from 'glob'
import {CLIENT_STATIC_FILES_PATH} from '../../lib/constants'

const glob = promisify(globModule)

export async function getPages (dir, {nextPagesDir, dev, buildId, isServer, pageExtensions}) {
  //获取页面路径
  const pageFiles = await getPagePaths(dir, {dev, isServer, pageExtensions})

  //获取页面实体
  return getPageEntries(pageFiles, {nextPagesDir, buildId, isServer, pageExtensions})
}

export async function getPagePaths (dir, {dev, isServer, pageExtensions}) {
  let pages

  if (dev) {
    //开发模式下，刚开始我们只编译_document.js,_error.js 和 _app.js，其他页面当需要的时候再编译
    // In development we only compile _document.js, _error.js and _app.js when starting, since they're always needed. All other pages are compiled with on demand entries
    pages = await glob(isServer ? `pages/+(_document|_app|_error).+(${pageExtensions})` : `pages/+(_app|_error).+(${pageExtensions})`, { cwd: dir })
  } else {
    //在产品模式下，在页面目录下获取所有页面
    // In production get all pages from the pages directory
    pages = await glob(isServer ? `pages/**/*.+(${pageExtensions})` : `pages/**/!(_document)*.+(${pageExtensions})`, { cwd: dir })
  }

  return pages
}

// Convert page path into single entry
export function createEntry (filePath, {buildId = '', name, pageExtensions} = {}) {
  const parsedPath = path.parse(filePath)
  let entryName = name || filePath

  //index.js文件处理
  // This makes sure we compile `pages/blog/index.js` to `pages/blog.js`.
  // Excludes `pages/index.js` from this rule since we do want `/` to route to `pages/index.js`
  if (parsedPath.dir !== 'pages' && parsedPath.name === 'index') {
    entryName = `${parsedPath.dir}.js`
  }

  //支持的文件拓展名，转变成.js，因为编译输出的问题都会是‘.js’
  // Makes sure supported extensions are stripped off. The outputted file should always be `.js`
  if (pageExtensions) {
    entryName = entryName.replace(new RegExp(`\\.+(${pageExtensions})$`), '.js')
  }

  return {
    name: path.join(CLIENT_STATIC_FILES_PATH, buildId, entryName),
    files: [parsedPath.root ? filePath : `./${filePath}`] // The entry always has to be an array.
  }
}

// Convert page paths into entries
export function getPageEntries (pagePaths, {nextPagesDir, buildId, isServer = false, pageExtensions} = {}) {
  const entries = {}

  for (const filePath of pagePaths) {
    const entry = createEntry(filePath, {pageExtensions, buildId})
    entries[entry.name] = entry.files
  }

  const appPagePath = path.join(nextPagesDir, '_app.js')
  const appPageEntry = createEntry(appPagePath, {buildId, name: 'pages/_app.js'}) // default app.js
  if (!entries[appPageEntry.name]) {
    entries[appPageEntry.name] = appPageEntry.files
  }

  const errorPagePath = path.join(nextPagesDir, '_error.js')
  const errorPageEntry = createEntry(errorPagePath, {buildId, name: 'pages/_error.js'}) // default error.js
  if (!entries[errorPageEntry.name]) {
    entries[errorPageEntry.name] = errorPageEntry.files
  }

  if (isServer) {
    const documentPagePath = path.join(nextPagesDir, '_document.js')
    const documentPageEntry = createEntry(documentPagePath, {buildId, name: 'pages/_document.js'}) // default _document.js
    if (!entries[documentPageEntry.name]) {
      entries[documentPageEntry.name] = documentPageEntry.files
    }
  }

  return entries
}
