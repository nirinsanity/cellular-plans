<template>
	<div id="app">
		<header class="app-header">
			<h1 class="app-title">Cellular Plans</h1>
			<span id="app-version">v1.3.0</span>
		</header>

		<section class="controls-panel">
			<div class="top-row">
				<select id="selected-carrier" v-model="carrierName" @change="onCarrierChange">
					<option value="-1" disabled selected>Select your carrier</option>
					<option value="jio">Jio</option>
					<option value="airtel">Airtel</option>
				</select>
				<div class="phone-input-group">
					<input
						type="tel"
						inputmode="numeric"
						pattern="[0-9]*"
						maxlength="10"
						placeholder="Enter phone number (optional)"
						v-model="phoneNumber"
						@keyup="checkIfEnter"
						class="phoneNumber"
					/>
					<button :disabled="!isCarrierSelected" @click="getPlans">Fetch</button>
				</div>
			</div>
			<div class="phone-message" :class="{ 'phone-message-error': phoneNumber && !isPhoneNumberValid }">
				<template v-if="phoneNumber && !isPhoneNumberValid">Please enter a valid 10-digit phone number.</template>
				<template v-else>For more accurate plans, enter your phone number. I don't store it or send it anywhere except your carrier.</template>
			</div>

			<div class="toolbar" :style="{ opacity: filteredPlans.length ? 1 : 0.3 }" style="transition: 1s">
				<div class="priority-toggle">
					<span class="toolbar-label">Prioritize</span>
					<div class="radio-container">
						<label :class="{ active: valueWeight == '0' }">
							<input type="radio" v-model="valueWeight" value="0" @change="sortPlans">
							Validity
						</label>
						<label :class="{ active: valueWeight == '1' }">
							<input type="radio" v-model="valueWeight" value="1" @change="sortPlans">
							Data
						</label>
					</div>
				</div>
				<button class="show-filters-button" @click="showFilters = !showFilters">Filters ↓</button>
			</div>

			<div class="filters-container" :class="{ hidden: !showFilters }">
				<div class="filter">
					<label>Max. Cost: ₹{{ curRate }}</label>
					<input
						type="range"
						:min="minRate"
						:max="maxRate"
						v-model="curRate"
						@touchstart="isMovingCostSlider = true"
						@touchend="isMovingCostSlider = false"
						@mousedown="isMovingCostSlider = true"
						@mouseup="isMovingCostSlider = false"
					/>
				</div>
				<div class="filter">
					<label>Max. Validity: {{ curDuration }} days</label>
					<input
						type="range"
						:min="minDuration"
						:max="maxDuration"
						v-model="curDuration"
						@touchstart="isMovingDurationSlider = true"
						@touchend="isMovingDurationSlider = false"
						@mousedown="isMovingDurationSlider = true"
						@mouseup="isMovingDurationSlider = false"
					/>
				</div>
				<div class="filter filter-checkbox">
					<label>
						<input type="checkbox" v-model="dataOnlyFilter">
						Data-only packs
					</label>
				</div>
				<div class="filter filter-checkbox">
					<label>
						<input type="checkbox" v-model="fiveGOnlyFilter">
						5G only
					</label>
				</div>
			</div>
		</section>

		<section class="results-section">
			<div class="heading">Best Plans For You <span class="result-count">({{ filteredPlans.length }})</span></div>
			<div class="subheading" v-if="filteredPlans.length">Not all plans may be available for your number.</div>

			<div class="lds-ellipsis loading-animation" v-if="loadingPlans"></div>
			<div class="table-wrapper" v-else-if="filteredPlans.length">
				<table class="plans-table">
					<thead>
						<tr>
							<th class="col-rank">#</th>
							<th class="col-cost" :class="{ flash: isMovingCostSlider }">Cost</th>
							<th class="col-data">Data</th>
							<th class="col-calls">Calls</th>
							<th class="col-5g">5G</th>
							<th class="col-validity" :class="{ flash: isMovingDurationSlider }">Validity</th>
							<th class="col-cost-per-day" :class="{ priority: !isDataPriority }">Cost/day</th>
							<th class="col-cost-per-gb" :class="{ priority: isDataPriority }">Cost/GB</th>
							<th class="col-total-data">Total Data</th>
							<th class="col-action"></th>
						</tr>
					</thead>
					<transition-group name="list" tag="tbody">
						<tr
							v-for="(plan, index) in filteredPlans"
							:key="'plan' + index"
							:class="{ 'best-plan-row': index == 0 }"
						>
							<td class="col-rank" data-label="#"><span class="rank-badge">{{ index + 1 }}</span></td>
							<td class="col-cost" data-label="Cost" :class="{ flash: isMovingCostSlider }">₹{{ plan.totalCost }}</td>
							<td class="col-data" data-label="Data">{{ getPlanData(plan) }}</td>
							<td class="col-calls" data-label="Calls">
								<span class="calls-badge" :class="{ 'calls-yes': plan.hasCalls }">{{ plan.hasCalls ? '✓' : '—' }}</span>
							</td>
							<td class="col-5g" data-label="5G">
								<span class="calls-badge" :class="{ 'calls-yes': plan.has5G }">{{ plan.has5G ? '✓' : '—' }}</span>
							</td>
							<td class="col-validity" data-label="Validity" :class="{ flash: isMovingDurationSlider }">{{ plan.planDays }} days</td>
							<td class="col-cost-per-day" data-label="Cost/day" :class="{ priority: !isDataPriority }">₹{{ plan.costPerDay.toFixed(1) }}</td>
							<td class="col-cost-per-gb" data-label="Cost/GB" :class="{ priority: isDataPriority }">₹{{ plan.costPerGb.toFixed(1) }}</td>
							<td class="col-total-data" data-label="Total Data">
								<template v-if="plan.totalGb >= 1">{{ plan.totalGb }}GB</template>
								<template v-else>{{ (plan.totalGb * 1024).toFixed(1) }}MB</template>
							</td>
							<td class="col-action"><a class="buy-button" :href="buyLink(plan)" target="_blank" rel="noopener noreferrer">Buy</a></td>
						</tr>
					</transition-group>
				</table>
			</div>
			<div class="no-plans" v-else>No plans for you.</div>
		</section>
	</div>
