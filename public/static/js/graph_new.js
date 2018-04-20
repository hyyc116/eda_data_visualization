queue().defer(d3.json, 'https://d3js.org/us-10m.v1.json').defer(
		d3.csv, '/public/static/data/yedata.csv').await(visualize);

function visualize(error, mapJson, yedata) {
	if (error) {
		console.log('error');
		console.log(error);
	}
	console.log('great');
	// console.log(yedata[0]);
	console.log(mapJson);
	

	var dateformat = d3.time.format("%Y");
	yedata.forEach(function(d) {
		d['year'] = dateformat.parse(d["year"]);
	});

	var ndx = crossfilter(yedata);
	// 首先将map所需要的数据进行生成

	// 所在位置
	var us_map_chart = dc.geoChoroplethChart("#us-map-chart")
	// 声明dimension
	var usCountiesDim = ndx.dimension(function(d) {
//		 console.log(d['topoid']);
		if(+d['topoid']<10000){
			d['topoid'] = '0'+d['topoid'];
		}
		return d['topoid'];
	});
	// 地图上显示的每年各地的全部销售量
	var salesByCounty = usCountiesDim.group().reduceSum(function(d) {
		return +d['ALL SALES'];
	});
	// 倒序排列
	function orderValue(p) {
		return -p.value;
	}
	// county level 上 all sales 的 最大值 以及最小值
	county_max_num = salesByCounty.top(1)[0].value;
	county_min_num = salesByCounty.order(orderValue).top(1)[0].value
	console.log('max:' + county_max_num);
	console.log('min:' + county_min_num);
	
	var all = ndx.groupAll();
	var mapTopo = topojson.feature(mapJson, mapJson.objects.counties).features;
//	console.log(mapTopo[0]);
	// 根据 usCountiesDim, salesByCounty画地图
	us_map_chart.width(1000).height(600).dimension(usCountiesDim).group(salesByCounty)
			.colors(
					[ "#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF",
							"#51AEFF", "#36A2FF", "#1E96FF", "#0089FF",
							"#0061B5" ]).colorDomain([county_min_num, county_max_num ])
			.overlayGeoJson(mapTopo, "county", function(d) {
				return d.id;
			})
			.projection(d3.geo.equirectangular()
			        .scale(1050)
			        .rotate([-120, 0])
			        .translate([1000 / 2, 600 / 2]))
			.title(
					function(p) {
						console.log('test');
						return "County: " + p["key"] + "\n" + "Total Sales: "
								+ Math.round(p["value"]) + " ";
					});
//	console.log('Done')
	dc.renderAll();
}