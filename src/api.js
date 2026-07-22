import CryptoJS from 'crypto-js'

let outputPlans = []
let baseUrl = import.meta.env.VITE_API_BASE_URL

let organiseJioPlans = (data) => {
    let planCategories = data.planCategories
    if (planCategories) {

        // let plan = planCategories[0].subCategories[0].plans[0]
        planCategories.forEach(planCategory => {
            let subCategories = planCategory.subCategories
            subCategories.forEach(subCategory => {
                let plans = subCategory.plans
                plans.forEach(plan => {
                    // Available Information
                    // let planName = plan.planName
                    let primeData = plan.primeData
                    let totalCost = parseInt(plan.amount)
    
                    let planGbPerDay = 0
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
                    
                    // Calculated Information
                    let costPerDay = totalCost / planDays
                    let totalGb = (planGbPerDay * planDays) + planGb
                    let gbPerDay = totalGb / planDays
                    let costPerGb = totalCost / totalGb
    
                    if (!gbPerDay) { return }

                    // The phone-number-specific Jio endpoint returns a slimmer plan
                    // object with no `misc` field at all, so fall back to parsing the
                    // free-text description for the same "unlimited voice" signal.
                    let voiceDetail = plan.misc && plan.misc.details && plan.misc.details.find(detail => detail.header === 'Voice')
                    let hasCalls
                    if (voiceDetail) {
                        hasCalls = voiceDetail.value.toLowerCase().includes('unlimited')
                    } else {
                        hasCalls = /unlimited\s+voice/i.test(plan.description || '')
                    }

                    let ott = (plan.filterKeys && plan.filterKeys.ott) || ''
                    let has5G = ott.includes('true5g')

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
                        hasCalls,
                        has5G,
                    })
                })
            })
        })
    } else {
        throw new Error('Unrecognised Jio plans response shape')
    }
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
            // Available Information
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


            // Calculated Information
            let costPerDay = totalCost / planDays
            let totalGb = (planGbPerDay * planDays) + planGb
            let gbPerDay = totalGb / planDays
            let costPerGb = totalCost / totalGb

            // console.log(totalGb, planDays)
            if (!totalGb) { return }
            
            if (!gbPerDay) { return }

            let callsDetail = packDetails.find(detail => detail.key === 'Calls')
            let hasCalls = !!callsDetail && callsDetail.value.toLowerCase().includes('unlimited')

            let packBenefits = (pack.additionalBenefits && pack.additionalBenefits.packBenefits) || []
            let has5G = packBenefits.some(benefit => benefit.toUpperCase().startsWith('UNLIMITED_5G'))

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
                hasCalls,
                has5G,
            })
        })
    })
}

export async function fetchPlans (phoneNumber, carrier, plansList, weight) {
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

    try {
        if (data.carrier == 'airtel') {
            organiseAirtelPlans(data.data)
        } else if (data.carrier == 'jio') {
            organiseJioPlans(data.data)
        }
    } catch {
        alert('There was an error while reading plan data. Refreshing the app might help.')
        return
    }

    // populateRange('totalCost', 'rate')
    // populateRange('planDays', 'duration')


    // let maxRate = document.getElementById('rate-slider').value
    // maxRate = parseFloat(maxRate)
    // let maxDuration = document.getElementById('duration-slider').value
    // maxDuration = parseInt(maxDuration)
    sortPlansByWeight(outputPlans, weight)

    let costValues = getMinMaxValues('totalCost')
    let DurationValues = getMinMaxValues('planDays')

    return {
        cost: costValues,
        duration: DurationValues,
        carrier: data.carrier,
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