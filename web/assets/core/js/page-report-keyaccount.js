'use strict';

viewModel.breakdown = new Object();
var kac = viewModel.breakdown;

kac.contentIsLoading = ko.observable(false);
kac.popupIsLoading = ko.observable(false);
kac.title = ko.observable('Key Account Analysis');
kac.detail = ko.observableArray([]);
kac.limit = ko.observable(10);
kac.breakdownNote = ko.observable('');

kac.breakdownBy = ko.observable('customer.customergroupname');
kac.breakdownByFiscalYear = ko.observable('date.fiscal');
kac.oldBreakdownBy = ko.observable(kac.breakdownBy());

kac.data = ko.observableArray([]);
kac.fiscalYear = ko.observable(rpt.value.FiscalYear());
kac.breakdownValue = ko.observableArray([]);
kac.breakdownGroupValue = ko.observableArray([]);

kac.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	if (kac.breakdownValue().length == 0) {
		toolkit.showError('Please choose at least breakdown value');
		return;
	}

	var breakdownKeyAccount = 'customer.keyaccount',
	    breakdownKeyChannel = 'customer.channelname',
	    breakdownTransactionSource = 'trxsrc';
	var param = {};
	param.pls = [];
	param.groups = rpt.parseGroups([kac.breakdownBy(), breakdownKeyAccount, breakdownKeyChannel, breakdownTransactionSource]);
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, kac.fiscalYear);

	param.filters.push({
		Field: "customer.channelname",
		Op: "$in",
		Value: rpt.masterData.Channel().map(function (d) {
			return d._id;
		}).filter(function (d) {
			return d != "EXP";
		})
	});

	var breakdownGroupValue = kac.breakdownGroupValue().filter(function (d) {
		return d != 'All';
	});
	if (breakdownGroupValue.length > 0) {
		param.filters.push({
			Field: breakdownKeyAccount,
			Op: '$in',
			Value: kac.breakdownGroupValue()
		});
	}

	var breakdownValue = kac.breakdownValue().filter(function (d) {
		return d != 'All';
	});
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: kac.breakdownBy(),
			Op: '$in',
			Value: kac.breakdownValue()
		});
	}
	console.log("bdk", param.filters);

	kac.oldBreakdownBy(kac.breakdownBy());
	kac.contentIsLoading(true);

	var fetch = function fetch() {
		rpt.injectMonthQuarterFilter(param.filters);
		toolkit.ajaxPost(viewModel.appName + "report/getpnldatanew", param, function (res) {
			if (res.Status == "NOK") {
				setTimeout(function () {
					fetch();
				}, 1000 * 5);
				return;
			}

			if (rpt.isEmptyData(res)) {
				kac.contentIsLoading(false);
				return;
			}

			var date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss");
			kac.breakdownNote('Last refreshed on: ' + date);

			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels);
			kac.data(kac.buildStructure(res.Data.Data));
			rpt.plmodels(res.Data.PLModels);
			kac.emptyGrid();
			kac.contentIsLoading(false);
			kac.render();
			rpt.prepareEvents();
		}, function () {
			kac.emptyGrid();
			kac.contentIsLoading(false);
		}, {
			cache: useCache == true ? 'breakdown chart' : false
		});
	};

	fetch();
};

kac.clickExpand = function (e) {
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
kac.emptyGrid = function () {
	$('#key-account-analysis').replaceWith('<div class="breakdown-view ez" id="key-account-analysis"></div>');
};

kac.buildStructure = function (data) {
	data.filter(function (d) {
		return d._id._id_customer_customergroupname === 'Other';
	}).forEach(function (d) {
		if (d._id._id_trxsrc == 'VDIST') {
			switch (d._id._id_customer_channelname) {
				case 'General Trade':
				case 'Modern Trade':
					d._id._id_customer_customergroupname = 'Other - ' + d._id._id_customer_channelname;
					return;
			}
			// } else if (d._id._id_trxsrc == 'pushrdreversesbymks') {
			// 	d._id._id_customer_customergroupname = 'Other - Reclass to RD'
			// 	return
		}

		d._id._id_customer_customergroupname = 'Other - Reclass to RD';
		// d._id._id_customer_customergroupname = 'Other'
	});

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
		return d._id['_id_' + toolkit.replace(kac.breakdownBy(), '.', '_')];
	}).map(function (d) {
		d.breakdowns = d.subs[0]._id;
		d.count = 1;

		return d;
	});

	var newParsed = _.orderBy(parsed, function (d) {
		return d.PL8A;
	}, 'desc');
	return newParsed;
};

