'use strict';

viewModel.ebitsku = {};
var ebitsku = viewModel.ebitsku;

ebitsku.contentIsLoading = ko.observable(false);
ebitsku.breakdownBy = ko.observable('customer.channelname');
ebitsku.data = ko.observableArray([]);
ebitsku.fiscalYear = ko.observable(rpt.value.FiscalYear());
ebitsku.breakdownValue = ko.observableArray([]);
ebitsku.level = ko.observable(1);
ebitsku.breakdownBranchGroup = ko.observableArray([]);

ebitsku.optionFilterProduct = ko.observableArray([]);
ebitsku.filterProduct = ko.observableArray([]);

ebitsku.breakdownByClean = ko.computed(function () {
	if (ebitsku.breakdownBy() == 'product.skuid') {
		return 'product.name';
	}

	return ebitsku.breakdownBy();
});

ebitsku.optionDimensions = ko.observableArray([{ field: 'product.skuid', name: 'SKU' }].concat(rpt.optionDimensions().filter(function (d) {
	return d.field != "customer.branchgroup";
})));

// for ( var i in rpt.optionDimensions()){
// 	if (rpt.optionDimensions[i].field != "customer.branchgroup") {
// 		ebitsku.optionDimensions.push(rpt.optionDimensions[i])	
// 	}
// }


ebitsku.buildPLModels = function (plmodels) {
	return plmodels.filter(function (d) {
		if (['Direct Expense', 'Indirect Expense'].indexOf(d.PLHeader1) > -1) {
			return true;
		}

		if (["PL1", "PL7", "PL2", "PL8", "PL6", "PL0", "PL7A", "PL8A", "PL14A", "PL74A", "PL74B", "PL74C", "PL94B", "PL44B"].indexOf(d._id) > -1) {
			return true;
		}

		return false;
	});
};

ebitsku.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = [];
	param.groups = rpt.parseGroups([ebitsku.breakdownBy()]);
	param.aggr = 'sum';
	param.flag = 'ebitpersku';
	param.filters = rpt.getFilterValue(false, ebitsku.fiscalYear);

	param.filters.push({
		Field: "customer.channelname",
		Op: "$in",
		Value: rpt.masterData.Channel().map(function (d) {
			return d._id;
		}).filter(function (d) {
			return d != "EXP";
		}).filter(function (d) {
			return d != "I1";
		})
	});

	if (ebitsku.breakdownBy() == 'product.skuid') {
		param.groups.push('product.name');
	}

	if (ebitsku.filterProduct().length > 0) {
		param.filters.push({
			Field: 'product.skuid',
			Op: '$in',
			Value: ebitsku.filterProduct()
		});
	}

	var fetch = function fetch() {
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				ebitsku.contentIsLoading(false);
				return;
			}

			var date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss");

			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels);
			ebitsku.data(ebitsku.buildStructure(res.Data.Data));
			rpt.plmodels(ebitsku.buildPLModels(res.Data.PLModels));
			ebitsku.emptyGrid();
			ebitsku.contentIsLoading(false);
			ebitsku.render();
			rpt.prepareEvents();
			$('.headerPL14A,.headerPL74A').trigger('click');
		}, function () {
			ebitsku.emptyGrid();
			ebitsku.contentIsLoading(false);
		}, {
			cache: useCache == true ? 'breakdown chart' : false
		});
	};

	ebitsku.contentIsLoading(true);
	fetch();
};

ebitsku.clickExpand = function (e) {
	var right = $(e).find('i.fa-chevron-right').length,
	    down = 0;
	if (e.attr('idheaderpl') == 'PL0') down = $(e).find('i.fa-chevron-up').length;else down = $(e).find('i.fa-chevron-down').length;
	if (right > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', rpt.pnlTableHeaderWidth());
			$('.pivot-pnl .table-content').css('margin-left', rpt.pnlTableHeaderWidth());
		}

		$(e).find('i').removeClass('fa-chevron-right');
		if (e.attr('idheaderpl') == 'PL0') $(e).find('i').addClass('fa-chevron-up');else $(e).find('i').addClass('fa-chevron-down');
		$('tr[idparent=' + e.attr('idheaderpl') + ']').css('display', '');
		$('tr[idcontparent=' + e.attr('idheaderpl') + ']').css('display', '');
		$('tr[statusvaltemp=hide]').css('display', 'none');
		rpt.refreshHeight(e.attr('idheaderpl'));
		rpt.refreshchildadd(e.attr('idheaderpl'));
	}
	if (down > 0) {
		if (['PL28', 'PL29A', 'PL31'].indexOf($(e).attr('idheaderpl')) > -1) {
			$('.pivot-pnl .table-header').css('width', '');
			$('.pivot-pnl .table-content').css('margin-left', '');
		}

		$(e).find('i').removeClass('fa-chevron-up');
		$(e).find('i').removeClass('fa-chevron-down');
		$(e).find('i').addClass('fa-chevron-right');
		$('tr[idparent=' + e.attr('idheaderpl') + ']').css('display', 'none');
		$('tr[idcontparent=' + e.attr('idheaderpl') + ']').css('display', 'none');
		rpt.hideAllChild(e.attr('idheaderpl'));
	}
};

