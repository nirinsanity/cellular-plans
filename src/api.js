import CryptoJS from 'crypto-js'

let outputPlans = []
let baseUrl = 'https://npcf8q2g3l.execute-api.ap-south-1.amazonaws.com/default/fetchCellularPlans'

let organiseJioPlans = (data) => {
    let planCategories = data.planCategories
    // let plan = planCategories[0].subCategories[0].plans[0]
    planCategories.forEach(planCategory => {
        let subCategories = planCategory.subCategories
        subCategories.forEach(subCategory => {
            let plans = subCategory.plans
            plans.forEach(plan => {
                // let planName = plan.planName
                let primeData = plan.primeData
                let totalCost = parseInt(plan.amount)

                let planGbPerDay
                let planGb = 0
                if (primeData.offerBenefits1 && !primeData.offerBenefits2) {
                    if (primeData.offerBenefits1.includes('/')) {
                        planGbPerDay = parseFloat(primeData.offerBenefits1.split(' ')[0])
                    } else if (primeData.offerBenefits1.includes(' ')){
                        planGb = parseFloat(primeData.offerBenefits1.split(' ')[0])
                    }
                } else if (primeData.offerBenefits1 && primeData.offerBenefits2) {
                    if (primeData.offerBenefits2.includes('/')) {
                        planGbPerDay = parseFloat(primeData.offerBenefits1)
                    } else {
                        planGb = parseFloat(primeData.offerBenefits1)
                    }
                } else {
                    if (primeData.offerBenefits2.includes('/')) {
                        planGbPerDay = parseFloat(primeData.offerBenefits2.split(' ')[0])
                    } else if (primeData.offerBenefits2.includes(' ')){
                        planGb = parseFloat(primeData.offerBenefits2.split(' ')[0])
                    }

                }
                if (primeData.offerBenefits5) {
                    planGb += parseFloat(primeData.offerBenefits5.split(' ')[0])
                }

                let planDays
                if (primeData.offerBenefits3 && primeData.offerBenefits4) {
                    planDays = parseInt(primeData.offerBenefits3)
                } else if (primeData.offerBenefits4 && !primeData.offerBenefits3) {
                    planDays = parseInt(primeData.offerBenefits4.split(' ')[0])
                }
                
                let costPerDay = totalCost / planDays
                let totalGb = (planGbPerDay * planDays) + planGb
                let gbPerDay = totalGb / planDays
                let costPerGb = totalCost / totalGb

                if (!gbPerDay) { return }
                
                outputPlans.push({
                    // planName,
                    id: plan.id,
                    totalCost,
                    planGbPerDay,
                    planGb,
                    planDays,
                    costPerDay,
                    totalGb,
                    costPerGb,
                    gbPerDay,
                })
            })
        })
    })
}

let organiseAirtelPlans = (respData) => {

    let key = respData.googlecookie
    let encryptedData = respData.encryptedData

    let decryptedData = CryptoJS.DES.decrypt(encryptedData.replace('"', ""), CryptoJS.enc.Utf8.parse(key), {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    })

    try {
        decryptedData = decryptedData.toString(CryptoJS.enc.Utf8)
    } catch (e) {
        let error = 'Error while decrypting data from Airtel.'
        alert(error)
    }

    let data = JSON.parse(decryptedData)

    let categories = data.allPacks

    categories.forEach(category => {
        category.packs.forEach(pack => {
            let totalCost = pack.mrp
            
            let packDetails = pack.packDetails
            let planGbPerDay = packDetails.find(detail => detail.key === 'Data' && detail.value.includes('/'))
            if (planGbPerDay) {
                planGbPerDay = parseFloat(planGbPerDay.value.toLowerCase().split('gb')[0])
            }
            planGbPerDay = planGbPerDay || 0

            let planGb = packDetails.find(detail => detail.key === 'Data' && !detail.value.includes('/'))
            if (planGb) {
                let convFactor = 1
                if (planGb.value.toLowerCase().includes('mb')) {
                    convFactor = 1024
                }
                planGb = parseFloat(planGb.value.toLowerCase().split('gb')[0])/convFactor
            }
            planGb = planGb || 0

            let planDays = parseInt(packDetails.find(detail => detail.key === 'Validity').value.split(' ')[0])
            if (!planDays) { return }

            let costPerDay = totalCost / planDays
            let totalGb = (planGbPerDay * planDays) + planGb
            let gbPerDay = totalGb / planDays
            let costPerGb = totalCost / totalGb

            // console.log(totalGb, planDays)
            if (!totalGb) { return }
            
            if (!gbPerDay) { return }


            outputPlans.push({
                // planName,
                totalCost,
                planGbPerDay,
                planGb,
                planDays,
                costPerDay,
                totalGb,
                costPerGb,
                gbPerDay,
            })
        })
    })
}

