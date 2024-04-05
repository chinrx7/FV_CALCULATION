const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./configure/config.json', 'utf8'));
const calCfg = JSON.parse(fs.readFileSync('./configure/cal.json', 'utf8'));

exports.cfg = config;
exports.calCfg = calCfg;