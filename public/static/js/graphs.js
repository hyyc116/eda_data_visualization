queue().defer(d3.json, '/public/static/gejson/us-states.json').defer(d3.csv,
		'/public/static/data/yedata.csv').await(visualize);

function visualize(error, statesJson, yedata) {
	if (error) {
		console.log(error);
	}
	vizYe(statesJson, yedata);
}

function vizYe(statesJson, yedata) {
	// 所有的chart的声明放在这里
	// ye的所有图
	var us_map_chart = dc.geoChoroplethChart("#us-map-chart");
	var businessBarChart = dc.barChart('#business-bar-chart');
	var businessChart = dc.compositeChart('#business-chart');
	var jobsBarChart = dc.barChart('#jobs-bar-chart');
	var jobsChart = dc.compositeChart('#jobs-chart');
	var combine_chart = dc.bubbleChart("#combine_chart");
	var glChart = dc.pieChart("#gl-chart")

	// 所有的数据预处理都在这里
	// 对于yedata的数据处理
	var dateformat = d3.time.format("%Y");
	var numberFormat = d3.format(".2f");
	yedata.forEach(function(d) {
		d['year'] = dateformat.parse(d["year"]);
	});

	// 所有需要创建的维度在这里
	var ndx = crossfilter(yedata);

	// ye数据的维度
	var yearDim = ndx.dimension(function(d) {
		return d["year"];
	});
	var minDate = yearDim.bottom(1)[0]["year"];
	var maxDate = yearDim.top(1)[0]["year"];

	var stateDim = ndx.dimension(function(d) {
		return d['state'];
	});
	var gainOrLoss = ndx.dimension(function(d) {
		return +d['GAINED'] > +d['LOST'] ? "GAIN" : "LOST";
	});

	// ye中所需要的group
	// state维度 显示的是sales的总量,
	// TODO 将和改成平均值
	var stateTotalSalesGr = stateDim.group().reduceSum(function(d) {
		return +d['ALL SALES']
	});
	var max_state = stateTotalSalesGr.top(1)[0].value;
	function orderValue(p) {
		return -p.value;
	}
	var min_state = stateTotalSalesGr.order(orderValue).top(1)[0].value;
	// 画失业率的饼图
	var gainOrLossGroup = gainOrLoss.group();

	// BUSINESS BY TYPE
	// 用于折线图下的柱状图
	var bbtAllGr = yearDim.group().reduceSum(function(d) {
		return +d['RESIDENT'] + +d['NONRESIDENT'] + +d['NONCOMMERCIAL'];
	});
	// 三条折线图
	var residentGr = yearDim.group().reduceSum(function(d) {
		return +d['RESIDENT'];
	});
	var nonresidentGr = yearDim.group().reduceSum(function(d) {
		return +d['NONRESIDENT'];
	});
	var nonCommercialGr = yearDim.group().reduceSum(function(d) {
		return +d['NONCOMMERCIAL'];
	});

	// JOBs的几条折现图需要用到的group
	var jbsAllGr = yearDim.group().reduceSum(
			function(d) {
				return +d['SELF EMPLOYEE'] + +d['2-9 EMPLOYEES']
						+ +d['10-99 EMPLOYEES'] + +d['100-499 EMPLOYEES']
						+ +d['500+ EMPLOYEES'];
			});
	var jbs1Gr = yearDim.group().reduceSum(function(d) {
		return +d['SELF EMPLOYEE'];
	});
	var jbs2Gr = yearDim.group().reduceSum(function(d) {
		return +d['2-9 EMPLOYEES'];
	});
	var jbs10Gr = yearDim.group().reduceSum(function(d) {
		return +d['10-99 EMPLOYEES'];
	});
	var jbs100Gr = yearDim.group().reduceSum(function(d) {
		return +d['100-499 EMPLOYEES'];
	});
	var jbs500Gr = yearDim.group().reduceSum(function(d) {
		return +d['500+ EMPLOYEES'];
	});

	// 画bubble图用到的group
	var bubbleGr = yearDim.group().reduce(
			// add
			function(p, v) {
				++p.count;
				p.year = v.year;
				// 横坐标, 单人平均销售额
				p.x_total += +v['SALES PER EMPLOYEE']
				p.x = p.x_total / p.count;
				// 纵坐标, 每个business的平均销售额
				p.y_total += +v['SALES PER BUSINESS'];
				p.yavg = p.y_total / p.count;

				// 半径，等于所有选中的州的jobs的均值
				p.rtotal += +v['SELF EMPLOYEE'] + +v['2-9 EMPLOYEES']
						+ +v['10-99 EMPLOYEES'] + +v['100-499 EMPLOYEES']
						+ +v['500+ EMPLOYEES'];
				p.ravg = p.rtotal / p.count;

				// 颜色, Sales Per Employee的均值
				p.gained += +v['GAINED']
				p.lost += +v['LOST']
				p.cavg = p.gained / p.lost
				return p;
			},
			// remove
			function(p, v) {
				--p.count;
				p.year = v.year;
				// 横坐标, 单人平均销售额
				p.x_total -= +v['SALES PER EMPLOYEE']
				p.x = p.x_total / p.count;
				// 纵坐标, 每个business的平均销售额
				p.y_total -= +v['SALES PER BUSINESS'];
				p.yavg = p.y_total / p.count;

				// 半径，等于所有选中的州的jobs的均值
				p.rtotal -= +v['SELF EMPLOYEE'] + +v['2-9 EMPLOYEES']
						+ +v['10-99 EMPLOYEES'] + +v['100-499 EMPLOYEES']
						+ +v['500+ EMPLOYEES'];
				p.ravg = p.rtotal / p.count;

				// 颜色, Sales Per Employee的均值
				p.gained -= +v['GAINED']
				p.lost -= +v['LOST']
				p.cavg = p.gained / p.lost
				return p;
			},
			// init
			function() {
				p = {};
				p.count = 0;
				p.year = 2000;
				// 横坐标
				p.x_total = 0;
				p.x = 2000;
				// 纵坐标, 等于概念内所有的州这些值的平均值
				p.y_total = 0;
				p.yavg = 0;
				// 半径，等于所有选中的州的jobs的均值
				p.rtotal = 0;
				p.ravg = 0;
				// 颜色, Sales Per Employee的均值
				p.gained = 0;
				p.lost = 0;
				p.cavg = 0;
				return p;
			}
	//
	);
	function ravg_order(p) {
		return p.ravg;
	}
	function yavg_order(p) {
		return p.yavg;
	}
	function cavg_order(p) {
		return p.cavg;
	}
	function ravg_order_r(p) {
		return -p.ravg;
	}
	function yavg_order_r(p) {
		return -p.yavg;
	}
	function cavg_order_r(p) {
		return -p.cavg;
	}
	function xavg_order_r(p) {
		return -p.x;
	}
	function xavg_order(p) {
		return p.x;
	}
	//
	var max_bx = bubbleGr.order(xavg_order).top(1)[0].value.ravg;
	var max_br = bubbleGr.order(ravg_order).top(1)[0].value.ravg;
	var max_by = bubbleGr.order(yavg_order).top(1)[0].value.yavg;
	var max_bc = bubbleGr.order(cavg_order).top(1)[0].value.cavg;

	var min_bx = bubbleGr.order(ravg_order_r).top(1)[0].value.ravg;
	var min_br = bubbleGr.order(ravg_order_r).top(1)[0].value.ravg;
	var min_by = bubbleGr.order(yavg_order_r).top(1)[0].value.yavg;
	var min_bc = bubbleGr.order(cavg_order_r).top(1)[0].value.cavg;

	var all = ndx.groupAll();

	// ye的美国地图Charts
	us_map_chart.width(800).height(400).dimension(stateDim).group(
			stateTotalSalesGr).colors(
			[ "#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF",
					"#36A2FF", "#1E96FF", "#0089FF", "#0061B5" ]).colorDomain(
			[ min_state, max_state ]).overlayGeoJson(statesJson["features"],
			"state", function(d) {
				return d.properties.name;
			})
			.projection(d3.geo.albersUsa().scale(800).translate([ 400, 200 ]))
			.title(
					function(p) {
						return "State: " + p["key"] + "\n" + "Total Sales: "
								+ Math.round(p["value"]) + " ";
					});

	// 所有business的柱状图
	businessBarChart.width(800).height(150).margins({
		top : 50,
		right : 100,
		bottom : 50,
		left : 100
	}).transitionDuration(500).dimension(yearDim).group(bbtAllGr)
			.elasticY(true).yAxisPadding(100).elasticX(true).xAxisPadding(500)
			.x(d3.time.scale().domain([ minDate, maxDate ])).round(
					d3.time.year.round).xUnits(d3.time.years).centerBar(true)
			.brushOn(false).title(function(d) {
				return "Value: " + d.value;
			}).renderTitle(true).yAxis().ticks(3);
	// business by type的折线图
	businessChart.width(800).height(400).margins({
		top : 100,
		right : 100,
		bottom : 60,
		left : 100
	}).transitionDuration(500).dimension(yearDim).group(residentGr).elasticY(
			true).yAxisPadding(100).elasticX(true).yAxisLabel(
			"Number of Business").legend(
			dc.legend().x(80).y(20).itemHeight(13).gap(5)).x(
			d3.time.scale().domain([ minDate, maxDate ])).compose(
			[
					dc.lineChart(businessChart).dimension(yearDim).colors(
							'green').renderArea(true).group(residentGr,
							"RESIDENT"),

					dc.lineChart(businessChart).dimension(yearDim).renderArea(
							true).group(nonresidentGr, "NONRESIDENT"),

					dc.lineChart(businessChart).dimension(yearDim)
							.colors('red').renderArea(true).group(
									nonCommercialGr, "NONCOMMERCIAL")

			]);

	// // JOBS BY STAGE
	jobsBarChart.width(800).height(150).margins({
		top : 50,
		right : 100,
		bottom : 50,
		left : 100
	}).transitionDuration(500).dimension(yearDim).group(jbsAllGr)
			.elasticY(true).yAxisPadding(100).elasticX(true).xAxisPadding(500)
			.x(d3.time.scale().domain([ minDate, maxDate ])).round(
					d3.time.year.round).xUnits(d3.time.years).centerBar(true)
			.brushOn(false).title(function(d) {
				return "Value: " + d.value;
			}).renderTitle(true).yAxis().ticks(3);

	jobsChart.width(800).height(400).margins({
		top : 120,
		right : 100,
		bottom : 60,
		left : 100
	}).transitionDuration(500).dimension(yearDim).group(jbsAllGr)
			.elasticY(true).yAxisPadding(100).elasticX(true).yAxisLabel(
					"Number of Business").legend(
					dc.legend().x(80).y(20).itemHeight(13).gap(5)).x(
					d3.time.scale().domain([ minDate, maxDate ])).compose(
					[

							dc.lineChart(jobsChart).dimension(yearDim).colors(
									'red').renderArea(true).group(jbs10Gr,
									"10-99 EMPLOYEES"),

							dc.lineChart(jobsChart).dimension(yearDim).colors(
									'pink').renderArea(true).group(jbs100Gr,
									"100-499 EMPLOYEES"),

							dc.lineChart(jobsChart).dimension(yearDim)
									.renderArea(true).colors('gray').group(
											jbs500Gr, "500+ EMPLOYEES"),

							dc.lineChart(jobsChart).dimension(yearDim).colors(
									'green').renderArea(true).group(jbs1Gr,
									"SELF EMPLOYEE"),

							dc.lineChart(jobsChart).dimension(yearDim)
									.renderArea(true).group(jbs2Gr,
											"2-9 EMPLOYEES")

					]);
	// bubble图
	combine_chart.width(1800).height(400).margins({
		top : 20,
		right : 200,
		bottom : 50,
		left : 100
	}).transitionDuration(500).dimension(yearDim).group(bubbleGr).keyAccessor(
			function(p) {
				return p.value.x;
			}).valueAccessor(function(p) {
		return p.value.yavg;
	}).radiusValueAccessor(function(p) {
		return p.value.ravg;
	}).colors(
			[ "#a60000", "#ff0000", "#ff4040", "#ff7373", "#67e667", "#39e639",
					"#00cc00" ]).colorDomain([ min_bc, max_bc ]).colorAccessor(
			function(d, i) {
				return +d.value.cavg;
			}).maxBubbleRelativeSize(0.05).xAxisLabel('Sales Per Employee')
			.yAxisLabel('Sales Per Business').x(
					d3.scale.linear().domain([ min_bx, max_bx ])).y(
					d3.scale.linear().domain([ min_by, max_by ])).r(
					d3.scale.log().domain([ 10, 40 ])).elasticRadius(true)
			.sortBubbleSize(true).elasticY(true).yAxisPadding(300).elasticX(
					true).xAxisPadding(300).renderHorizontalGridLines(true)
			.renderVerticalGridLines(true).renderLabel(true).renderTitle(true)
			.label(function(p) {
				return p.key.getFullYear();
			}).title(
					function(p) {
						// console.log(p);
						return p.key.getFullYear() + "\n" + "Index Gain: "
								+ numberFormat(p.value.cavg) + "\n"
								+ "Sales Per Employee: "
								+ numberFormat(p.value.x) + "\n"
								+ "Sales Per Business: "
								+ numberFormat(p.value.yavg) + "\n"
								+ "Total Jobs:" + numberFormat(p.value.rtotal);
					});

	glChart.width(800).height(400).dimension(gainOrLoss).group(gainOrLossGroup)
			.label(
					function(d) {
						return d.key + "("
								+ (d.value / all.value() * 100).toFixed(1)
								+ "%)";
					});
	dc.renderAll();
}
