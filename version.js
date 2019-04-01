const childProcess = require('child_process');
const config = require('./package.json');

const cmd = childProcess.spawn(
  "git rev-parse HEAD | sed -e 's/^\\(.\\{8\\}\\).*/\\1/'",
  [],
  { shell: true }
);

cmd.stdout.on('data', data => {
  const gitHash = data.toString().trim();
  console.log(`${config.version}+${gitHash}`);
});
