<template>
	<div id="app">
		<div class="page-division first-division">
		<span id="app-version">v1.21</span>
		<!-- <div class="big heading">
			Cellular Plans
		</div> -->
		<!-- <div>
			<label>
				<input type="radio" v-model="numberOrCarrier" value="number">
				Enter phone number
			</label>
			<label>
				<input type="radio" v-model="numberOrCarrier" value="carrier">
				Select carrier
			</label>
		</div> -->
		<!-- <div>
			<label>
				<input type="radio" v-model="preOrPostPaid" value="prepaid">
				Prepaid
			</label>
			<label>
				<input type="radio" v-model="preOrPostPaid" value="postpaid">
				Postpaid
			</label>
		</div> -->
		<div class="top-row">
			<input
				type="number"
				pattern="\d*"
				placeholder="Enter your phone no.."
				v-model="phoneNumber"
				@keyup="checkIfEnter"
				class="phoneNumber"
				v-if="numberOrCarrier == 'number'"
			/>
			<button v-if="numberOrCarrier == 'number'" @click="getPlans">Fetch</button>
			<select id="selected-carrier" v-model="carrierName" @change="getPlans" v-if="numberOrCarrier == 'carrier'">
				<option value="-1" disabled selected>Please select a carrier</option>
				<option value="jio">Jio</option>
				<option value="airtel">Airtel</option>
			</select>
		</div>
		<!-- <div
			class="phone-message"
			:style="{ visibility: numberOrCarrier == 'carrier' ? '' : 'hidden'}"
		>
			For more accurate plans, enter your phone number. I do not store your phone number anywhere and I don't send it to anyone except the cellular company.
		</div> -->
		<div :style="{opacity: filteredPlans.length ? 1 : 0.1}" style="transition: 1s">
		<div class="heading">Prioritise</div>
		<div class="options-container">
			<input
				type="range"
				id="value-slider"
				min="0"
				max="1"
				step="0.01"
				@input="sortPlans(); changeValueColors()"
				v-model="valueWeight"
			/>
			<div class="slider-labels">
				<span :style="getFont('validity')">Value for validity</span>
				<span style="font-size: 1.4em">&nbsp;</span>
				<span :style="getFont('data')">Value for data</span>
			</div>
		</div>
		<div class="heading">Filters</div>
		<div class="options-container">
			<div class="slider-labels">
				<!-- <p>₹<span>{{ minRate }}</span></p> -->
				<p>Max. Cost: ₹<span>{{ curRate }}</span></p>
				<!-- <p>₹<span>{{ maxRate }}</span></p> -->
			</div>
			<input
				type="range"
				id="rate-slider"
				:min="minRate"
				:max="maxRate"
				step=""
				v-model="curRate"
				@touchstart="isMovingCostSlider = true"
				@touchend="isMovingCostSlider = false"
				@mousedown="isMovingCostSlider = true"
				@mouseup="isMovingCostSlider = false"
			/>
		</div>
		<div class="options-container">
			<div class="slider-labels">
				<!-- <p><span>{{ minDuration }}</span> days</p> -->
				<p>Max. Validity: <span>{{ curDuration }}</span> days</p>
				<!-- <p><span>{{ maxDuration }}</span> days</p> -->
			</div>
			<input
				type="range"
				id="duration-slider"
				:min="minDuration"
				:max="maxDuration"
				step=""
				v-model="curDuration"
				@touchstart="isMovingDurationSlider = true"
				@touchend="isMovingDurationSlider = false"
				@mousedown="isMovingDurationSlider = true"
				@mouseup="isMovingDurationSlider = false"
			/>
		</div>
		</div>
		</div>

		<div class="page-division second-division">
		<div class="heading">Best Plans For You <span style="color: gray">({{filteredPlans.length}})</span></div>
		<div class="lds-ellipsis loading-animation" v-if="loadingPlans"><div></div><div></div><div></div><div></div></div>
		<div v-else-if="filteredPlans.length" class="output-plan">
			<transition-group name="list" tag="div">
			<div
				v-for="(plan, index) in filteredPlans"
				:key="'plan' + index"
				class="cellular-plan"
				:class="{'best-cellular-plan': index==0}"
			>
				<!-- <div class="plan-detail-top"> -->
					<div class="plan-index">
						<div class="plan-star">
							<StarFill v-if="index==0" style="color: white" />
						</div>
						<div>{{index + 1}}.</div>
						<div></div>
					</div>
					<div class="plan-detail">
						<div class="plan-detail-title">Plan</div>
						<div class="plan-detail-value" :class="{ 'plan-detail-highlighted': isMovingCostSlider }">₹{{ plan.totalCost }}</div>
					</div>
					<div class="plan-detail">
						<div class="plan-detail-title">Data</div>
						<p>{{getPlanData(plan)}}</p>
					</div>
					<div class="plan-detail">
						<div class="plan-detail-title">Validity</div>
						<div class="plan-detail-value" :class="{ 'plan-detail-highlighted': isMovingDurationSlider }">{{ plan.planDays }} days</div>
					</div>
					<div class="plan-detail empty-detail">
						<div class="plan-detail-title">&nbsp;</div>
						<div style="font-size: 1.4em">&nbsp;</div>
					</div>
				<!-- </div> -->
				<!-- <div class="plan-detail-bottom"> -->
					<div class="plan-detail">
						<div class="plan-detail-title">Cost/day</div>
						<div :style="getFont('validity', true)">₹{{ plan.costPerDay.toFixed(1) }}/day</div>
					</div>
					<div class="plan-detail">
						<div class="plan-detail-title">Cost/GB</div>
						<div :style="getFont('data', true)">₹{{ plan.costPerGb.toFixed(1) }}/GB</div>
					</div>
					<div class="plan-detail">
						<div class="plan-detail-title">Total Data</div>
						<div v-if="plan.totalGb >=1">{{ plan.totalGb }}GB</div>
						<div v-else>{{ (plan.totalGb * 1024).toFixed(1) }}MB</div>
					</div>
					<div class="plan-detail empty-detail">
						<div class="plan-detail-title">&nbsp;</div>
						<div style="font-size: 1.4em">&nbsp;</div>
					</div>
					<button class="buy-button" @click="purchasePlan(plan)">Buy this plan</button>
					<!-- {{plan}} -->
				<!-- </div> -->
			</div>
			</transition-group>
		</div>
		<div v-else>No plans for you.</div>
		</div>
	</div>
