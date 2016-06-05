'use strict';

viewModel.table = new Object();
var tbl = viewModel.table;

tbl.data = ko.observableArray([]);
tbl.currentTargetDimension = null;

tbl.dimensions = ko.observableArray([]);
tbl.dataPoints = ko.observableArray([]);
tbl.enableDimensions = ko.observable(true);
tbl.enableDataPoints = ko.observable(true);

tbl.setMode = function (what) {
	return function () {
		tbl.mode(what);

		if (what == 'render') {
			tbl.refresh();
		}
	};
};
tbl.mode = ko.observable('render');
tbl.computeDimensionDataPoint = function (which, field) {
	return ko.pureComputed({
		read: function read() {
			return tbl[which]().filter(function (d) {
				return d.field() == field;
			}).length > 0;
		},
		write: function write(value) {
			var row = tbl[which]().find(function (d) {
				return d.field() == field;
			});
			if (app.isDefined(row)) {
				tbl[which].remove(row);
			} else {
				var option = which == 'dataPoint' ? 'optionDataPoints' : 'optionDimensions';
				row = app.koMap(app.koUnmap(ra[option]).find(function (d) {
					return d.field == field;
				}));
				tbl[which].push(row);
			}
		},
		owner: undefined
	});
};
tbl.getParam = function () {
	var dimensions = ko.mapping.toJS(tbl.dimensions).filter(function (d) {
		return d.field != '';
	});
	var dataPoints = ko.mapping.toJS(tbl.dataPoints).filter(function (d) {
		return d.field != '' && d.field != '';
	}).map(function (d) {
		return { field: d.field, name: d.name, aggr: 'sum' };
	});

	return ra.wrapParam('table', dimensions, dataPoints);
};
tbl.refresh = function () {
	// pvt.data(DATATEMP_TABLE)
	app.ajaxPost("/report/summarycalculatedatapivot", tbl.getParam(), function (res) {
		tbl.data(res.Data);
		tbl.render();
	});
};
tbl.render = function () {
	var dimensions = app.koUnmap(tbl.dimensions).filter(function (d) {
		return d.field != '';
	}).map(function (d) {
		return { field: app.idAble(d.field), title: d.name };
	});
	var dataPoints = ko.mapping.toJS(tbl.dataPoints).filter(function (d) {
		return d.field != '' && d.field != '';
	}).map(function (d) {
		return { field: app.idAble(d.field), title: d.name };
	});

	var columns = dimensions.concat(dataPoints).map(function (d) {
		d.format = '{0:n2}';
		return d;
	});

	var config = {
		dataSource: {
			data: tbl.data(),
			pageSize: 10
		},
		pageable: true,
		columns: columns
	};

	app.log('table', app.clone(config));
	$('.table').replaceWith('<div class="tabular-view table"></div>');
	$('.table').kendoGrid(config);
};

var DATATEMP_TABLE = [{ "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Jakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 900, "value2": 600, "value3": 300 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Malang", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 700, "value2": 700, "value3": 100 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Industrial Trade" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Mitu", "customer.channelname": "Motorist" }, "value1": 1000, "value2": 800, "value3": 200 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Industrial Trade" }, "value1": 1100, "value2": 900, "value3": 150 }, { "_id": { "customer.branchname": "Yogyakarta", "product.name": "Hit", "customer.channelname": "Motorist" }, "value1": 1100, "value2": 900, "value3": 150 }];

$(function () {
	tbl.dimensions([app.koMap({ field: 'customer.branchname', name: 'Branch/RD' }), app.koMap({ field: 'product.name', name: 'Product' }), app.koMap({ field: 'customer.channelname', name: 'Product' })]);
	tbl.dataPoints([app.koMap({ field: 'value1', name: o['value1'] }), app.koMap({ field: 'value2', name: o['value2'] }), app.koMap({ field: 'value3', name: o['value3'] })]);
	tbl.refresh();
});