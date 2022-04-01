async function printEnvVars() {
    const start = Date.now();
    const root = process.env.PWD;
    /**
     * if the env var is not directly used as `process.env.${key}`, then
     * this regex helps identifying cases where it is destructured, like
     * `const { PAYMENTS_FF_URL, PAYMENTS_FF_USERNAME, PAYMENTS_FF_PASSWORD } = process.env;`
     */
    const reKey = /\bprocess\.env\.(\w+)\b/g;
    const reDestructuring = /\{.+\}\s*=(?:\n|\s)*process\.env(?!\.)/g;
    const reSplitDestructuredVars = /\s*,\s*/;
    const reDestructuredVars = /\{(.+)\}/;
    const files = await fastGlob(['!node_modules/**', '**/*.js'], { cwd: root, onlyFiles: true });

    const usedKeys = files.reduce((acc, file) => {
        const content = fs.readFileSync(`${root}${path.sep}${file}`).toString();
        const processEnvKeyMatches = content.match(reKey);
        processEnvKeyMatches?.forEach(match => {
            const keyPos = match.lastIndexOf('.') + 1;
            const key = match.slice(keyPos);
            acc.set(key, process.env[key]);
        });
        const destructuredMatches = content.match(reDestructuring);
        destructuredMatches?.forEach(match => {
            const destructuredVars = reDestructuredVars.exec(match)[1].trim().split(reSplitDestructuredVars);
            destructuredVars.forEach(key => {
                const originalKey = key.split(':')[0].trim();
                acc.set(originalKey, process.env[originalKey]);
            });
        });
        return acc;
    }, new Map());

    const end = Date.now();

    const result = [...usedKeys.entries()]
        .filter(([key]) => process.env[key] !== undefined)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, val]) => `process.env.${key} = ${typeof val === 'string' ? `'${val}'` : val};`);
        // .map(([key]) => key);

    fs.writeFile(`${root}${path.sep}env-vars-used.txt`, result.join('\n').concat('\n'), (err) => {
        if (err) return console.error(err);
    });

    console.log('***** result', result, result.length, end - start);
}
