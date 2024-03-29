const fs = require('fs');
const util = require('util');

module.exports.loginfo = (log) => {

    const fdname = './log';
    if(!fs.existsSync(fdname)){
        fs.mkdirSync(fdname);
    }
    //console.log(log);
    const fdate = new Date().toISOString().slice(0,10);
    //console.log(fdate)

    //console.log(fdate.replace(new RegExp(escapeRegExp(find), '/'),'-'));
    const fileName = './log/' + fdate + '.log';

    const tmp = new Date().toLocaleTimeString();

    const msg = fdate + ' ' + tmp + ' ' + log;

    const log_stdout = process.stdout;

    if(!fs.existsSync(fileName)){
        const log_file = fs.createWriteStream(fileName, {flags : 'w'} );
        log_file.write(util.format(msg) + '\n');

    }
    else{
        fs.appendFileSync(fileName, util.format(msg + '\n'));
    }

    log_stdout.write(util.format(msg) + '\n');
}