ebitsku.emptyGrid = function () {
	$('#ebitsku').replaceWith('<div class="breakdown-view ez" id="ebitsku"></div>');
};

ebitsku.buildStructure = function (data) {
	var groupThenMap = function groupThenMap(data, group) {
		var op1 = _.groupBy(data, function (d) {
			return group(d);
		});
		var op2 = _.map(op1, function (v, k) {
			var key = { _id: k, subs: v };
			var sample = v[0];

			var _loop = function _loop(prop) {
				if (sample.hasOwnProperty(prop) && prop != '_id') {
					key[prop] = toolkit.sum(v, function (d) {
						return d[prop];
					});
				}
			};

			for (var prop in sample) {
				_loop(prop);
			}

			return key;
		});

		return op2;
	};

	var parsed = groupThenMap(data, function (d) {
		return d._id['_id_' + toolkit.replace(ebitsku.breakdownByClean(), '.', '_')];
	}).map(function (d) {
		d.breakdowns = d.subs[0]._id;
		d.count = 1;

		return d;
	});

	ebitsku.level(1);
	var newParsed = _.orderBy(parsed, function (d) {
		return d.PL8A;
	}, 'desc');
	return newParsed;
};

ebitsku.render = function () {
	if (ebitsku.data().length == 0) {
		$('#ebitsku').html('No data found.');
		return;
	}

	// ========================= TABLE STRUCTURE

	var percentageWidth = 100;

	var wrapper = toolkit.newEl('div').addClass('pivot-pnl-branch pivot-pnl').appendTo($('#ebitsku'));

	var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader = toolkit.newEl('tr').appendTo(tableHeader);

	toolkit.newEl('th').html('P&L').css('height', rpt.rowHeaderHeight() * ebitsku.level() + 'px').attr('data-rowspan', ebitsku.level()).css('vertical-align', 'middle').addClass('cell-percentage-header').appendTo(trHeader);

	toolkit.newEl('th').html('Total').css('height', rpt.rowHeaderHeight() * ebitsku.level() + 'px').attr('data-rowspan', ebitsku.level()).css('vertical-align', 'middle').addClass('cell-percentage-header align-right').appendTo(trHeader);

	toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).css('height', rpt.rowHeaderHeight() * ebitsku.level() + 'px').css('vertical-align', 'middle').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).attr('data-rowspan', ebitsku.level()).addClass('cell-percentage-header align-right').appendTo(trHeader);

	var trContents = [];
	for (var i = 0; i < ebitsku.level(); i++) {
		trContents.push(toolkit.newEl('tr').appendTo(tableContent).css('height', rpt.rowHeaderHeight() + 'px'));
	}

	// ========================= BUILD HEADER

	var data = ebitsku.data();

	var columnWidth = 130;
	var totalColumnWidth = 0;
	var pnlTotalSum = 0;
	var dataFlat = [];

	var countWidthThenPush = function countWidthThenPush(thheader, each, key) {
		var currentColumnWidth = each._id.length * (ebitsku.breakdownByClean() == 'customer.channelname' ? 7 : 10);
		if (currentColumnWidth < columnWidth) {
			currentColumnWidth = columnWidth;
		}

		if (each.hasOwnProperty('width')) {
			currentColumnWidth = each.width;
		}

		each.key = key.join('_');
		dataFlat.push(each);

		totalColumnWidth += currentColumnWidth;
		thheader.width(currentColumnWidth);
	};

	data.forEach(function (lvl1, i) {
		var thheader1 = toolkit.newEl('th').html(lvl1._id.replace(/\ /g, '&nbsp;')).attr('colspan', lvl1.count).addClass('align-center').css('border-top', 'none').appendTo(trContents[0]);

		if (ebitsku.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id]);

			totalColumnWidth += percentageWidth;
			var thheader1p = toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);

			if (rpt.showPercentOfTotal()) {
				totalColumnWidth += percentageWidth;
				var _thheader1p = toolkit.newEl('th').html('% of Total'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[0]);
			}

			return;
		}
		thheader1.attr('colspan', lvl1.count * (rpt.showPercentOfTotal() ? 3 : 2));

		lvl1.subs.forEach(function (lvl2, j) {
			var thheader2 = toolkit.newEl('th').html(lvl2._id.replace(/\ /g, '&nbsp;')).addClass('align-center').appendTo(trContents[1]);

			if (ebitsku.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id]);

				totalColumnWidth += percentageWidth;
				var _thheader1p2 = toolkit.newEl('th').html('% of N Sales'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').appendTo(trContents[1]);

				if (rpt.showPercentOfTotal()) {
					totalColumnWidth += percentageWidth;
					toolkit.newEl('th').html('% of Total'.replace(/\ /g, '&nbsp;')).width(percentageWidth).addClass('align-center').css('font-weight', 'normal').css('font-style', 'italic').css('border-top', 'none').appendTo(trContents[1]);
				}

				return;
			}
			thheader2.attr('colspan', lvl2.count);
		});
	});

	tableContent.css('min-width', totalColumnWidth);

	// ========================= CONSTRUCT DATA

	var plmodels = _.sortBy(rpt.plmodels(), function (d) {
		return parseInt(d.OrderIndex.replace(/PL/g, ''));
	});
	var exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */];
	var netSalesPLCode = 'PL8A';
	var netSalesRow = {};
	var grossSalesPLCode = 'PL0';
	var grossSalesRow = {};
	var discountActivityPLCode = 'PL7A';
	var rows = [];

	rpt.fixRowValue(dataFlat);

	console.log("dataFlat", dataFlat);

	dataFlat.forEach(function (e) {
		var breakdown = e.key;
		netSalesRow[breakdown] = e[netSalesPLCode];
		grossSalesRow[breakdown] = e[grossSalesPLCode];
	});

	plmodels.forEach(function (d) {
		var row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 };
		dataFlat.forEach(function (e) {
			var breakdown = e.key;
			var value = e['' + d._id];
			row[breakdown] = value;

			if (toolkit.isDefined(e.excludeFromTotal)) {
				return;
			}

			row.PNLTotal += value;
		});
		dataFlat.forEach(function (e) {
			var breakdown = e.key;
			var percentage = 100;
			var percentageOfTotal = toolkit.number(row[breakdown] / row.PNLTotal) * 100;

			if (d._id == discountActivityPLCode) {
				percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100;
			} else if (d._id != netSalesPLCode) {
				percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100;
			}

			if (percentage < 0) percentage = percentage * -1;

			row[breakdown + ' %'] = percentage;
			row[breakdown + ' %t'] = percentageOfTotal;
		});

		if (exceptions.indexOf(row.PLCode) > -1) {
			return;
		}

		rows.push(row);
	});

	console.log("rows", rows);

	var TotalNetSales = _.find(rows, function (r) {
		return r.PLCode == netSalesPLCode;
	}).PNLTotal;
	var TotalGrossSales = _.find(rows, function (r) {
		return r.PLCode == grossSalesPLCode;
	}).PNLTotal;
	rows.forEach(function (d, e) {
		var TotalPercentage = d.PNLTotal / TotalNetSales * 100;
		if (d.PLCode == discountActivityPLCode) {
			TotalPercentage = d.PNLTotal / TotalGrossSales * 100;
		}

		if (TotalPercentage < 0) TotalPercentage = TotalPercentage * -1;
		rows[e].Percentage = toolkit.number(TotalPercentage);
	});

	// ========================= PLOT DATA

	rows.forEach(function (d, i) {
		pnlTotalSum += d.PNLTotal;

		var PL = d.PLCode;
		PL = PL.replace(/\s+/g, '');
		var trHeader = toolkit.newEl('tr').addClass('header' + PL).attr('idheaderpl', PL).attr('data-row', 'row-' + i).css('height', rpt.rowContentHeight() + 'px').appendTo(tableHeader);

		trHeader.on('click', function () {
			ebitsku.clickExpand(trHeader);
		});

		toolkit.newEl('td').html('<i></i>' + d.PNL).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.PNLTotal, 'n0');
		toolkit.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		toolkit.newEl('td').html(kendo.toString(d.Percentage, 'n2') + '&nbsp;%').addClass('align-right').appendTo(trHeader);

		var trContent = toolkit.newEl('tr').addClass('column' + PL).attr('idpl', PL).attr('data-row', 'row-' + i).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

		dataFlat.forEach(function (e, f) {
			var key = e.key;
			var value = kendo.toString(d[key], 'n0');
			var percentage = kendo.toString(d[key + ' %'], 'n2') + '&nbsp;%';
			var percentageOfTotal = kendo.toString(d[key + ' %t'], 'n2') + '&nbsp;%';

			if ($.trim(value) == '') {
				value = 0;
			}

			var cell = toolkit.newEl('td').html(value).addClass('align-right').appendTo(trContent);

			var cellPercentage = toolkit.newEl('td').html(percentage).addClass('align-right').appendTo(trContent);

			if (rpt.showPercentOfTotal()) {
				toolkit.newEl('td').html(percentageOfTotal).addClass('align-right').appendTo(trContent);
			}

			$([cell, cellPercentage]).on('click', function () {
				ebitsku.renderDetail(d.PLCode, e.breakdowns);
			});
		});

		rpt.putStatusVal(trHeader, trContent);
	});

	// ========================= CONFIGURE THE HIRARCHY
	rpt.buildGridLevels(rows);
};

ebitsku.fillProductData = function () {
	toolkit.ajaxPost(viewModel.appName + "report/getdataproduct", {}, function (res) {
		ebitsku.optionFilterProduct(res.data.map(function (d) {
			var o = {};
			o._id = d._id;
			o.Name = d._id + ' - ' + d.Name;

			return o;
		}));
	});
};

vm.currentMenu('Analysis');
vm.currentTitle('Ebit Per SKU Analysis');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis', href: '#' }, { title: 'Ebit Per SKU Analysis', href: '#' }]);

$(function () {
	$('#c-0 .form-group:eq(1)').remove();
	ebitsku.refresh();
	ebitsku.fillProductData();
	rpt.showExport(false);

	$('#c-0 .form-group:eq(1)').remove();
});