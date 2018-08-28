import { join } from "path";
import promisify from "../lib/promisify"; //函数promise化
import fs from "fs";
import webpack from "webpack";
import loadConfig from "../server/config"; //
import { PHASE_PRODUCTION_BUILD, BUILD_ID_FILE } from "../lib/constants";  
import getBaseWebpackConfig from "./webpack";

const access = promisify(fs.access);
const writeFile = promisify(fs.writeFile);

export default async function build(dir, conf = null) {
  const config = loadConfig(PHASE_PRODUCTION_BUILD, dir, conf);
  const buildId = await config.generateBuildId(); // defaults to a uuid
  const distDir = join(dir, config.distDir);

  try {
    await access(dir, (fs.constants || fs).W_OK);
  } catch (err) {
    console.error(
      `> Failed, build directory is not writeable. https://err.sh/zeit/next.js/build-dir-not-writeable`
    );
    throw err;
  }

  try {
    const configs = await Promise.all([
      getBaseWebpackConfig(dir, { buildId, isServer: false, config }),
      getBaseWebpackConfig(dir, { buildId, isServer: true, config })
    ]);
    
    await runCompiler(configs);
    
    //把buildId写入BUILD_ID_FILE文件
    await writeBuildId(distDir, buildId);
  } catch (err) {
    console.error(`> Failed to build`);
    throw err;
  }
}

function runCompiler(compiler) {
  return new Promise(async (resolve, reject) => {
    const webpackCompiler = await webpack(await compiler);
    webpackCompiler.run((err, stats) => {
      if (err) return reject(err);

      const jsonStats = stats.toJson("errors-only");

      if (jsonStats.errors.length > 0) {
        const error = new Error(jsonStats.errors[0]);
        error.errors = jsonStats.errors;
        error.warnings = jsonStats.warnings;
        return reject(error);
      }

      resolve();
    });
  });
}

async function writeBuildId(distDir, buildId) {
  const buildIdPath = join(distDir, BUILD_ID_FILE);
  await writeFile(buildIdPath, buildId, "utf8");
}
