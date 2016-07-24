'use strict';

viewModel.dynamic = new Object();
var rd = viewModel.dynamic;

rd.optionDivide = ko.observableArray([{ field: 'v1', name: 'Actual' }, { field: 'v1000', name: 'Hundreds' }, { field: 'v1000000', name: 'Millions' }, { field: 'v1000000000', name: 'Billions' }]);
rd.divideBy = ko.observable('v1000000000');
rd.divider = function () {
	return toolkit.getNumberFromString(rd.divideBy());
};
rd.contentIsLoading = ko.observable(false);
rd.breakdownBy = ko.observable('');
rd.series = ko.observableArray([]);
rd.limit = ko.observable(6);
rd.data = ko.observableArray([]);
rd.fiscalYear = ko.observable(rpt.value.FiscalYear());
rd.useLimit = ko.computed(function () {
	switch (rd.breakdownBy()) {
		case 'customer.channelname':
		case 'date.quartertxt':
		case 'date.month':
			return false;
		default:
			return true;
	}
}, rd.breakdownBy);

rd.refresh = function () {
	var param = {};
	param.pls = [];
	param.groups = rpt.parseGroups([rd.breakdownBy()]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, rd.fiscalYear);

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				rd.contentIsLoading(false);
				return;
			}

			rd.contentIsLoading(false);
			rd.data(res.Data.Data);
			rd.render();
		}, function () {
			rd.contentIsLoading(false);
		});
	};

	rd.contentIsLoading(true);
	fetch();
};

rd.render = function () {
	var op1 = _.groupBy(rd.data(), function (d) {
		return d._id['_id_' + toolkit.replace(rd.breakdownBy(), '.', '_')];
	});
	var op2 = _.map(op1, function (v, k) {
		v = _.orderBy(v, function (e) {
			return e._id._id_date_fiscal;
		}, 'asc');

		var o = {};
		o.breakdown = k;

		rd.series().forEach(function (d) {
			if (toolkit.isString(d.callback)) {
				o[d._id] = toolkit.sum(v, function (e) {
					return e[d.callback];
				}) / rd.divider();
			} else {
				o[d._id] = d.callback(v, k);
			}
		});

		return o;
	});
	var op3 = _.orderBy(op2, function (d) {
		return d[rd.series()[0]._id];
	}, 'desc');
	if (rd.limit() != 0 && rd.useLimit()) {
		op3 = _.take(op3, rd.limit());
	}

	var width = $('#tab1').width();
	if (_.min([rd.limit(), op3.length]) > 6) {
		width = 160 * rd.limit();
	}
	if (width == $('#tab1').width()) {
		width = width - 22 + 'px';
	}

	var axes = [];

	var series = rd.series().map(function (d, i) {
		var color = toolkit.seriesColorsGodrej[i % toolkit.seriesColorsGodrej.length];

		var o = {};
		o.field = d._id;
		o.name = d.plheader;
		o.axis = 'axis' + (i + 1);
		o.color = color;
		o.tooltip = {
			visible: true,
			template: function template(e) {
				var val = kendo.toString(e.value, 'n1');
				return e.series.name + ' : ' + val;
			}
		};
		o.labels = {
			visible: true,
			template: function template(e) {
				var val = kendo.toString(e.value, 'n1');
				return val;
				// return `${e.series.name}\n${val}`
			}
		};

		axes.push({
			name: 'axis' + (i + 1),
			title: { text: d.plheader },
			majorGridLines: { color: '#fafafa' },
			labels: {
				font: '"Source Sans Pro" 11px',
				format: "{0:n2}"
			},
			color: color
		});

		return o;
	});

	console.log('-----', axes);
	console.log('-----', series);

	var categoryAxis = {
		field: 'breakdown',
		labels: {
			font: '"Source Sans Pro" 11px',
			format: "{0:n2}"
		},
		majorGridLines: { color: '#fafafa' },
		axisCrossingValues: [op3.length, 0, 0]
	};

	var config = {
		dataSource: { data: op3 },
		legend: {
			visible: true,
			position: "bottom"
		},
		seriesDefaults: {
			type: "column",
			style: "smooth",
			missingValues: "gap",
			line: {
				border: {
					width: 1,
					color: 'white'
				}
			},
			overlay: { gradient: 'none' },
			border: { width: 0 }
		},
		series: series,
		valueAxis: axes.reverse(),
		categoryAxis: categoryAxis
	};

	rd.configure(config);

	$('.report').replaceWith('<div class="report" style="width: ' + width + 'px;"></div>');
	$('.report').kendoChart(config);
};

