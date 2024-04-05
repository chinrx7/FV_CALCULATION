const axios = require('axios');
const logger = require('./log');
const { cfg, calCfg } = require('./cfg');
const { log } = require('async');

const APIUrl = cfg.APIUrl;
let token;

module.exports.Calculate = async () => {
    token = await getToken();
    //getRPMData();
    //getConsRate();
    getFlowRate();
}

getToken = async () => {
    let token;
    const body = { username: "systemadmin", password: "satsat12345" };
    await axios.post(APIUrl + 'authen', body)
        .then(function (res) {
            token = res.data.Access.Token;
        })

    return token;
}

getRPMData = async () => {
    const TagsCFG = calCfg[0].Tags.RPM;

    let cals = [];

    let Tags = { Tags: [] };
    let Factors =[];


    TagsCFG.forEach(tc => {
        let spt = tc.split(',');

        Tags.Tags.push(spt[0].substring(0,spt[0].length-5));
        Factors.push({ Name: spt[0], Factor: spt[1]});
    });

    let response;

    if (Tags) {
        await axios.post(APIUrl + 'getdatacal', Tags, { headers: { Authorization: token } })
            .then((res) => {
                //console.log(res.data)
                response = res.data;
            });
    }

    if(response){
        response.forEach(r => {
            console.log(r.Name);
            const f = getFactor(Factors,r.Name);
            const cal = (r.Records[1].Value - r.Records[0].Value) /f;

            console.log(cal)

            console.log(r.Records[1].TimeStamp)
        })
    }
}

getFlowRate = async () => {
    const CFG = calCfg;

    const Ip = '-FIN-VTOTAL';
    const Op = '-FOUT-VTOTAL'

    let Req =[];
    CFG.forEach( c => {
        let Tags = [];
        c.Tags.CONS.forEach(e => {
            const FINV = `${c.Vessel}-${e}${Ip}`;
            const FOUT =`${c.Vessel}-${e}${Op}`;
            Tags.push(FINV);
            Tags.push(FOUT);
        })
        Req.push( { Vessel: c.Vessel, Tags:Tags});
    });
    reqFlowData(Req);
}

reqFlowData = async (REQ) => {
    //console.log(REQ)
    REQ.forEach(async r => {
        const body = { Tags :r.Tags};
        await axios.post(APIUrl + 'getdatacal', body, { headers: { Authorization: token } })
            .then((res) => {
                console.log(res.data)
            })
    })
}


// getFlowRate = async () => {
//     let res = [];
//     calCfg.forEach(async c => {
//         const Req = { Vessel : c.Vessel, Engines: [] }
//         c.Tags.CONS.RATE.forEach(tr => {
//             //console.log(tr.substring(4,7))
//             Req.Engines.push(tr.substring(4,7))
//         })
//         await axios.post(APIUrl + 'getflowdata',Req,{ headers: { Authorization: token } })
//             .then(async (r) => {
//                let resdata =  r.data;
               
//                saveFlowData(c.Vessel, Req.Engines ,resdata);
//             })
//     });
// }

// saveFlowData = async (Vessel, Engines ,data) => {
//     let caldata = [];
//     const Vp = Vessel + '-';
//     const IMp = '-FIN-MFLOW';
//     const OMp = '-FOUT-MFLOW';
//     const IDp = '-FIN-DENS';
//     const ODp = '-FOUT-DENS';

//     const FIr = '-FIN-RATE';
//     const FOr = '-FOUT-RATE';
//     const FCr = '-CONS-RATE';

//     Engines.forEach(e => {
//         let FINM, FOUTM, FINDENS, FOUTDENS;
//         let d = new Date;
//         data.forEach(d => {
//             if(`${Vp}${e}${IMp}` === d.Name){
//                 FINM = d.Value;
//             }
//             else if(`${Vp}${e}${OMp}` === d.Name){
//                 FOUTM = d.Value;
//             }
//             else if(`${Vp}${e}${IDp}` === d.Name){
//                 FINDENS = d.Value;
//             }
//             else if(`${Vp}${e}${ODp}` === d.Name){
//                 FOUTDENS = d.Value;
//             }
//         })
//         let FINRate = FINM/(FINDENS/1000);
//         let FOUTRate = FOUTM/(FOUTDENS/1000);
//         let ConsRate = FINRate-FOUTRate;

//         if (Vp === 'A01-') {
//             FINRate = FINRate * 1000;
//             FOUTRate = FOUTRate * 1000;
//             ConsRate = FINRate-FOUTRate;
//         }

//         caldata.push({ Name: `${Vp}${e}${FIr}`, Value: FINRate, TimeStamp: d });
//         caldata.push({ Name: `${Vp}${e}${FOr}`, Value: FOUTRate, TimeStamp: d });
//         caldata.push({ Name: `${Vp}${e}${FCr}`, Value: ConsRate, TimeStamp: d });
//     })
//     console.log(caldata)
//     await axios.post(APIUrl + 'updaterealtime', caldata, { headers: { Authorization: token } });

//     let hisData= [];
//     caldata.forEach(c => {
//         let his = { Name: c.Name, Records: [{ Value: c.Value, TimeStamp: c.TimeStamp }] }
//         hisData.push(his);
//     });
//     await axios.post(APIUrl + 'inserthis', hisData, { headers: { Authorization: token } });
// }


getConsRate = async () => {
    const TagsCons = calCfg[0].Tags.CONS.RATE;
    TagsCons.forEach(async t => {
        const spt = t.split('-');

        const tagPrefix = spt[0] + '-' + spt[1] + '-';
        const TFIN = tagPrefix + 'FIN-VTOTAL';
        const TFOUT = tagPrefix + 'FOUT-VTOTAL';z

        const req = { Tags:[TFIN,TFOUT ]};

        let res;
        await axios.post(APIUrl + 'getdatahour', req, { headers: { Authorization: token } })
            .then((r) => {
                res = r.data;
            })
        console.log(res);
        let FINCONS, FOUTCONS, CONS, TMP;

        res.forEach(r => {
            if(r.Name === TFIN){
                FINCONS = r.Records[1].Value - r.Records[0].Value;
                TMP = r.Records[1].TimeStamp;
            }
            else{
                FOUTCONS = r.Records[1].Value - r.Records[0].Value;
            }
        });

        CONS = FINCONS-FOUTCONS;

        console.log(FINCONS, FOUTCONS, CONS, TMP)

    });
}

getFactor = (Factors, Tag) => {
    let res;
    const Name = Tag + '-CALC';
    Factors.forEach(f => {
        if(f.Name === Name){
            res = f.Factor;
        }
    });
    return res;
}