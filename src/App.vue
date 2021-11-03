<template>
	<div id="app">
		<div class="top-row">
			<!-- <input
				type="number"
				pattern="\d*"
				placeholder="Enter your phone no.."
				v-model="phoneNumber"
				@keyup="checkIfEnter"
				class="phoneNumber"
			/> -->
			<select id="selected-carrier" v-model="carrierName">
				<option value="-1" disabled selected>Please select a carrier</option>
				<option value="jio">Jio</option>
				<option value="airtel">Airtel</option>
			</select>
			<button @click="getPlans">Fetch</button>
		</div>
		<div class="heading">Optimise</div>
		<div class="options-container">
			<input
				type="range"
				id="value-slider"
				min="0"
				max="1"
				step="0.01"
				@input="sortPlans"
				v-model="valueWeight"
			/>
			<div class="slider-labels">
				<span>Value for validity</span>
				<span>Value for data</span>
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
			/>
		</div>
		<div class="heading">Best Plans For You <span style="color: gray">({{filteredPlans.length}})</span></div>
		<div class="lds-ellipsis" v-if="loadingPlans"><div></div><div></div><div></div><div></div></div>
		<div v-else-if="filteredPlans.length" class="output-plan">
			<div
				v-for="(plan, index) in filteredPlans"
				:key="'plan' + index"
				class="cellular-plan"
			>
				<div class="plan-detail-top">
					<div class="plan-detail">
						<div class="plan-detail-title">Plan</div>
						<div class="plan-detail-value">₹{{ plan.totalCost }}</div>
					</div>
					<div class="plan-detail">
						<div class="plan-detail-title">Data</div>
						<p style="display: flex; align-items: center">
							<span v-if="plan.planGbPerDay >= 1" class="plan-detail-value">
								{{ plan.planGbPerDay }}GB/day
							</span>
							<span v-else-if="plan.planGbPerDay > 0">{{ plan.planGbPerDay * 1024 }}MB/day</span>
							<span v-if="plan.planGbPerDay && plan.planGb">&nbsp;+&nbsp;</span>
							<span v-if="plan.planGb >= 1" class="plan-detail-value extra-data">
								{{ plan.planGb }}GB
							</span>
							<span v-else-if="plan.planGb > 0" class="plan-detail-value extra-data">{{ plan.planGb * 1024 }}MB</span>
						</p>
					</div>
					<div class="plan-detail">
						<div class="plan-detail-title">Validity</div>
						<div>{{ plan.planDays }} days</div>
					</div>
				</div>
				<div class="plan-detail-bottom">
					<div class="plan-detail">
						<div class="plan-detail-title">Cost/day</div>
						<div>₹{{ plan.costPerDay.toFixed(1) }}/day</div>
					</div>
					<div class="plan-detail">
						<div class="plan-detail-title">Cost/GB</div>
						<div>₹{{ plan.costPerGb.toFixed(1) }}/GB</div>
					</div>
					<div class="plan-detail">
						<div class="plan-detail-title">Total Data</div>
						<div v-if="plan.totalGb >=1">{{ plan.totalGb }}GB</div>
						<div v-else>{{ (plan.totalGb * 1024).toFixed(1) }}MB</div>
					</div>
					<!-- {{plan}} -->
				</div>
			</div>
		</div>
		<div v-else>No plans for you.</div>
	</div>
</template>

<script>
import { fetchPlans, sortPlansByWeight } from "./api";

export default {
	name: "App",
	components: {},
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
				this.carrierName,
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
	},
};
</script>

<style>
@import './assets/styles/loader.css';

body {
	margin: 0;
}

.heading {
	font-size: 1.5em;
	font-weight: bold;
	margin: 0.5em;
}

#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	text-align: center;
	color: #2c3e50;
	display: flex;
	flex-direction: column;
	align-items: center;
	height: 100vh;
}

.top-row {
	display: flex;
	width: 500px;
	max-width: 90vw;
	margin-top: 1em;
	/* flex-direction: row;
	justify-content: center;
	align-items: center; */
}

.top-row * {
	flex: 1;
	font-size: 1em;
}

.phoneNumber {
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
	/* width: 40em; */
	max-width: 95vw;
	overflow-y: auto;
}

.cellular-plan {
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
	margin: 0.5em;
	padding: 0.25em;
	display: flex;
	flex-direction: column;
	width: 500px;
	max-width: 90vw;
	/* justify-content: space-between; */
}

.plan-detail {
	margin: 0.25em 0.75em;
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

.extra-data {
	font-size: 0.8em;
}

@media (max-width: 600px) {
	#app {
		height: 101vh;
	}
}

</style>
