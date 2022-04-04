const fs = require("fs");
const path = require("path");
const fastGlob = require("fast-glob");

async function execute() {
  const start = Date.now();
  const root = process.cwd();
  /**
   * in addition to env vars directly used as `process.env.${key}`, they can also be destructured from `process.env`.
   * so this regex helps identifying cases where it is destructured, like
   * `const { APP_PORT, DB_URL } = process.env;`
   */
  const reKey = /\bprocess\.env\.(\w+)\b/g;
  const reDestructuring = /\{.+\}\s*=(?:\n|\s)*process\.env(?!\.)/g;
  const reSplitDestructuredVars = /\s*,\s*/;
  const reDestructuredVars = /\{(.+)\}/;
  const files = await fastGlob(["!node_modules/**", "**/*.js"], {
    cwd: root,
    onlyFiles: true,
  });

  const usedKeys = files.reduce((acc, file) => {
    const content = fs.readFileSync(`${root}${path.sep}${file}`).toString();
    const processEnvKeyMatches = content.match(reKey);
    processEnvKeyMatches?.forEach((match) => {
      const keyPos = match.lastIndexOf(".") + 1;
      const key = match.slice(keyPos);
      acc.set(key, process.env[key]);
    });
    const destructuredMatches = content.match(reDestructuring);
    destructuredMatches?.forEach((match) => {
      const destructuredVars = reDestructuredVars
        .exec(match)[1]
        .trim()
        .split(reSplitDestructuredVars);
      destructuredVars.forEach((key) => {
        const originalKey = key.split(":")[0].trim();
        acc.set(originalKey, process.env[originalKey]);
      });
    });
    return acc;
  }, new Map());

  const end = Date.now();

  const result = [...usedKeys.entries()]
    .filter(([key]) => process.env[key] !== undefined)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(
      ([key, val]) =>
        `process.env.${key} = ${typeof val === "string" ? `'${val}'` : val};`
    );
  // .map(([key]) => key);

  fs.writeFile(
    `${root}${path.sep}env-vars.txt`,
    result.join("\n").concat("\n"),
    (err) => {
      if (err) return console.error(err);
    }
  );

  console.log("env-vars", result, result.length, end - start);
}

module.exports = {
  execute,
};