</template>

<script>
import { fetchPlans, sortPlansByWeight } from "./api";
import StarFill from './assets/icons/star-fill.svg';

export default {
	name: "App",
	components: {
		StarFill
	},
	data() {
		return {
			loadingPlans: false,
			phoneNumber: "",
			carrierName: "-1",
			outputPlans: [],
			valueWeight: 1,
			minRate: 0,
			curRate: 0,
			maxRate: 0,
			minDuration: 0,
			curDuration: 0,
			maxDuration: 0,
			isMovingCostSlider: false,
			isMovingDurationSlider: false,
			numberOrCarrier: "carrier",
			preOrPostPaid: "prepaid",
			// numberOrCarrier: "number",
		};
	},
	computed: {
		filteredPlans() {
			let filteredPlans = this.outputPlans.filter((plan) => {
				let val = plan.totalCost <= this.curRate;
				val = val && plan.planDays <= this.curDuration;

				return val;
			});
			return filteredPlans;
		},
	},
	methods: {
		checkIfEnter(e) {
			if (e.keyCode === 13) {
				this.getPlans();
			}
		},
		async getPlans() {
			this.loadingPlans = true;

			let carrierName = this.carrierName;
			if (carrierName == "-1") {
				carrierName = null;
			}
			this.outputPlans.length = 0;
			let values = await fetchPlans(
				this.phoneNumber,
				carrierName,
				this.outputPlans
			);
			if (!values) {
				return;
			}
			this.minRate = values.cost.min;
			this.maxRate = values.cost.max;
			this.minDuration = values.duration.min;
			this.maxDuration = values.duration.max;
			this.curRate = values.cost.max;
			this.curDuration = values.duration.max;

			this.loadingPlans = false;
		},
		sortPlans() {
			sortPlansByWeight(this.outputPlans, this.valueWeight);
		},
		changeValueColors() {
			
		},
		getFont(param, constantFontSize) {
			let weight = parseFloat(this.valueWeight)
			if (param == 'validity') {
				weight = 1 - weight;
			}
			let size = 1 + (weight*0.4)

			let r = 54, g = 181, b = 84;
			if (weight >= 0.5) {
				r = r - ((1-weight)*r*2);
				g = g - ((1-weight)*g*2);
				b = b - ((1-weight)*b*2);
			} else {
				r = (0.7-weight)*255
				g = (0.7-weight)*255
				b = (0.7-weight)*255
			}

			let style = {
				'color': `rgb(${r}, ${g}, ${b})`,
			}

			constantFontSize = false
			if (constantFontSize) {
				style['font-size'] = `1em`
			} else {
				style['font-size'] = `${size}em`
			}

			return style
		},
		getPlanData(plan) {
			let planStr = ''
			let planGbPerDay = plan.planGbPerDay
			if (planGbPerDay) {
				planStr += `${planGbPerDay}GB/day`
			} 

			let planGb = plan.planGb
			if (planGb) {
				if (planGbPerDay) {
					planStr += ` + `
				}
				if (planGb >= 1) {
					planStr += `${planGb}GB`
				} else {
					planStr += `${planGb*1024}MB`
				}
			}

			return planStr
		},
		purchasePlan(plan) {
			if (this.carrierName == "airtel") {
				window.open(`https://www.airtel.in/prepaid-recharge/?amount=${plan.totalCost}&anid=RECHARGE-ONLINE`)
			} else if (this.carrierName == "jio") {
				window.open(`https://www.jio.com/selfcare/recharge/mobility/?ptab=Popular%20Plans&planId=${plan.id}`)
			} else {
				alert("Please select a valid carrier.")
			}
		}
	},
};
</script>

