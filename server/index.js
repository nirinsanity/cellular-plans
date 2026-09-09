const axios = require('axios')

let createResponse = (statusCode, body) => {
    return {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers" : "Content-Type",
            'Access-Control-Allow-Origin': '*',
            "Access-Control-Allow-Methods": "OPTIONS,GET"
        },
        body: JSON.stringify(body)
    }
}

let fetchJioPlans = async (phoneNumber) => {
    let data

    if (phoneNumber) {
        let cookieUrl = `https://www.jio.com/api/jio-recharge-service/recharge/mobility/number/${phoneNumber}`
        let cookieResp
        try {
            // Jio's edge silently hangs the connection (no response, not even
            // an error) on this endpoint unless a same-site Referer is present.
            cookieResp = await axios.get(cookieUrl, {
                headers: {
                    'Referer': `https://www.jio.com/selfcare/recharge/mobility/plans/?serviceId=${phoneNumber}`,
                },
                timeout: 15000,
            })
        } catch (e) {
            if (e.response && e.response.data.errorMessage === 'NOT_SUBSCRIBED_USER') {
                return {
                    error: 'Please enter a valid Jio number.'
                }
            } else {
                return {
                    error: 'There was an error while checking phone number validity.'
                }
            }
        }
        let headers = cookieResp.headers
        let setCookie = headers['set-cookie']
        let cookie = setCookie.map(c => c.split(';')[0]).join('; ')
    
        let url = `https://www.jio.com/api/jio-recharge-service/recharge/plans/serviceId/${phoneNumber}`
        let resp = await axios.get(url, {
            headers: {
                'Cookie': cookie,
            },
            timeout: 15000,
        })
        data = resp.data
    } else {
        // let url = 'https://www.jio.com/en-in/4g-plans'
        let url = 'https://www.jio.com/api/jio-mdmdata-service/mdmdata/recharge/plans?productType=MOBILITY&billingType=1'
        let resp
        try {
            resp = await axios.get(url)
        } catch (e) {
            return {
                error: 'There was an error while fetching Jio plans.'
            }
        }
        data = resp.data
    }
    return data
}

function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
   return result;
}


let fetchAirtelPlans = async (phoneNumber) => {
    let url
    if (phoneNumber) {
        url = `https://digi-api.airtel.in/airtel-mobility-recharge/prepaid/v1/get/combined/packs?siNumber=${phoneNumber}`
    } else {
        url = `https://digi-api.airtel.in/airtel-mobility-recharge/prepaid/v1/get/combined/packs?circleId=14`
    }

    let resp
    try {
        resp = await axios.get(url, {
            headers: {
                adsHeader: makeid(40),
            }
        })
    } catch (err) {
        return {
            error: err.response.data.message
        }
    }

    if (resp.data.code) {
        return {
            error: resp.data.message
        }
    }

    let data = {
        googlecookie: resp.headers.googlecookie,
        encryptedData: resp.data
    }

    return data
}

async function main (event) {
    let phoneNumber, carrierName

    if (event) {
        if (!event.queryStringParameters) {
            return createResponse(400, {
                error: 'No query string parameters provided'
            })
        }
        phoneNumber = event.queryStringParameters.phoneNumber
        carrierName = event.queryStringParameters.carrier
        if (!(phoneNumber || carrierName)) {
            return createResponse(400, {
                error: 'No phone number or carrier provided'
            })
        }
        if (phoneNumber && !/^[6-9]\d{9}$/.test(phoneNumber)) {
            return createResponse(400, {
                error: 'Please enter a valid 10-digit phone number.'
            })
        }
    }

    let availableCarriers = [
        {
            name: 'jio',
            method: fetchJioPlans,
        },
        {
            name: 'airtel',
            method: fetchAirtelPlans,
        }
    ]
    
    let data
    if (!carrierName) {
        for (let carrier of availableCarriers) {
            data = await carrier.method(phoneNumber)
            if (data.error) {
                continue
            } else {
                carrierName = carrier.name
                break
            }
        }

        if (data.error) {
            return createResponse(400, {
                error: 'Could not find a carrier for the phone number'
            })
        }
    } else {
        let availableCarrier = availableCarriers.find(carrier => carrier.name === carrierName)
        if (!availableCarrier) {
            return createResponse(400, {
                error: 'Invalid carrier name'
            })
        }
        data = await availableCarrier.method(phoneNumber)
        if (data.error) {
            return createResponse(400, {
                error: `Please enter a valid ${carrierName} number`
            })
        }
    }

    let respData = {
        data: data,
        carrier: carrierName
    }
    
    return createResponse(200, respData);
};

exports.handler = main
// main(event)