</template>

<script>
import { fetchPlans, sortPlansByWeight } from "./api";

export default {
	name: "App",
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
			showFilters: false,
			dataOnlyFilter: false,
			fiveGOnlyFilter: false,
		};
	},
	computed: {
		isPhoneNumberValid() {
			return /^[6-9]\d{9}$/.test(this.phoneNumber);
		},
		isCarrierSelected() {
			return this.carrierName !== "-1";
		},
		isDataPriority() {
			return this.valueWeight == 1;
		},
		filteredPlans() {
			let filteredPlans = this.outputPlans.filter((plan) => {
				let val = plan.totalCost <= this.curRate;
				val = val && plan.planDays <= this.curDuration;
				if (this.dataOnlyFilter) {
					val = val && !plan.hasCalls;
				}
				if (this.fiveGOnlyFilter) {
					val = val && plan.has5G;
				}

				return val;
			});
			return filteredPlans;
		},
	},
	methods: {
		checkIfEnter(e) {
			if (e.keyCode === 13 && this.isCarrierSelected) {
				this.getPlans();
			}
		},
		onCarrierChange() {
			this.phoneNumber = "";
			this.outputPlans.length = 0;
		},
		async getPlans() {
			this.loadingPlans = true;

			let carrierName = this.carrierName;
			if (carrierName == "-1") {
				carrierName = null;
			}
			let phoneNumber = this.isPhoneNumberValid ? this.phoneNumber : null;
			this.outputPlans.length = 0;
			let values = await fetchPlans(
				phoneNumber,
				carrierName,
				this.outputPlans,
				this.valueWeight
			);
			if (!values) {
				this.loadingPlans = false;
				return;
			}
			this.carrierName = values.carrier;
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
		buyLink(plan) {
			if (this.carrierName == "airtel") {
				return `https://www.airtel.in/prepaid-recharge/?amount=${plan.totalCost}&anid=RECHARGE-ONLINE`
			} else if (this.carrierName == "jio") {
				return `https://www.jio.com/selfcare/recharge/mobility/?ptab=Popular%20Plans&planId=${plan.id}`
			}
			return null
		}
	},
};
</script>

<style>
@import './assets/styles/loader.css';

* {
	box-sizing: border-box;
}

body {
	margin: 0;
}