<style>
@import './assets/styles/loader.css';

#app-version {
	font-size: 0.7rem;
	margin: 0.5em;
	color: gray;
}

body {
	margin: 0;
}

.heading {
	font-size: 1.5em;
	font-weight: bold;
	margin: 0.5em;
}

.big.heading {
	font-size: 1.7em;
	color: dimgray	;
}

#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	display: grid;
	grid-template-columns: 1fr 1fr;
	height: 100vh;
}

select {
	border-radius: 5px;
	border: 1px solid black;
	background: white;
	color: black;
}

option {
	background: white;
	color: black;
}

.page-division {
	/* max-width: 500px; */
	max-width: 90vw;
	display: grid;
	/* align-items: center; */
	/* align-self: center; */
}

.loading-animation {
	justify-self: center;
}

.first-division {
	justify-self: end;
	align-self: center;
}

.second-division {
	overflow-y: hidden;
	width: 500px;
	grid-template-rows: auto 1fr;
}

.top-row {
	height: 2em;
	display: flex;
	width: 500px;
	max-width: 90vw;
	/* margin-top: 1em; */
	/* flex-direction: row;
	justify-content: center;
	align-items: center; */
}

.phone-message {
	color: darkgray;
	font-size: 0.8em;
	max-width: 90vw;
	width: 500px;
}

.top-row * {
	flex: 1;
	font-size: 1em;
}

.phoneNumber {
	flex: 3;
	font-size: 1em;
	width: 7em;
}

.options-container {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	width: 500px;
	max-width: 90vw;
}

.slider-labels {
	display: flex;
	justify-content: space-between;
}

.slider-labels p {
	margin: 0;
}

.output-plan {
	max-width: 95vw;
	overflow-y: auto;
	min-height: 20em;
}

.cellular-plan {
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
	margin: 0.5em;
	/* padding: 0.25em; */
	display: grid;
	grid-template-columns: 0.5fr 1fr 1fr 1fr 0fr;
	/* display: flex; */
	/* flex-direction: column; */
	/* justify-content: space-between; */
}

.best-cellular-plan .plan-index {
	background: rgb(252, 186, 3);
}

.plan-index {
	grid-row: 1/4;
	/* display: flex;
	align-items: center;
	justify-content: center; */
	display: grid;
	grid-template-rows: 2fr 1fr 2fr;
	font-size: 1.5em;
	background: rgb(3, 158, 255);
	color: white;
}

.plan-star {
	align-self: end;
}

.plan-detail {
	margin: 0.25em 0;
}

.plan-detail-value {
	transition: 0.2s;
}

.plan-detail-highlighted {
	font-size: 1.4em;
	color: cornflowerblue;
}

.empty-detail {
	width: 0;
}

.plan-detail p {
	margin: 0;
}

.plan-detail-top, .plan-detail-bottom {
	display: flex;
}

.plan-detail-top {
	justify-content: space-between;
}

.plan-detail-bottom {
	justify-content: space-around;
}

.plan-detail-title {
	font-weight: bold;
	font-size: 0.7em;
}

.buy-button {
	grid-column: 2/5;
	justify-self: center;
	border: none;
	margin: 0.5em;
	padding: 0.5em 1em;
	background: rgb(3, 158, 255);
	color: white;
	border-radius: 0.25em;
	cursor: pointer;
	transition: 0.2s;
	font-size: 1em;
}

.buy-button:hover {
	background: rgb(17, 135, 209)
}

.best-cellular-plan .buy-button {
	background: rgb(252, 186, 3);
}

.best-cellular-plan .buy-button:hover {
	background: rgb(219, 161, 0);
}

.extra-data {
	/* font-size: 0.8em; */
}

@media (max-width: 1000px) {
	/* Change height to 100.1vh so that address bar vanishes on iOS Safari */
	#app {
		height: 100.1vh;
		grid-template-columns: 1fr;
		grid-template-rows: 0.1fr minmax(0.5em, 1fr);
	}

	.page-division {
		justify-self: center;
	}

	.second-division {
		min-height: 400px;
	}

	.plan-index {
		grid-column: 1/5;
		border-bottom: 1px solid #eee;
		margin-bottom: 0.25em;
		padding: 0.25em;
		grid-template-rows: auto;
		grid-template-columns: 6fr 1fr 6fr;
	}

	.plan-star {
		justify-self: end;
	}

	.output-plan {
		overflow-y: scroll;
	}

	.cellular-plan {
		grid-template-columns: 1fr 1fr 1fr 0fr;
	}

	.buy-button {
		grid-column: 1/5;
	}
}

/* Animations */
.list-item {
	display: inline-block;
	margin-right: 10px;
}
.list-enter-active, .list-leave-active {
	transition: all 0.2s;
}
.list-enter, .list-leave-to{
	opacity: 0;
	transform: translateY(30px);
}

</style>
