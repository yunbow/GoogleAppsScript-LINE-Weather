/**
 * 天気予報BOT
 * 
 * OpenWeatherMap: https://openweathermap.org/current
 * - city id: http://bulk.openweathermap.org/sample/
 * - Weather Conditions: https://openweathermap.org/weather-conditions
 */
const SSID_WEATHER = '*****'; // WEATHERのスプレッドシートのID
const SSN_WEATHER = '*****'; // WEATHERのスプレッドシートのシート名
const LINE_NOTIFY_TOKEN = '*****'; // LINE NOTIFY用のアクセストークン
const WEATHER_API_KEY = '*****'; // OpenWeatherMapのAPIキー
const CITY_ID = 1850147; // 東京
const ABSOLUTE_ZERO = -273.15; // 絶対零度

/**
 * メイン処理
 */
function main() {
    try {
        let itemList = [];
        let spreadsheet = SpreadsheetApp.openById(SSID_WEATHER);
        let sheet = spreadsheet.getSheetByName(SSN_WEATHER);
        let lastRow = sheet.getLastRow();
        if (0 < lastRow) {
            itemList = sheet.getRange(1, 1, sheet.getLastRow(), 5).getValues();
            itemList = itemList.map((row) => {
                return {
                    timeStamp: row[0],
                    weatherId: row[1],
                    tempMax: row[2],
                    tempMin: row[3],
                    humidity: row[4],
                }
            });
        }

        let res = getWeatherInfo();
        let weatherList = [];
        let tempMax;
        let tempMin;

        let message = `\n今日の天気だよ!!\n\n`;

        for (let i in res.list) {
            let item = res.list[i];
            let dt = new Date(item.dt_txt);
            dt.setHours(dt.getHours() + 9);
            let timeStamp = Utilities.formatDate(dt, 'Asia/Tokyo', `yyyy/MM/dd HH:mm:ss`);
            tempMax = item.main.temp_max;
            tempMin = item.main.temp_min;

            if (parseInt(i) == 0) {
                message += `時刻: ${timeStamp}\n`;
                message += `天気: ${LanguageApp.translate(item.weather[0].description, 'en', 'ja')}\n`;
                message += `最高気温: ${Math.round(tempMax + ABSOLUTE_ZERO)}℃\n`;
                message += `最低気温: ${Math.round(tempMin + ABSOLUTE_ZERO)}℃\n`;
                message += `湿度: ${item.main.humidity}％\n\n`;
                sheet.appendRow([timeStamp, item.weather[0].id, tempMax, tempMin, item.main.humidity]);
            }
            if (parseInt(i) < 6) {
                weatherList.push(item.weather[0].id);
            }
        }

        let isRainGear = false;
        for (let i in weatherList) {
            let weather = weatherList[i];
            if (weather < 700) {
                isRainGear = true;
            }
        }
        if (isRainGear) {
            message += `※今日は傘を持っていきましょう!!\n`;
        }

        if (0 < itemList.length) {
            let oldItem = itemList[itemList.length - 1];
            if (3 < (tempMax - oldItem.tempMax)) {
                message += `※今日は暑くなります!!\n`;
            }
            if (3 < (oldItem.tempMin - tempMin)) {
                message += `※今日は寒くなります!!\n`;
            }
        }
        sendLineNotify(message);

    } catch (e) {
        console.error(e.stack);
    }
}

/**
 * 天気予報を取得する
 */
function getWeatherInfo() {
    let url = `http://api.openweathermap.org/data/2.5/forecast?id=${CITY_ID}&appid=${WEATHER_API_KEY}`;
    let options = {
        'method': 'get',
        'validateHttpsCertificates': false
    };
    let response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText('UTF-8'));
}

/**
 * LINEにメッセージを送信する
 * @param {String} message メッセージ 
 */
function sendLineNotify(message) {
    let url = 'https://notify-api.line.me/api/notify';
    let options = {
        'method': 'post',
        'headers': {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'Authorization': `Bearer ${LINE_NOTIFY_TOKEN}`
        },
        'payload': `message=${message}`
    };
    let response = UrlFetchApp.fetch(url, options);
    return JSON.parse(response.getContentText('UTF-8'));
}