kac.render = function () {
	if (kac.data().length == 0) {
		$('#key-account-analysis').html('No data found.');
		return;
	}

	var rows = [];

	var data = kac.data();
	var plmodels = _.sortBy(rpt.plmodels(), function (d) {
		return parseInt(d.OrderIndex.replace(/PL/g, ''));
	});
	var exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */];
	var netSalesPLCode = 'PL8A';
	var netSalesRow = {};
	var grossSalesPLCode = 'PL0';
	var grossSalesRow = {};
	var discountActivityPLCode = 'PL7A';

	rpt.fixRowValue(data);

	data.forEach(function (e) {
		var breakdown = e._id;
		netSalesRow[breakdown] = e[netSalesPLCode];
		grossSalesRow[breakdown] = e[grossSalesPLCode];
	});
	data = _.orderBy(data, function (d) {
		if (d._id == 'Other - Modern Trade') {
			return -100000000000;
		} else if (d._id == 'Other - General Trade') {
			return -100000000001;
		} else if (d._id == 'Other - Reclass to RD') {
			return -100000000002;
		} else if (d._id == 'Other') {
			return -100000000003;
		}

		return netSalesRow[d._id];
	}, 'desc');

	plmodels.forEach(function (d) {
		var row = { PNL: d.PLHeader3, PLCode: d._id, PNLTotal: 0, Percentage: 0 };
		data.forEach(function (e) {
			var breakdown = e._id;
			var value = e['' + d._id];
			value = toolkit.number(value);
			row[breakdown] = value;
			row.PNLTotal += value;
		});
		data.forEach(function (e) {
			var breakdown = e._id;
			var percentage = toolkit.number(e['' + d._id] / row.PNLTotal) * 100;
			percentage = toolkit.number(percentage);

			if (d._id == discountActivityPLCode) {
				percentage = toolkit.number(row[breakdown] / grossSalesRow[breakdown]) * 100;
			} else if (d._id != netSalesPLCode) {
				percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100;
			}

			if (percentage < 0) percentage = percentage * -1;

			row[breakdown + ' %'] = percentage;
		});

		if (exceptions.indexOf(row.PLCode) > -1) {
			return;
		}

		rows.push(row);
	});

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

	var percentageWidth = 100;

	var wrapper = toolkit.newEl('div').addClass('pivot-pnl').appendTo($('#key-account-analysis'));

	var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader1 = toolkit.newEl('tr').appendTo(tableHeader);

	toolkit.newEl('th').html('P&L').css('height', rpt.rowHeaderHeight() + 'px').appendTo(trHeader1);

	toolkit.newEl('th').html('Total').css('height', rpt.rowHeaderHeight() + 'px').addClass('align-right').appendTo(trHeader1);

	toolkit.newEl('th').html('% of N Sales').css('height', rpt.rowHeaderHeight() + 'px').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).addClass('align-right').appendTo(trHeader1);

	var trContent1 = toolkit.newEl('tr').appendTo(tableContent);

	var colWidth = 160;
	var totalWidth = 0;
	var pnlTotalSum = 0;

	if (kac.breakdownBy() == "customer.branchname") {
		colWidth = 200;
	}

	if (kac.breakdownBy() == "customer.region") {
		colWidth = 230;
	}

	data.forEach(function (d, i) {
		if (d._id.length > 22) colWidth += 30;
		toolkit.newEl('th').html(d._id.replace(/ /g, "&nbsp;")).addClass('align-right').appendTo(trContent1).width(colWidth);

		toolkit.newEl('th').html('%&nbsp;of&nbsp;N&nbsp;Sales').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth).addClass('align-right cell-percentage').appendTo(trContent1).width(percentageWidth);

		if (rpt.percentOfTotal() == true) {
			toolkit.newEl('th').html('%&nbsp;of&nbsp;N&nbsp;Total').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth).addClass('align-right cell-percentage').appendTo(trContent1).width(percentageWidth);
		}

		totalWidth += colWidth + percentageWidth;
	});
	// console.log('data ', data)

	tableContent.css('min-width', totalWidth);

	// console.log('row ', rows)
	rows.forEach(function (d, i) {
		pnlTotalSum += d.PNLTotal;

		var PL = d.PLCode;
		PL = PL.replace(/\s+/g, '');
		var trHeader = toolkit.newEl('tr').addClass('header' + PL).attr('idheaderpl', PL).attr('data-row', 'row-' + i).appendTo(tableHeader).css('height', rpt.rowContentHeight() + 'px');

		trHeader.on('click', function () {
			kac.clickExpand(trHeader);
		});

		toolkit.newEl('td').html('<i></i>' + d.PNL).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.PNLTotal, 'n0');
		toolkit.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		toolkit.newEl('td').html(kendo.toString(d.Percentage, 'n2') + '%').addClass('align-right').appendTo(trHeader);

		var trContent = toolkit.newEl('tr').addClass('column' + PL).attr('data-row', 'row-' + i).attr('idpl', PL).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

		data.forEach(function (e, f) {
			var key = e._id;
			var value = kendo.toString(d[key], 'n0');

			var percentage = kendo.toString(d[key + ' %'], 'n2');

			if ($.trim(value) == '') {
				value = 0;
			}

			var cell = toolkit.newEl('td').html(value).addClass('align-right').appendTo(trContent);

			toolkit.newEl('td').html(percentage + ' %').addClass('align-right cell-percentage').appendTo(trContent);

			if (rpt.percentOfTotal() == true) {
				var percentagetotal = 0;
				if (d['PNLTotal'] != 0) percentagetotal = kendo.toString(d['' + key] / d['PNLTotal'] * 100, 'n2');
				toolkit.newEl('td').html(percentagetotal + ' %').addClass('align-right cell-percentage').appendTo(trContent);
			}
		});

		rpt.putStatusVal(trHeader, trContent);
	});

	rpt.buildGridLevels(rows);
};

