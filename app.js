const schedule = require('node-schedule');

const rule = new schedule.RecurrenceRule();

const job = schedule.scheduleJob('*/1 * * * *', function(){
    console.log(new Date);
})