rd.configure = function (config) {
	config.series[2].labels.template = function (e) {
		var val = kendo.toString(e.value, 'n1');
		return val + ' %';
	};
};

rd.getQueryStringValue = function (key) {
	return unescape(window.location.search.replace(new RegExp("^(?:.*[&\\?]" + escape(key).replace(/[\.\+\*]/g, "\\$&") + "(?:\\=([^&]*))?)?.*$", "i"), "$1"));
};

rd.setup = function () {
	rd.breakdownBy('customer.channelname');

	switch (rd.getQueryStringValue('p')) {
		case 'sales-return-rate':
			{
				vm.currentTitle('Sales Return Rate');
				rd.series = ko.observableArray([{
					_id: 'salesreturn',
					plheader: 'Sales Return',
					callback: function callback(v, k) {
						return toolkit.number(Math.abs(toolkit.sum(v, function (e) {
							return e.salesreturn;
						})) / rd.divider());
					}
				}, {
					_id: 'salesrevenue',
					plheader: 'Sales Revenue',
					callback: 'PL8A'
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var salesreturn = Math.abs(toolkit.sum(v, function (e) {
							return e.salesreturn;
						})) / rd.divider();
						var netsales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						})) / rd.divider();
						return toolkit.number(salesreturn / netsales) * 100;
					}
				}]);
			}break;

		case 'sales-discount-by-gross-sales':
			{
				vm.currentTitle('Sales Discount by Gross Sales');
				rd.series = ko.observableArray([{
					_id: 'salesdiscount',
					plheader: 'Sales Discount',
					callback: function callback(v, k) {
						var salesDiscount = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL7', 'PL8'], function (f) {
								return toolkit.number(e[f]);
							});
						}));

						return salesDiscount / rd.divider();
					}
				}, {
					_id: 'grosssales',
					plheader: 'Gross Sales',
					callback: 'PL0'
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var salesDiscount = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL7', 'PL8'], function (f) {
								return toolkit.number(e[f]);
							});
						}));
						var grossSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL0;
						}));

						return toolkit.number(salesDiscount / grossSales) * 100;
					}
				}]);
			}break;

		case 'gross-sales-by-qty':
			{
				vm.currentTitle('Gross Sales / Qty');
				rd.divideBy('v1000000');
				rd.series = ko.observableArray([{
					_id: 'grosssales',
					plheader: 'Gross Sales',
					callback: 'PL0'
				}, {
					_id: 'salesqty',
					plheader: 'Quantity',
					callback: function callback(v, k) {
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));
						return quantity / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var grossSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL0;
						}));
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));

						return toolkit.number(grossSales / quantity) * 100;
					}
				}]);

				rd.configure = function (config) {
					config.series[2].labels.template = function (e) {
						var val = kendo.toString(e.value, 'n1');
						return val + ' %';
					};
				};
			}break;

		case 'discount-by-qty':
			{
				vm.currentTitle('Discount / Qty');
				rd.divideBy('v1000000');
				rd.series = ko.observableArray([{
					_id: 'salesdiscount',
					plheader: 'Sales Discount',
					callback: function callback(v, k) {
						var salesDiscount = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL7', 'PL8'], function (f) {
								return toolkit.number(e[f]);
							});
						}));

						return salesDiscount / rd.divider();
					}
				}, {
					_id: 'salesqty',
					plheader: 'Quantity',
					callback: function callback(v, k) {
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));
						return quantity / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var salesDiscount = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL7', 'PL8'], function (f) {
								return toolkit.number(e[f]);
							});
						}));
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));

						return toolkit.number(salesDiscount / quantity) * 100;
					}
				}]);

				rd.configure = function (config) {
					config.series[2].labels.template = function (e) {
						var val = kendo.toString(e.value, 'n1');
						return val + ' %';
					};
				};
			}break;

		case 'net-price-by-qty':
			{
				vm.currentTitle('Net Price / Qty');
				rd.divideBy('v1000000');
				rd.series = ko.observableArray([{
					_id: 'netprice',
					plheader: 'Net Price',
					callback: function callback(v, k) {
						var amount = Math.abs(toolkit.sum(v, function (e) {
							return e.netamount;
						}));

						return amount / rd.divider();
					}
				}, {
					_id: 'salesqty',
					plheader: 'Quantity',
					callback: function callback(v, k) {
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));
						return quantity / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var amount = Math.abs(toolkit.sum(v, function (e) {
							return e.netamount;
						}));
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));

						return toolkit.number(amount / quantity) * 100;
					}
				}]);

				rd.configure = function (config) {
					config.series[2].labels.template = function (e) {
						var val = kendo.toString(e.value, 'n1');
						return val + ' %';
					};
				};
			}break;

		case 'btl-by-qty':
			{
				vm.currentTitle('BTL / Qty');
				rd.divideBy('v1000000');
				rd.series = ko.observableArray([{
					_id: 'btl',
					plheader: 'BTL',
					callback: function callback(v, k) {
						var btl = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL29', 'PL30', 'PL31', 'PL32'], function (f) {
								return toolkit.number(e[f]);
							});
						}));

						return btl / rd.divider();
					}
				}, {
					_id: 'salesqty',
					plheader: 'Quantity',
					callback: function callback(v, k) {
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));
						return quantity / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var btl = Math.abs(toolkit.sum(v, function (e) {
							return toolkit.sum(['PL29', 'PL30', 'PL31', 'PL32'], function (f) {
								return toolkit.number(e[f]);
							});
						}));
						var quantity = Math.abs(toolkit.sum(v, function (e) {
							return e.salesqty;
						}));

						return toolkit.number(btl / quantity) * 100;
					}
				}]);

				rd.configure = function (config) {
					config.series[2].labels.template = function (e) {
						var val = kendo.toString(e.value, 'n1');
						return val + ' %';
					};
				};
			}break;

		case 'freight-cost-by-sales':
			{
				vm.currentTitle('Freight Cost by Sales');
				rd.series = ko.observableArray([{
					_id: 'freightcost',
					plheader: 'Freight Cost',
					callback: function callback(v, k) {
						var freightCost = Math.abs(toolkit.sum(v, function (e) {
							return e.PL23;
						}));

						return freightCost / rd.divider();
					}
				}, {
					_id: 'netsales',
					plheader: 'Net Sales',
					callback: function callback(v, k) {
						var netSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return netSales / rd.divider();
					}
				}, {
					_id: 'prcnt',
					plheader: vm.currentTitle(),
					callback: function callback(v, k) {
						var freightCost = Math.abs(toolkit.sum(v, function (e) {
							return e.PL23;
						}));
						var netSales = Math.abs(toolkit.sum(v, function (e) {
							return e.PL8A;
						}));

						return toolkit.number(freightCost / netSales) * 100;
					}
				}]);
			}break;

		default:
			{
				location.href = viewModel.appName + "page/report";
			}break;
	}
};

vm.currentMenu('Analysis Ideas');
vm.currentTitle('Report Dynamic');
vm.breadcrumb([{ title: 'Godrej', href: viewModel.appName + 'page/landing' }, { title: 'Home', href: viewModel.appName + 'page/landing' }, { title: 'Growth Analysis', href: '#' }]);

$(function () {
	rd.setup();
	rd.refresh();
});