import { glob } from 'glob';
import * as fs from 'node:fs';

const packageVersion = process.env.PACKAGE_VERSION;

if (!packageVersion) {
  console.error('env.PACKAGE_VERSION is required');
  process.exit(1);
}

const files = glob.sync('**/deployment.y?(a)ml', {
  ignore: ['node_modules/**/*'],
});

files.forEach((filename) => {
  const oldImageName = /ghcr\.io\/proxy-gram\/(\w+):.*/g;
  const fileContent = fs
    .readFileSync(filename, { encoding: 'utf-8' })
    .toString();
  const regexResult = oldImageName.exec(fileContent);
  if (!regexResult?.[1]) {
    return;
  }

  fs.writeFileSync(
    filename,
    fileContent.replace(
      oldImageName,
      `ghcr.io/proxy-gram/${regexResult[1]}:${packageVersion}`
    )
  );
});
