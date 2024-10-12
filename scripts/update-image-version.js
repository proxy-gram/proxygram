#!/usr/bin/env node
const glob = require('glob');
const fs = require('fs');

const packageName = process.env.PACKAGE_NAME;
const packageVersion = process.env.PACKAGE_VERSION;

const oldImageName = RegExp(`ghcr.io/proxy-gram/${packageName}:.*`, 'g');
const files = glob.sync('**/*.y?(a)ml', {
  ignore: ['node_modules/**/*'],
});
console.log(`files`, files);
const filteredFiles = files
  .map((file) => [
    file,
    fs.readFileSync(file, { encoding: 'utf-8' }).toString(),
  ])
  .filter(([filename, file]) => oldImageName.test(file));
console.log('filteredFiles', filteredFiles);
filteredFiles.forEach(([filename, file]) => {
  fs.writeFileSync(
    filename,
    file.replace(
      oldImageName,
      `ghcr.io/proxy-gram/${packageName}:${packageVersion}`
    )
  );
});