kac.optionBreakdownValues = ko.observableArray([]);
kac.breakdownValueAll = { _id: 'All', Name: 'All' };
kac.changeBreakdown = function () {
	var all = kac.breakdownValueAll;
	setTimeout(function () {
		kac.optionBreakdownValues([all].concat(rpt.masterData.CustomerGroup().map(function (d) {
			return { _id: d.Name, Name: d.Name };
		})));
		kac.breakdownValue([all._id]);
	}, 100);
};
kac.changeBreakdownValue = function () {
	var all = kac.breakdownValueAll;
	setTimeout(function () {
		var condA1 = kac.breakdownValue().length == 2;
		var condA2 = kac.breakdownValue().indexOf(all._id) == 0;
		if (condA1 && condA2) {
			kac.breakdownValue.remove(all._id);
			return;
		}

		var condB1 = kac.breakdownValue().length > 1;
		var condB2 = kac.breakdownValue().reverse()[0] == all._id;
		if (condB1 && condB2) {
			kac.breakdownValue([all._id]);
			return;
		}

		var condC1 = kac.breakdownValue().length == 0;
		if (condC1) {
			kac.breakdownValue([all._id]);
		}
	}, 100);
};

kac.optionBreakdownGroupValues = ko.observableArray([]);
kac.changeBreakdownGroup = function () {
	var all = kac.breakdownValueAll;
	setTimeout(function () {
		kac.optionBreakdownGroupValues([all].concat(rpt.masterData.KeyAccount().map(function (d) {
			var name = '(' + d._id + ') ' + d.Name;
			if (d.Name == 'OTHER') {
				name = d.Name;
			}

			return { _id: d._id, Name: name };
		})));
		kac.breakdownGroupValue([all._id]);
	}, 100);
};
kac.changeBreakdownGroupValue = function () {
	var all = kac.breakdownValueAll;
	setTimeout(function () {
		var condA1 = kac.breakdownGroupValue().length == 2;
		var condA2 = kac.breakdownGroupValue().indexOf(all._id) == 0;
		if (condA1 && condA2) {
			kac.breakdownGroupValue.remove(all._id);
			return;
		}

		var condB1 = kac.breakdownGroupValue().length > 1;
		var condB2 = kac.breakdownGroupValue().reverse()[0] == all._id;
		if (condB1 && condB2) {
			kac.breakdownGroupValue([all._id]);
			return;
		}

		var condC1 = kac.breakdownGroupValue().length == 0;
		if (condC1) {
			kac.breakdownGroupValue([all._id]);
		}
	}, 100);
};

vm.currentMenu('Analysis');
vm.currentTitle('Key Account Analysis');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis', href: '#' }, { title: 'Key Account Analysis', href: '#' }]);

kac.title('&nbsp;');

rpt.refresh = function () {
	kac.changeBreakdown();
	kac.changeBreakdownGroup();
	setTimeout(function () {
		kac.breakdownValue(['All']);
		kac.breakdownGroupValue(['All']);
		kac.refresh(false);
	}, 200);
};

$(function () {
	rpt.percentOfTotal(true);
	rpt.refresh();
	rpt.showExport(true);
});