#app {
	font-family: Avenir, Helvetica, Arial, sans-serif;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	color: #2c3e50;
	max-width: 1100px;
	margin: 0 auto;
	padding: 0.5em 1.5em 3em;
}

.app-header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 0.5em;
}

.app-title {
	font-size: 1.6em;
	margin: 0.4em 0;
	color: #2c3e50;
}

#app-version {
	font-size: 0.7rem;
	color: gray;
}

.heading {
	font-size: 1.4em;
	font-weight: bold;
	margin: 0.5em 0 0.25em 0;
}

.result-count {
	color: gray;
	font-weight: normal;
}

.subheading {
	color: gray;
	font-size: 0.8em;
	margin: 0 0 0.75em;
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

.controls-panel {
	display: flex;
	flex-direction: column;
	gap: 0.6em;
	text-align: left;
}

.results-section {
	text-align: left;
}

.top-row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 0.6em;
}

.phone-message {
	color: darkgray;
	font-size: 0.8em;
	margin: 0;
}

.phone-message-error {
	color: #d34a4a;
}

.phone-input-group {
	display: flex;
	flex: 1 1 260px;
	gap: 0.4em;
	min-width: 0;
}

.phone-input-group button {
	flex: 0 0 auto;
	white-space: nowrap;
	border: none;
	border-radius: 5px;
	padding: 0.3em 0.8em;
	background: rgb(3, 158, 255);
	color: white;
	cursor: pointer;
	transition: 0.2s;
}

.phone-input-group button:hover:not(:disabled) {
	background: rgb(17, 135, 209);
}

.phone-input-group button:disabled {
	background: lightgray;
	cursor: not-allowed;
}

.phoneNumber {
	flex: 1 1 auto;
	min-width: 0;
	font-size: 1em;
	padding: 0.3em 0.5em;
	border-radius: 5px;
	border: 1px solid black;
}

#selected-carrier {
	flex: 0 0 auto;
	padding: 0.3em 0.5em;
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 0.75em;
	margin-top: 0.5em;
}

.toolbar-label {
	font-weight: bold;
	font-size: 0.85em;
	color: gray;
	margin-right: 0.6em;
}

.priority-toggle {
	display: flex;
	align-items: center;
}

.radio-container {
	display: flex;
	gap: 0.4em;
}

.radio-container label {
	display: inline-flex;
	align-items: center;
	gap: 0.35em;
	padding: 0.3em 0.8em;
	border-radius: 999px;
	border: 1px solid #ddd;
	cursor: pointer;
	font-size: 0.9em;
	transition: 0.15s;
}

.radio-container label.active {
	background: rgb(3, 158, 255);
	border-color: rgb(3, 158, 255);
	color: white;
}

.filters-container {
	display: flex;
	gap: 1.5em;
	flex-wrap: wrap;
	max-height: 80px;
	transition: 1s;
}

.filter {
	display: flex;
	flex-direction: column;
	flex: 1 1 220px;
	gap: 0.2em;
	font-size: 0.85em;
}

.filter label {
	color: gray;
}

.filter-checkbox {
	flex-direction: row;
	align-items: center;
}

.filter-checkbox label {
	display: flex;
	align-items: center;
	gap: 0.4em;
	cursor: pointer;
	color: #2c3e50;
}

.show-filters-button {
	display: none;
}

.no-plans {
	color: gray;
	padding: 2em 0;
	text-align: center;
}

.loading-animation {
	display: flex;
	justify-content: center;
	padding: 3em 0;
}

.table-wrapper {
	overflow-x: auto;
	overflow-y: auto;
	max-height: 70vh;
	max-width: 100%;
	border-radius: 8px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
}

.plans-table {
	width: 100%;
	border-collapse: collapse;
	white-space: nowrap;
}

.plans-table th,
.plans-table td {
	padding: 0.6em 0.9em;
	text-align: right;
}

.plans-table th.col-data,
.plans-table td.col-data,
.plans-table th.col-rank,
.plans-table td.col-rank {
	text-align: left;
}

.plans-table th.col-action,
.plans-table td.col-action,
.plans-table th.col-calls,
.plans-table td.col-calls,
.plans-table th.col-5g,
.plans-table td.col-5g {
	text-align: center;
}