export async function fetchPlans (phoneNumber, carrier, plansList) {
    outputPlans = plansList

    let queryParams = {}
    if (carrier) { queryParams.carrier = carrier }
    if (phoneNumber) { queryParams.phoneNumber = phoneNumber }

    queryParams = new URLSearchParams(queryParams).toString()
    let url = `${baseUrl}?${queryParams}`
    let resp = await fetch(url)
    let data = await resp.json()
    if (!resp.ok) {
        alert(data.error)
        console.log(data)
        return
    }

    if (data.carrier == 'airtel') {
        organiseAirtelPlans(data.data)
    } else if (data.carrier == 'jio') {
        organiseJioPlans(data.data)
    }

    // populateRange('totalCost', 'rate')
    // populateRange('planDays', 'duration')


    // let maxRate = document.getElementById('rate-slider').value
    // maxRate = parseFloat(maxRate)
    // let maxDuration = document.getElementById('duration-slider').value
    // maxDuration = parseInt(maxDuration)
    let weight = document.getElementById('value-slider').value
    sortPlansByWeight(outputPlans, weight)

    let costValues = getMinMaxValues('totalCost')
    let DurationValues = getMinMaxValues('planDays')

    return {
        cost: costValues,
        duration: DurationValues,
    }
}

function getMinMaxValues(param) {
    let vals = outputPlans.map(plan => parseFloat(plan[param]))
    let min = Math.min(...vals)
    let max = Math.max(...vals)
    return {
        min,
        max,
    }
}

// function populateRange(param, elemName) {
//     let plansByParam = outputPlans.sort((a, b) => {
//         return a[param] - b[param]
//     })

//     document.getElementById(elemName + '-slider').min = plansByParam[0][param]
//     document.getElementById(elemName + '-slider').max = plansByParam[plansByParam.length - 1][param]
//     document.getElementById(elemName + '-slider').value = (plansByParam[0][param] + plansByParam[plansByParam.length - 1][param]) / 2
//     document.getElementById(elemName + '-value').innerHTML = document.getElementById(elemName + '-slider').value
//     document.getElementById(elemName + '-value-min').innerHTML = plansByParam[0][param]
//     document.getElementById(elemName + '-value-max').innerHTML = plansByParam[plansByParam.length - 1][param]
// }

export function updatePlans(plans) {
    let output = document.querySelector('.output-plan')
    output.innerHTML = ''
    output.innerHTML += JSON.stringify(plans[0], null, 2) + '<br>'
    output.innerHTML += JSON.stringify(plans[1], null, 2) + '<br>'
    output.innerHTML += JSON.stringify(plans[2], null, 2) + '<br>'
}

export function sortPlansByWeight(outputPlans, weight) {
    
    outputPlans.sort((a, b) => {

        let aValue = a.costPerGb * weight + a.costPerDay * (1 - weight)
        let bValue = b.costPerGb * weight + b.costPerDay * (1 - weight)

        if (aValue < bValue) {
            return -1
        } else if (aValue > bValue) {
            return 1
        }

        return 0
    })

    return outputPlans
}

// document.getElementById('value-slider').oninput = function() {
//     let plans = organisePlans()
//     updatePlans(plans)
// }

// document.getElementById('rate-slider').oninput = function() {
//     let plans = organisePlans()
//     updatePlans(plans)
//     document.getElementById('rate-value').innerHTML = this.value
// }

// document.getElementById('duration-slider').oninput = function() {
//     let plans = organisePlans()
//     updatePlans(plans)
//     document.getElementById('duration-value').innerHTML = this.value
// }

// document.getElementById('phone-number').value = '9324805392'