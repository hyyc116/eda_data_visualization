queue().defer(d3.json, '/public/static/gejson/us-states.json').defer(d3.csv,
		'/public/static/data/indeed.csv').await(visualize);

function visualize(error, statesJson, indeed) {
	if (error) {
		console.log(error);
	}

	vizIndeed(statesJson, indeed);

}

function vizIndeed(statesJson, indeed) {
	// 对于indeed，主要有时间和salary的数量
	var dayTime = d3.time.format("%Y-%m-%d");
	indeed.forEach(function(d) {
		d['publishdate'] = dayTime.parse(d['publishdate']);
		d["publishdate"].setMinutes(0);
		d["publishdate"].setSeconds(0);
		d['salary'] = +d['salary'];
	});
	var indeedndx = crossfilter(indeed);
	// indeed的所有图
//	 var noj_chart = dc.barChart("#noj_chart");
	var indeed_job_map = dc.geoChoroplethChart("#dom-chart");
	var t10j_chart = dc.rowChart('#t10j-chart');
	var t10c_chart = dc.rowChart('#t10c-chart');
	var tjn_chart = dc.numberDisplay('#rjs-chart');
	var avg_income_chart = dc.numberDisplay('#ai-chart');
	var sd_chart = dc.rowChart('#sd-chart');

	// indeed 中所有的维度
	var indeedStateDim = indeedndx.dimension(function(d) {
		return d['state'];
	});
	var indeedJobDim = indeedndx.dimension(function(d) {
		return d['jobtype'];
	});
	var indeedCompanyDim = indeedndx.dimension(function(d) {
		return d['company'];
	});
//	var indeedTimeDim = indeedndx.dimension(function(d) {
//		return d['publishdate'];
//	});

	var indeedSalaryDim = indeedndx.dimension(function(d) {
		if (+d['salary'] <= 10) {
			return '0-10';
		} else if (+d['salary'] < 50) {
			return '10-50';
		} else if (+d['salary'] < 100) {
			return '50-100';
		} else if (+d['salary'] < 500) {
			return '100-500';
		} else {
			return '500+';
		}
	});
//	var minTime = indeedTimeDim.bottom(1)[0]["publishdate"];
//	var maxTime = indeedTimeDim.top(1)[0]["publishdate"];

	var Top10JobGr = indeedJobDim.group();
	var Top10ComGr = indeedCompanyDim.group();
	var salaryGr = indeedSalaryDim.group();
	// var maxJob = Top10JobGr.top(1)[0].value;
	// var maxCom = Top10ComGr.top(1)[0].value;

//	console.log(minTime);
//	console.log(maxTime);
	// 所有的group的声明在这里

	sd_chart.width(800).height(350).margins({
		top : 10,
		right : 50,
		bottom : 20,
		left : 20
	}).dimension(indeedSalaryDim).group(salaryGr).transitionDuration(500).elasticX(true).xAxis().ticks(4);

	// indeed图所需要的group
	// job数量随着时间的变化曲线的group,相同时间的相加
//	var noj_changes_group = indeedTimeDim.group();
	var job_map_group = indeedStateDim.group();
	var maxStateJob = job_map_group.top(1)[0].value;
	var indeedall = indeedndx.groupAll();
	var reducer = reductio();
	reducer.count(true).sum(function(d) {
		return +d['salary'];
	}).avg(true);
	reducer(indeedall);
	// job的总数量
	tjn_chart.formatNumber(d3.format("d")).valueAccessor(function(d) {
		return d.count;
	}).group(indeedall);
	
	// job的salary的平均值
	avg_income_chart.formatNumber(d3.format(".2f")).valueAccessor(function(d) {
		return d.avg;
	}).group(indeedall);
	//	
	// top 10 Jobs
	t10j_chart.width(400).height(450).dimension(indeedJobDim).group(Top10JobGr)
			.elasticX(true).cap(10).othersGrouper(null).labelOffsetY(10)
			.xAxis().ticks(4);

	// top 10 Jobs
	t10c_chart.width(400).height(450).dimension(indeedCompanyDim).group(
			Top10ComGr).cap(10).othersGrouper(null).elasticX(true)
			.labelOffsetY(10).xAxis().ticks(4);
	//	
//	 // indeed 中job数量随着天数的变化曲线
//	 noj_chart.width(800).height(400).margins({
//	 top : 50,
//	 right : 100,
//	 bottom : 50,
//	 left : 100
//	 }).transitionDuration(500).dimension(indeedTimeDim)
//	 .group(noj_changes_group).elasticY(true).yAxisPadding(100).x(
//	 d3.time.scale().domain([ minTime, maxTime ]))
//	 .elasticY(true).yAxis().ticks(4);

	// ye的美国地图Charts
	indeed_job_map.width(800).height(400).dimension(indeedStateDim).group(
			job_map_group).colors(
			[ "#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF",
					"#36A2FF", "#1E96FF", "#0089FF", "#0061B5" ]).colorDomain(
			[ 0, maxStateJob ]).overlayGeoJson(statesJson["features"], "state",
			function(d) {
				return d.properties.name;
			})
			.projection(d3.geo.albersUsa().scale(800).translate([ 400, 200 ]))
			.title(
					function(p) {
						return "State: " + p["key"] + "\n"
								+ "Total Number of Jobs: "
								+ Math.round(p["value"]) + " ";
					});

	dc.renderAll();
}