.calls-badge {
	display: inline-block;
	font-weight: bold;
	color: lightgray;
}

.calls-badge.calls-yes {
	color: rgb(54, 181, 84);
}

.plans-table thead th {
	position: sticky;
	top: 0;
	background: #f7f8fa;
	font-size: 0.75em;
	text-transform: uppercase;
	letter-spacing: 0.03em;
	color: gray;
	border-bottom: 2px solid #eee;
}

.plans-table tbody tr {
	border-bottom: 1px solid #eee;
	transition: background 0.15s;
}

.plans-table tbody tr:last-child {
	border-bottom: none;
}

.plans-table tbody tr:hover {
	background: #f7fbff;
}

.best-plan-row {
	background: rgba(252, 186, 3, 0.12);
}

.best-plan-row:hover {
	background: rgba(252, 186, 3, 0.2);
}

.rank-badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 1.6em;
	height: 1.6em;
	border-radius: 50%;
	background: rgb(3, 158, 255);
	color: white;
	font-size: 0.85em;
	font-weight: bold;
}

.best-plan-row .rank-badge {
	background: rgb(252, 186, 3);
}

th.priority,
td.priority {
	background: rgba(3, 158, 255, 0.08);
	font-weight: bold;
	color: rgb(3, 158, 255);
}

.best-plan-row td.priority {
	background: rgba(252, 186, 3, 0.18);
	color: #8a6100;
}

th.flash,
td.flash {
	background: rgba(54, 181, 84, 0.15);
	transition: background 0.2s;
}

.buy-button {
	display: inline-block;
	border: none;
	padding: 0.4em 1.1em;
	background: rgb(3, 158, 255);
	color: white;
	border-radius: 999px;
	cursor: pointer;
	transition: 0.2s;
	font-size: 0.9em;
	text-decoration: none;
}

.buy-button:hover {
	background: rgb(17, 135, 209);
}

.best-plan-row .buy-button {
	background: rgb(252, 186, 3);
}

.best-plan-row .buy-button:hover {
	background: rgb(219, 161, 0);
}

@media (max-width: 700px) {
	#app {
		padding: 0.5em 1em 2em;
	}

	.show-filters-button {
		display: inline-block;
		cursor: pointer;
		border: none;
		color: white;
		background-color: rgb(3, 158, 255);
		padding: 0.4em 0.9em;
		border-radius: 999px;
	}

	.filters-container {
		flex-direction: column;
		overflow-y: hidden;
		transition: max-height 0.4s;
	}

	.filters-container.hidden {
		max-height: 0;
	}

	/* Below this width, the table becomes a stacked list of label/value rows instead of a horizontally-scrolling grid. */
	.table-wrapper {
		max-height: none;
		overflow: visible;
		box-shadow: none;
		border-radius: 0;
	}

	.plans-table,
	.plans-table tbody {
		display: block;
		width: 100%;
	}

	.plans-table thead {
		display: none;
	}

	.plans-table tr {
		position: relative;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(85px, 1fr));
		gap: 0.5em 0.6em;
		margin-bottom: 0.75em;
		padding: 0.6em 0.7em;
		padding-top: 2em;
		border: 1px solid #eee;
		border-radius: 8px;
		white-space: normal;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24);
	}

	.plans-table td {
		display: flex;
		flex-direction: column;
		text-align: left;
		padding: 0;
	}

	.plans-table td.col-calls,
	.plans-table td.col-5g {
		text-align: left;
	}

	.plans-table td::before {
		content: attr(data-label);
		font-weight: bold;
		font-size: 0.65em;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: gray;
	}

	.plans-table td.col-data {
		grid-column: span 2;
	}

	.plans-table td.col-rank {
		position: absolute;
		top: 0.5em;
		left: 0.5em;
		padding: 0;
	}

	.plans-table td.col-rank::before {
		content: none;
	}

	.plans-table td.col-action {
		grid-column: 1 / -1;
		padding-top: 0.4em;
	}

	.plans-table td.col-action::before {
		content: none;
	}

	.buy-button {
		width: 100%;
		text-align: center;
	}
}

/* Animations */
.list-enter-active,
.list-leave-active {
	transition: all 0.2s;
}

.list-enter-from,
.list-leave-to {
	opacity: 0;
	transform: translateY(15px);
}
</style>
