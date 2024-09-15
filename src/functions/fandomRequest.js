import schedule from 'node-schedule';
import { bot } from '../connections/fandom.js';

let result;
let success = false;
async function createJob(){
    schedule.scheduleJob('fandom', '0 45 0-23 * * *', async function(){
        let attempts = 0, maxAttempts = 3;
        success = false;
        while(!success && attempts < maxAttempts){

            // Wait 0/10/100 sec
            await new Promise(r => setTimeout(r, 1000 * Math.pow(10, attempts)));

            try {
                result = (await (await bot).request({
                    action: `cargoquery`,
                    tables: `MatchSchedule=m, Teams=t1, Teams=t2, Tournaments=t, Leagues=l`,
                    fields: `m.Team1, m.Team2, t1.Short=t1Short, t1.Image=t1Image, t2.Short=t2Short, t2.Image=t2Image, m.DateTime_UTC=datetime, m.BestOf, m.MatchId, l.League_Short=LeagueShort, l.League`,
                    join_on: `m.Team1=t1.Name, m.Team2=t2.Name, t.OverviewPage=m.OverviewPage, t.League=l.League`,
                    where: `m.DateTime_UTC > NOW() AND m.DateTime_UTC < DATE_ADD(NOW(), INTERVAL 24 HOUR) AND (m.Team1 <> 'TBD' OR m.Team2 <> 'TBD')`,
                    order_by: `m.DateTime_UTC`,
                    limit: 200
                })).cargoquery.map(m => m.title);

                for(let r of result) {
                    if(r.t1Image != null){
                        const teamLogoLink1 = (await (await bot).query({
                            action: `query`,
                            format: `json`,
                            titles: `File:${r.t1Image.replaceAll(" ", "_")}`,
                            prop: `imageinfo`,
                            iiprop: `url`
                        })).query.pages[0].imageinfo[0].url;

                        r.t1Image = teamLogoLink1;
                    }

                    if(r.t2Image != null) {
                        const teamLogoLink2 = (await (await bot).query({
                            action: `query`,
                            format: `json`,
                            titles: `File:${r.t2Image.replaceAll(" ", "_")}`,
                            prop: `imageinfo`,
                            iiprop: `url`,
                            iiurlheight: `150`
                        })).query.pages[0].imageinfo[0].url;
    
                        r.t2Image = teamLogoLink2;
                    }
                }

                success = true;
            } catch(e) {
                attempts++;

                console.error(`Attempt ${attempts} failed`);
                console.error(e.message);

                if(attempts >= maxAttempts) {
                    console.error(`max attempts reached. Retrying in 1 hour`);
                }
            }
        }
    });
}

function getResult(){
    return {
        result, 
        success
    };
}

export const request = { createJob, getResult}