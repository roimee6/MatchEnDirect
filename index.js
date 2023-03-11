const fs = require("fs");

const request = require("node-superfetch");
const HTMLParser = require("node-html-parser");

const path = "http://www.matchendirect.fr";
const savePath = "./matchs.json";

/*

Status: 

0 -> Terminé
1 -> En cours
2 -> A venir

*/

async function getDayMatchs(country, league) {
    const result = {};

    const response = await request.get(path + "/" + country + "/" + league + "/");

    let count = 0;

    const text = response.text;
    const root = HTMLParser.parse(text);

    const dmQuery = root.querySelectorAll(".lm3_eq1");
    const extQuery = root.querySelectorAll(".lm3_eq2");
    const timeQuery = root.querySelectorAll("*[data-matchid] .lm1");
    const statusQuery = root.querySelectorAll("*[data-matchid] .lm2");
    const scoreQuery = root.querySelectorAll(".lm3_score");
    const allPath = root.querySelectorAll(".lm3 a");

    const dm = dmQuery.map(dm => dm.rawText);
    const ext = extQuery.map(ext => ext.rawText);
    const score = scoreQuery.map(score => score.rawText);
    const time = timeQuery.map(time => time.rawText);
    const status = statusQuery.map(status => status.rawText);

    for (const domicile of dm) {
        const actualScore = score[count].replaceAll(" ", "").split("-");

        const st = status[count].slice(5);
        const hour = time[count];

		const eq1 = dm[count];
        const eq2 = ext[count];

        const info = await getSingleMatchInfo(allPath[count].rawAttrs.split("href=\"")[1].split("\" title=\"")[0]);

        const eq1Score = parseInt(actualScore[0]) || 0;
        const eq2Score = parseInt(actualScore[1]) || 0;

        const winner = (eq1Score === eq2Score) ? null : (eq1Score > eq2Score ? eq1 : eq2);

        result[count] = {
            eq1: eq1,
            eq2: eq2,

            day: info.day,
            hour: hour,
            status: st.includes("'") ? 1 : (st.startsWith("Termin") ? 0 : 2),

			cote_eq1: info.cote_eq1,
			cote_n: info.cote_n,
			cote_eq2: info.cote_eq2,

            score: score[count],
            winner: winner
        };

        count++;
    }

    return result;
}

async function getSingleMatchInfo(sub_path) {
	const response = await request.get(path + sub_path);

    const text = response.text;
    const root = HTMLParser.parse(text);

   	const cotes = root.querySelector(".oddListValues").rawText.replace(/ +(?= )/g,"").split(" ");
   	const newCotes = [] 

   	for (const [key, value] of Object.entries(cotes)) {
   		if (value === "/") {
   			newCotes.push(parseFloat(cotes[parseInt(key) + 1]));
   		}
   	}

    return {
    	day: root.querySelector(".info1 a").rawText,
    	cote_eq1: newCotes[0],
    	cote_n: newCotes[1],
    	cote_eq2: newCotes[2]
    }
}

async function save() {
    const list = await getDayMatchs("france", "ligue-1");
    fs.writeFileSync("./matchs.json", JSON.stringify(list, null, 2));

    console.log("[+] Matchs sauvegardés");
}

setInterval(save, 10 * 1000);