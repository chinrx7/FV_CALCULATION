const schedule = require('node-schedule');
const { cfg } = require('./middleware/cfg');
const logger = require('./middleware/log');
const cal = require('./middleware/cal');


logger.loginfo('app start');
const rule = new schedule.RecurrenceRule();

const job = schedule.scheduleJob('*/'+ cfg.Interval +' * * * *', function(){
    logger.loginfo('app tick');
    cal.Calculate();
})
