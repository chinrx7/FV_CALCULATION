const schedule = require('node-schedule');
const { cfg } = require('./middleware/cfg');
const logger = require('./middleware/log');
const cal = require('./middleware/cal');



logger.loginfo('app start');
//cal.Calculate();
const rule = new schedule.RecurrenceRule();

const job = schedule.scheduleJob('*/' + cfg.Interval + ' * * * *', function () {
    logger.loginfo('app tick');
    try {
        cal.Calculate();
    }
    catch (ex) {
        logger.loginfo`app ${ex}`
    }
})
