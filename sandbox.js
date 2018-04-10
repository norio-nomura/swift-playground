'use strict';

const Sandbox = function(host_root_dir, root_dir, temp_dir, filename, toolchain_version, command, options, code, timeout) {
  this.host_root_dir = host_root_dir;
  this.root_dir = root_dir;
  this.temp_dir = temp_dir;
  this.filename = filename;
  this.toolchain_version = toolchain_version;
  this.command = command;
  this.options = options;
  this.code = code;
  let to = parseInt(timeout)
  if (isNaN(to)) {
    to = 60
  } else if (to > 600) {
    to = 600
  }
  this.timeout = to;
}

Sandbox.prototype.run = function(success) {
  const sandbox = this;
  this.prepare(function() {
    sandbox.execute(success);
  });
}

Sandbox.prototype.prepare = function(success) {
  const exec = require('child_process').spawnSync;
  const fs = require('fs');
  const path = require('path');
  const sandbox = this;

  const work_dir = path.join(this.root_dir, this.temp_dir);
  exec('mkdir', [work_dir]);
  exec('cp', [path.join(this.root_dir, "script.sh"), work_dir])
  exec('chmod', ['777', work_dir])

  fs.writeFile(path.join(work_dir, sandbox.filename), sandbox.code, function(error) {
    if (error) {
      console.log(error);
    } else {
      success();
    }
  });
}

Sandbox.prototype.execute = function(success) {
  const execFile = require('child_process').execFile;
  const execSync = require('child_process').spawnSync;
  const fs = require('fs');
  const path = require('path');

  const sandbox = this;
  let counter = 0;

  execFile(path.join(this.root_dir, "run.sh"), [this.timeout, '-v', path.join(this.host_root_dir, this.temp_dir) + ':/usercode', '-v', path.join(this.host_root_dir, 'vendor') + ':/vendor:ro', 'norionomura/swiftlint:swift-' + this.toolchain_version, 'sh', '/usercode/script.sh', this.command, this.options], (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.log(`stderr: ${stderr}`);
  });

  const intid = setInterval(function() {
    counter = counter + 1;
    const work_dir = path.join(sandbox.root_dir, sandbox.temp_dir)
    fs.readFile(path.join(work_dir, 'completed'), 'utf8', function(error, data) {
      if (error && counter < sandbox.timeout) {
        return;
      }
      const version = fs.readFileSync(path.join(work_dir, 'version'), 'utf8');
      if (counter < sandbox.timeout) {
        fs.readFile(path.join(work_dir, 'errors'), 'utf8', function(error, errorlog) {
          if (!errorlog) {
            errorlog = ""
          }
          success(data, errorlog, version);
        });
      } else {
        fs.readFile(path.join(work_dir, 'errors'), 'utf8', function(error, errorlog) {
          if (!errorlog) {
            errorlog = 'Timed out.'
          }
          success(data, errorlog, version)
        });
      }
      execSync('rm', ['-rf', work_dir]);
      clearInterval(intid);
    });
  }, 1000);
}

module.exports = Sandbox;
