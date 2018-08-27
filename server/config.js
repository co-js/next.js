// @flow
import findUp from 'find-up'
import uuid from 'uuid'
import {CONFIG_FILE} from '../lib/constants'   //'next.config.js'配置文件名

type WebpackConfig = *

type WebpackDevMiddlewareConfig = *

export type NextConfig = {|
  webpack: null | (webpackConfig: WebpackConfig, {dir: string, dev: boolean, isServer: boolean, buildId: string, config: NextConfig, defaultLoaders: {}, totalPages: number}) => WebpackConfig,
  webpackDevMiddleware: null | (WebpackDevMiddlewareConfig: WebpackDevMiddlewareConfig) => WebpackDevMiddlewareConfig,
  poweredByHeader: boolean,
  distDir: string,
  assetPrefix: string,
  configOrigin: string,
  useFileSystemPublicRoutes: boolean,
  generateBuildId: () => string,
  generateEtags: boolean,
  pageExtensions: Array<string>
|}

const defaultConfig: NextConfig = {
  webpack: null,                    //webpack 配置
  webpackDevMiddleware: null,       //webpack dev middleware 中间件配置
  poweredByHeader: true,
  distDir: '.next',   //编译目的目录
  assetPrefix: '',
  configOrigin: 'default',           //标示配置源，比如配置从'next.config.js',则标示为'next.config.js'
  useFileSystemPublicRoutes: true,   //是否使用文件系统路由
  generateBuildId: () => uuid.v4(),  //生成本次编译的Id
  generateEtags: true,                //是否生成Etag for html页面
  pageExtensions: ['jsx', 'js']       //支持的页面拓展名
}

type PhaseFunction = (phase: string, options: {defaultConfig: NextConfig}) => NextConfig

export default function loadConfig (phase: string, dir: string, customConfig?: NextConfig): NextConfig {
  if (customConfig) {
    customConfig.configOrigin = 'server'
    return {...defaultConfig, ...customConfig}
  }
  const path: string = findUp.sync(CONFIG_FILE, {  //从dir目录，并像父级目录查找'next.config.js'
    cwd: dir
  })

  // If config file was found
  if (path && path.length) {
    // $FlowFixMe
    const userConfigModule = require(path)
    const userConfigInitial: NextConfig | PhaseFunction = userConfigModule.default || userConfigModule
    if (typeof userConfigInitial === 'function') {
      return {...defaultConfig, configOrigin: CONFIG_FILE, ...userConfigInitial(phase, {defaultConfig})}
    }

    return {...defaultConfig, configOrigin: CONFIG_FILE, ...userConfigInitial}
  }

  return defaultConfig
}
