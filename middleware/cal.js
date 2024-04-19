const axios = require('axios');
const logger = require('./log');
const { cfg, calCfg } = require('./cfg');
const { log } = require('async');

const APIUrl = cfg.APIUrl;
let token;

module.exports.Calculate = async () => {
    token = await getToken();
    //getRPMData();
    await getDistance();
    await getConsRate();
    await getFlowRate();
    await getRPMData();
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

getDistance = async () => {
    let tReq = { Tags: [] }

    calCfg.forEach(c => {
        const tagR = `${c.Vessel}-VES-GPS-SPEED`;
        tReq.Tags.push(tagR);
    });

    if(tReq){
        let data = [];
        await axios.post(APIUrl + 'getdistance', tReq, { headers: { Authorization: token } })
            .then((res) => {
                data.push(res.data);
            })

        await axios.post(APIUrl + 'getmaxspeed', tReq, { headers: { Authorization: token } })
            .then((res) => {
                data.push(res.data);
            })

        await axios.post(APIUrl + 'getavgspeed', tReq, { headers: { Authorization: token } })
            .then((res) => {
                data.push(res.data);
            })

        saveGPS(data)
        
    }
}

saveGPS = async (Data) => {
    let realData = [];
    let hisData = [];

    const tmp = new Date;

    Data[0].forEach(d => {
        const SName = d._id.Name.split('-');
        const val = d.Value/60;
        const Tname = `${SName[0]}-VES-GPS-DIS-TODAY`;
        const rd = { Name: Tname, Value: val, Unit:'mile', TimeStamp:tmp }
        realData.push(rd);
        const hd = { Name: Tname, Records: [ { Value: val, TimeStamp:tmp}] }
        hisData.push(hd);
    })

    
    Data[1].forEach(d => {
        const SName = d._id.Name.split('-');
        const Tname = `${SName[0]}-VES-GPS-SPEED-MAX`;
        const rd = { Name: Tname, Value: d.Value, Unit:'knot', TimeStamp:tmp }
        realData.push(rd);
        const hd = { Name: Tname, Records: [ { Value: d.Value, TimeStamp:tmp}] }
        hisData.push(hd);
    })

    Data[2].forEach(d => {
        const SName = d._id.Name.split('-');
        const Tname = `${SName[0]}-VES-GPS-SPEED-AVG`;
        const rd = { Name: Tname, Value: d.Value, Unit:'knot', TimeStamp:tmp }
        realData.push(rd);
        const hd = { Name: Tname, Records: [ { Value: d.Value, TimeStamp:tmp}] }
        hisData.push(hd);
    })

    if (realData) {
        await axios.post(APIUrl + 'updaterealtime', realData, { headers: { Authorization: token } });
        logger.loginfo('GPS realtime calulated');
    }

    if (hisData) {
        await axios.post(APIUrl + 'inserthis', hisData, { headers: { Authorization: token } });
        logger.loginfo('GPS historian calculated');
    }
}

getRPMData = async () => {

    calCfg.forEach(async cfg => {

        const TagsCFG = cfg.Tags.RPM;


        let Tags = { Tags: [] };
        let Factors = [];


        TagsCFG.forEach(tc => {
            let spt = tc.split(',');

            Tags.Tags.push(spt[0].substring(0, spt[0].length - 5));
            Factors.push({ Name: spt[0], Factor: spt[1] });
        });

        let response;

        if (Tags) {
            await axios.post(APIUrl + 'getdatacal', Tags, { headers: { Authorization: token } })
                .then((res) => {
                    //console.log(res.data)
                    response = res.data;
                    saveRpm(res.data, Factors);
                });
        }
    })
}

saveRpm = async (Data, Factors) => {
    let realData = [];
    let hisData = [];
    const tmp = new Date;

    Data.forEach(d => {
        const f = getFactor(Factors, d.Name);
        const cal = (d.Records[1].Value - d.Records[0].Value) / f;

        const Rname = `${d.Name}-CALC`;

        const real = { Name: Rname, Value: cal, Unit: 'rpm', TimeStamp: tmp };
        const his = { Name: Rname, Records: [{ Value: cal, TimeStamp: tmp }] };

        realData.push(real);
        hisData.push(his);


    });

    // console.log(realData)
    // console.log(hisData)

    if (realData) {
        await axios.post(APIUrl + 'updaterealtime', realData, { headers: { Authorization: token } });
        logger.loginfo('spd rpm realtime calulated');
    }

    if (hisData) {
        await axios.post(APIUrl + 'inserthis', hisData, { headers: { Authorization: token } });
        logger.loginfo('spd rpm historian calculated');
    }
}

getFlowRate = async () => {
    const CFG = calCfg;

    const Ip = '-FIN-VTOTAL';
    const Op = '-FOUT-VTOTAL'

    let Req = [];
    CFG.forEach(c => {
        let Tags = [];
        c.Tags.CONS.forEach(e => {
            const FINV = `${c.Vessel}-${e}${Ip}`;
            const FOUT = `${c.Vessel}-${e}${Op}`;
            Tags.push(FINV);
            Tags.push(FOUT);
        })
        Req.push({ Vessel: c.Vessel, Tags: Tags });
    });

    //console.log(Req)
    reqFlowData(Req);
}

reqFlowData = async (REQ) => {
    //console.log(REQ)
    REQ.forEach(async r => {
        const body = { Tags: r.Tags };
        await axios.post(APIUrl + 'getdatacal', body, { headers: { Authorization: token } })
            .then((res) => {
                calFlowRate(res.data);
            })
    })
}

calFlowRate = async (Data) => {
    //console.log(Data)

    let RealData = [];
    let HisData = [];

    const tmp = new Date;
    Data.forEach(d => {
        const cal = (d.Records[1].Value - d.Records[0].Value) * 60;
        const SName = d.Name.split('-');
        const RName = `${SName[0]}-${SName[1]}-${SName[2]}-RATE`
        //console.log(RName + '  ' + cal)
        const realtime = { Name: RName, Value: cal, Unit: 'L/h', TimeStamp: tmp }
        const his = { Name: RName, Records: [{ Value: cal, TimeStamp: tmp }] }
        RealData.push(realtime);
        HisData.push(his);
    });

    // console.log(RealData)
    // console.log(HisData)


    const conRates = calFlowCons(RealData);
    conRates.forEach(c => {
        RealData.push(c);
        const his = { Name: c.Name, Records: [{ Value: c.Value, TimeStamp: c.TimeStamp }] }
        HisData.push(his);
    })

    //console.log(RealData)

    if (RealData) {
        await axios.post(APIUrl + 'updaterealtime', RealData, { headers: { Authorization: token } })
        logger.loginfo('flowrate realtime data calculated');
    }
    if (HisData) {
        await axios.post(APIUrl + 'inserthis', HisData, { headers: { Authorization: token } })
        logger.loginfo('flowrate historian data calculated')
    }
}

calFlowCons = (Data) => {
    let VName;
    let Cdata = [];
    let EGS = [];
    Data.forEach(d => {
        const SName = d.Name.split('-');
        VName = SName[0];
        if (!EGS.includes(SName[1])) {
            EGS.push(SName[1]);
        }
        const CName = d.Name.replace(`${SName[0]}-`, '');
        const cd = { Name: CName, Value: d.Value, Unit: d.Unit, TimeStamp: d.TimeStamp }
        Cdata.push(cd);
    });
    Cdata.sort();

    let ConsRates = [];
    const tmp = new Date;

    EGS.forEach(e => {
        let FIN = 0;
        let FOUT = 0;
        Cdata.forEach(c => {
            if (c.Name.includes(`${e}-FIN`)) {
                FIN = c.Value;
            }
            if (c.Name.includes(`${e}-FOUT`)) {
                FOUT = c.Value;
            }
        })
        const FRate = FIN - FOUT;
        const crd = { Name: `${VName}-${e}-CONS-RATE`, Value: FRate, Unit: 'L/h', TimeStamp: tmp }
        ConsRates.push(crd);
    });

    return ConsRates
}


getConsRate = async () => {

    const CFG = calCfg;

    const Ip = '-FIN-VTOTAL';
    const Op = '-FOUT-VTOTAL'

    let Req = { Tags: [] };
    CFG.forEach(c => {
        let Tags = [];
        c.Tags.CONS.forEach(e => {
            const FINV = `${c.Vessel}-${e}${Ip}`;
            const FOUT = `${c.Vessel}-${e}${Op}`;
            Tags.push(FINV);
            Tags.push(FOUT);
        })
        Req.Tags.push({ Vessel: c.Vessel, Tags: Tags });
    });

    //console.log(Req)

    if (Req) {
        Req.Tags.forEach(async r => {

            const Tr = { Tags: r.Tags }

            await axios.post(APIUrl + 'getdataday', Tr, { headers: { Authorization: token } })
                .then((res) => {
                    saveContoday(res.data);
                })

        })
    }
}

saveContoday = async (Data) => {
    let realData = [];
    let hisData = [];

    Data.sort();

    //console.log(Data)

    let CData = [];
    let EGS = [];
    let VName;

    Data.forEach(d => {
        const TName = d.Name;
        const SName = TName.split('-');
        VName = SName[0];

        if (!EGS.includes(SName[1])) {
            EGS.push(SName[1]);
        }

        const RName = TName.replace(`${VName}-`, '');
        const CD = { Name: RName, Records: d.Records };
        CData.push(CD);
    });

    CData.sort();
    EGS.sort();

    //console.log(CData, EGS)

    const tmp = new Date;
    if (CData) {
        EGS.forEach(e => {
            const TVIn = `${e}-FIN-VTOTAL`;
            const TVOut = `${e}-FOUT-VTOTAL`;

            const RIn = getArrayRec(CData, TVIn);
            const ROut = getArrayRec(CData, TVOut);

            const VIn = RIn[1].Value - RIn[0].Value;
            const VOut = ROut[1].Value - ROut[0].Value;

            //console.log(VName, e, VIn, VOut)

            const STag = `${VName}-${e}-CONS-TODAY`
            const Cons = VIn - VOut;

            const rd = { Name: STag, Value: Cons, Unit: 'L', TimeStamp: tmp }
            realData.push(rd);
            const hd = { Name: STag, Records: [{ Value: Cons, TimeStamp: tmp }] }
            hisData.push(hd);
        });

        let sumCons = 0;
        realData.forEach(rd => {
            sumCons = sumCons + rd.Value;
        });

        let avgCons = sumCons / 24;

        const sumrd = { Name: `${VName}-VES-CONS-TODAY`, Value: sumCons, Unit: 'L', TimeStamp: tmp }
        const avgrd = { Name: `${VName}-VES-CONS-TODAY-AVG`, Value: avgCons, Unit: 'L', TimeStamp: tmp }

        realData.push(sumrd);
        realData.push(avgrd);

        const sumhd = { Name: `${VName}-VES-CONS-TODAY`, Records: [{ Value: sumCons, TimeStamp: tmp }] }
        const avghd = { Name: `${VName}-VES-CONS-TODAY-AVG`, Records: [{ Value: avgCons, TimeStamp: tmp }] }

        hisData.push(sumhd);
        hisData.push(avghd);

        if (realData) {
            await axios.post(APIUrl + 'updaterealtime', realData, { headers: { Authorization: token } })
            logger.loginfo('consumtion realtime data calculated');
        }

        if (hisData) {
            await axios.post(APIUrl + 'inserthis', hisData, { headers: { Authorization: token } })
            logger.loginfo('consumtion historian data calculated');
        }
    }

}

getArrayRec = (Arr, Key) => {
    let res;
    Arr.forEach(a => {
        if (a.Name === Key) { res = a.Records }
    });
    return res;
}

getFactor = (Factors, Tag) => {
    let res;
    const Name = Tag + '-CALC';
    Factors.forEach(f => {
        if (f.Name === Name) {
            res = f.Factor;
        }
    });
    return res;
}