'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

viewModel.breakdown = new Object();
var ba = viewModel.breakdown;

ba.contentIsLoading = ko.observable(false);
ba.popupIsLoading = ko.observable(false);
ba.title = ko.observable('Branch Analysis');
ba.detail = ko.observableArray([]);
ba.limit = ko.observable(10);
ba.breakdownNote = ko.observable('');

ba.breakdownBy = ko.observable('customer.branchname');
ba.breakdownByChannel = ko.observable('customer.channelname');
ba.breakdownByFiscalYear = ko.observable('date.fiscal');
ba.oldBreakdownBy = ko.observable(ba.breakdownBy());
ba.optionDimensions = ko.observableArray(rpt.optionDimensions().filter(function (d) {
	return d.field != 'customer.channelname';
}));

ba.data = ko.observableArray([]);
ba.zeroValue = ko.observable(false);
ba.fiscalYear = ko.observable(rpt.value.FiscalYear());
ba.breakdownValue = ko.observableArray([]);
ba.breakdownRD = ko.observable("All");
ba.optionBreakdownRD = ko.observableArray([{ id: "All", title: "RD & Non RD" }, { id: "OnlyRD", title: "Only RD Sales", label: "RD", channelid: "I1" }, { id: "NonRD", title: "Non RD Sales" }]);

ba.expand = ko.observable(false);
ba.enableExpand = ko.observable(true);
ba.changeBreakdownRD = function () {
	setTimeout(function () {
		if (ba.breakdownRD().search('ByLocation') > -1) {
			ba.expand(true);
			ba.enableExpand(false);
			return;
		}

		ba.enableExpand(true);
	}, 100);
};

ba.level = ko.observable(2);

ba.buildStructure = function (breakdownRD, expand, data) {
	var netSalesPLCode = 'PL8A';
	var grossSalesPLCode = 'PL0';
	var discountActivityPLCode = 'PL7A';
	var rdCategories = ["Regional Distributor", "Non RD"];
	var keys = ["_id_customer_branchname", "_id_customer_channelid", "_id_customer_channelname"];

	var fixEmptySubs = function fixEmptySubs(d) {
		var subs = [];
		rdCategories.forEach(function (cat, i) {
			var row = d.subs.find(function (e) {
				return e._id == cat;
			});
			if (row == undefined) {
				var newRow = {};
				newRow._id = cat;
				newRow.count = 1;
				newRow.subs = [];

				var newSubRow = {};
				newSubRow._id = cat;
				newSubRow.count = 1;
				newSubRow.subs = [];
				for (var p in d.subs[0]) {
					if (d.subs[0].hasOwnProperty(p) && p.search("PL") > -1) {
						newSubRow[p] = 0;
						newRow[p] = 0;
					}
				}
				newRow.subs.push(newSubRow);

				row = newRow;
			}

			subs[i] = row;
		});
		return subs;
	};

	var showAsBreakdown = function showAsBreakdown(data) {
		var renderTotalColumn = function renderTotalColumn(d) {
			var totalColumn = {};
			totalColumn._id = 'Total';
			totalColumn.count = 1;
			totalColumn.excludeFromTotal = true;

			var totalSubColumn = {};
			totalSubColumn._id = 'Total';
			totalSubColumn.count = 1;
			totalSubColumn.excludeFromTotal = true;

			var _loop = function _loop(p) {
				if (d.subs[0].hasOwnProperty(p) && p.search('PL') > -1) {
					totalColumn[p] = toolkit.sum(d.subs, function (e) {
						return e[p];
					});
					totalSubColumn[p] = toolkit.sum(d.subs, function (e) {
						return e[p];
					});
				}
			};

			for (var p in d.subs[0]) {
				_loop(p);
			}

			totalColumn.subs = [totalSubColumn];
			return totalColumn;
		};

		switch (ba.breakdownRD()) {
			case 'All':
				{
					data.forEach(function (d) {
						var totalColumn = renderTotalColumn(d);
						d.subs = [totalColumn].concat(d.subs);
						d.count = toolkit.sum(d.subs, function (e) {
							return e.count;
						});
					});
				}break;
			case 'OnlyMT':
			case 'OnlyGT':
			case 'OnlyRD':
			case 'OnlyIT':
				{
					// let opt = ba.optionBreakdownRD().find((d) => d.id == ba.breakdownRD())
					data.forEach(function (d) {
						// d.subs = d.subs.filter((e) => e._id == opt.label)

						if (ba.expand()) {
							var totalColumn = renderTotalColumn(d);
							d.subs = [totalColumn].concat(d.subs);
						}

						d.count = toolkit.sum(d.subs, function (e) {
							return e.count;
						});
					});
				}break;
			case 'NonRD':
				{
					data.forEach(function (d) {
						d.subs = d.subs.filter(function (e) {
							return ['regional distributor', 'rd'].indexOf(e._id.toLowerCase()) == -1;
						});

						if (ba.expand()) {
							var totalColumn = renderTotalColumn(d);
							d.subs = [totalColumn].concat(d.subs);
						}

						d.count = toolkit.sum(d.subs, function (e) {
							return e.count;
						});
					});
				}break;
		}
	};

	var groupThenMap = function groupThenMap(data, group) {
		var op1 = _.groupBy(data, function (d) {
			return group(d);
		});
		var op2 = _.map(op1, function (v, k) {
			var key = { _id: k, subs: v };
			var sample = v[0];

			var _loop2 = function _loop2(prop) {
				if (sample.hasOwnProperty(prop) && prop != '_id') {
					key[prop] = toolkit.sum(v, function (d) {
						return d[prop];
					});
				}
			};

			for (var prop in sample) {
				_loop2(prop);
			}

			return key;
		});

		return op2;
	};

	if (expand && ba.subBreakdownValue().length > 0) {
		var _ret3 = function () {
			var parsed = groupThenMap(data, function (d) {
				return d._id._id_customer_branchname;
			}).map(function (d) {
				var subs = groupThenMap(d.subs, function (e) {
					return e._id._id_customer_channelname;
				}).map(function (e) {
					var subs = groupThenMap(e.subs, function (f) {
						return f._id._id_customer_reportsubchannel;
					}).map(function (f) {
						f.count = 1;
						return f;
					});

					e.subs = _.orderBy(subs, function (f) {
						return f.PL8A;
					}, 'desc');
					e.count = e.subs.length;
					return e;
				});

				d.subs = _.orderBy(subs, function (e) {
					return e.PL8A;
				}, 'desc');
				d.count = toolkit.sum(d.subs, function (e) {
					return e.count;
				});
				return d;
			});

			ba.level(3);
			showAsBreakdown(parsed);
			parsed = _.orderBy(parsed, function (d) {
				return d.total;
			}, 'desc');

			parsed.forEach(function (g) {
				g.subs.forEach(function (d, i) {
					if (i == 0) {
						return;
					}

					var sample = d.subs[0];

					var percentage = {};
					percentage._id = '% of N Sales';
					percentage.count = 1;
					percentage.excludeFromTotal = true;

					var percentageOfTotal = {};
					percentageOfTotal._id = '% of Total';
					percentageOfTotal.count = 1;
					percentageOfTotal.excludeFromTotal = true;

					var total = {};
					total._id = 'Total&nbsp;' + d._id;
					total.count = 1;
					total.excludeFromTotal = true;

					var _loop3 = function _loop3(p) {
						if (sample.hasOwnProperty(p) && p.indexOf('PL') > -1) {
							var vTarget = toolkit.sum(d.subs, function (h) {
								return h[p];
							});
							var vNetSales = toolkit.sum(d.subs, function (h) {
								return h[netSalesPLCode];
							});
							var vGrossSales = toolkit.sum(d.subs, function (h) {
								return h[grossSalesPLCode];
							});

							var value = toolkit.number(vTarget / vNetSales) * 100;
							if (p == discountActivityPLCode) {
								value = toolkit.number(vTarget / vGrossSales) * 100;
							}

							var pot = toolkit.number(vTarget / toolkit.sum(parsed, function (h) {
								return h[p];
							})) * 100;

							percentage[p] = kendo.toString(value, 'n2') + '&nbsp;%';
							percentageOfTotal[p] = kendo.toString(pot, 'n2') + '&nbsp;%';
							total[p] = vTarget;
						}
					};

					for (var p in sample) {
						_loop3(p);
					}d.subs = [percentageOfTotal].concat(d.subs);
					d.count++;
					g.count++;

					d.subs = [percentage].concat(d.subs);
					d.count++;
					g.count++;

					d.subs = [total].concat(d.subs);
					d.count++;
					g.count++;
				});
			});

			return {
				v: parsed
			};
		}();

		if ((typeof _ret3 === 'undefined' ? 'undefined' : _typeof(_ret3)) === "object") return _ret3.v;
	} else if (expand && ba.subBreakdownValue().length == 0) {
		var _ret5 = function () {
			var parsed = groupThenMap(data, function (d) {
				return d._id._id_customer_branchname;
			}).map(function (d) {
				var subs = groupThenMap(d.subs, function (e) {
					return e._id._id_customer_channelid == "I1" ? rdCategories[0] : rdCategories[1];
				}).map(function (e) {
					var subs = groupThenMap(e.subs, function (f) {
						return f._id._id_customer_channelname;
					}).map(function (f) {
						f.count = 1;
						return f;
					});

					e.subs = _.orderBy(subs, function (f) {
						return f.PL8A;
					}, 'desc');
					e.count = e.subs.length;
					return e;
				});

				d.subs = _.orderBy(subs, function (e) {
					return e.PL8A;
				}, 'desc');
				d.subs = fixEmptySubs(d); // INJECT THE EMPTY RD / NON RD
				d.count = toolkit.sum(d.subs, function (e) {
					return e.count;
				});
				return d;
			});

			ba.level(3);
			showAsBreakdown(parsed);
			parsed = _.orderBy(parsed, function (d) {
				return d.total;
			}, 'desc');

			parsed.forEach(function (g) {
				g.subs.forEach(function (d, i) {
					if (i == 0) {
						return;
					}

					var sample = d.subs[0];

					var percentage = {};
					percentage._id = '% of N Sales';
					percentage.count = 1;
					percentage.excludeFromTotal = true;

					var percentageOfTotal = {};
					percentageOfTotal._id = '% of Total';
					percentageOfTotal.count = 1;
					percentageOfTotal.excludeFromTotal = true;

					var total = {};
					total._id = 'Total&nbsp;';
					total.count = 1;
					total.excludeFromTotal = true;

					var _loop4 = function _loop4(p) {
						if (sample.hasOwnProperty(p) && p.indexOf('PL') > -1) {
							var vTarget = toolkit.sum(d.subs, function (h) {
								return h[p];
							});
							var vNetSales = toolkit.sum(d.subs, function (h) {
								return h[netSalesPLCode];
							});
							var vGrossSales = toolkit.sum(d.subs, function (h) {
								return h[grossSalesPLCode];
							});

							var value = toolkit.number(vTarget / vNetSales) * 100;
							if (p == discountActivityPLCode) {
								value = toolkit.number(vTarget / vGrossSales) * 100;
							}

							var pot = toolkit.number(vTarget / toolkit.sum(parsed, function (q) {
								return q[p];
							})) * 100;

							percentage[p] = kendo.toString(value, 'n2') + '&nbsp;%';
							percentageOfTotal[p] = kendo.toString(pot, 'n2') + '&nbsp;%';
							total[p] = vTarget;
						}
					};

					for (var p in sample) {
						_loop4(p);
					}if (d._id == 'Regional Distributor') {
						toolkit.try(function () {
							d.subs[0]._id = 'Total&nbsp;RD';
						});

						var arrTotal = d.subs.splice(0, 1);
						var arrContent = d.subs.splice(1);

						arrTotal.push(percentage);
						d.count++;
						g.count++;

						arrTotal.push(percentageOfTotal);
						d.count++;
						g.count++;

						d.subs = arrTotal.concat(arrContent);
					} else {
						if (d.subs.length > 0) {
							if (d.subs[0]._id == 'Non RD') {
								var _arrTotal = d.subs.splice(0, 1);
								var _arrContent = d.subs.splice(1);

								_arrTotal.push(percentage);
								d.count++;
								g.count++;

								_arrTotal.push(percentageOfTotal);
								d.count++;
								g.count++;

								d.subs = _arrTotal.concat(_arrContent);

								toolkit.try(function () {
									d.subs[0]._id = 'Total&nbsp;Non&nbsp;RD';
								});
							} else {
								d.subs = [percentageOfTotal].concat(d.subs);
								d.count++;
								g.count++;

								d.subs = [percentage].concat(d.subs);
								d.count++;
								g.count++;

								d.subs = [total].concat(d.subs);
								d.count++;
								g.count++;

								toolkit.try(function () {
									d.subs[0]._id = 'Total&nbsp;Non&nbsp;RD';
								});
							}
						}
					}
				});
			});

			return {
				v: parsed
			};
		}();

		if ((typeof _ret5 === 'undefined' ? 'undefined' : _typeof(_ret5)) === "object") return _ret5.v;
	} else if (!expand && ba.breakdownRD() == 'All') {
		var _ret7 = function () {
			var parsed = groupThenMap(data, function (d) {
				return d._id._id_customer_branchname;
			}).map(function (d) {
				var subs = groupThenMap(d.subs, function (e) {
					return e._id._id_customer_channelid == "I1" ? rdCategories[0] : rdCategories[1];
				}).map(function (e) {
					e.subs = [];
					e.count = 1;
					return e;
				});

				d.subs = _.orderBy(subs, function (e) {
					return e.PL8A;
				}, 'desc');
				d.subs = fixEmptySubs(d); // INJECT THE EMPTY RD / NON RD
				d.count = toolkit.sum(d.subs, function (e) {
					return e.count;
				});
				return d;
			});

			ba.level(2);
			showAsBreakdown(parsed);
			parsed = _.orderBy(parsed, function (d) {
				return d.total;
			}, 'desc');

			parsed.forEach(function (d) {
				var total = d.subs[0];

				var percentage = {};
				percentage._id = '% of N Sales';
				percentage.count = 1;
				percentage.excludeFromTotal = true;

				var percentageOfTotal = {};
				percentageOfTotal._id = '% of Total';
				percentageOfTotal.count = 1;
				percentageOfTotal.excludeFromTotal = true;

				var _loop5 = function _loop5(p) {
					if (total.hasOwnProperty(p) && p.indexOf('PL') > -1) {
						var value = toolkit.number(total[p] / total[netSalesPLCode]) * 100;
						if (p == discountActivityPLCode) {
							value = toolkit.number(total[p] / total[grossSalesPLCode]) * 100;
						}

						var pot = toolkit.number(total[p] / toolkit.sum(parsed, function (k) {
							return k[p];
						})) * 100;

						percentage[p] = kendo.toString(value, 'n2') + '&nbsp;%';
						percentageOfTotal[p] = kendo.toString(pot, 'n2') + '&nbsp;%';
					}
				};

				for (var p in total) {
					_loop5(p);
				}d.count++;
				d.subs.splice(1, 0, percentage);

				d.count++;
				d.subs.splice(2, 0, percentageOfTotal);
			});

			return {
				v: parsed
			};
		}();

		if ((typeof _ret7 === 'undefined' ? 'undefined' : _typeof(_ret7)) === "object") return _ret7.v;
	}

	var parsed = groupThenMap(data, function (d) {
		return d._id._id_customer_branchname;
	}).map(function (d) {
		var subs = groupThenMap(d.subs, function (e) {
			return e._id._id_customer_channelname;
		}).map(function (e) {
			e.subs = [];
			e.count = 1;
			return e;
		});

		d.subs = _.orderBy(subs, function (e) {
			return e.PL8A;
		}, 'desc');
		d.count = toolkit.sum(d.subs, function (e) {
			return e.count;
		});
		return d;
	});

	ba.level(2);
	showAsBreakdown(parsed);
	parsed = _.orderBy(parsed, function (d) {
		return d.total;
	}, 'desc');
	return parsed;
};

ba.refresh = function () {
	var useCache = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var param = {};
	param.pls = [];
	param.groups = [ba.breakdownByChannel(), ba.breakdownBy()];
	param.aggr = 'sum';
	param.filters = rpt.getFilterValue(false, ba.fiscalYear);

	var breakdownValue = ba.breakdownValue().filter(function (d) {
		return d != 'All';
	});
	if (breakdownValue.length > 0) {
		param.filters.push({
			Field: ba.breakdownBy(),
			Op: '$in',
			Value: ba.breakdownValue()
		});
	}

	if (ba.subBreakdownValue().length > 0) {
		param.groups.push('customer.reportsubchannel');

		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: ba.subBreakdownValue()
		});
	} else {
		param.filters.push({
			Field: 'customer.channelname',
			Op: '$in',
			Value: ba.optionSubBreakdown().map(function (d) {
				return d._id;
			}).filter(function (d) {
				return d !== 'EXP';
			})
		});
	}

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
				ba.contentIsLoading(false);
				return;
			}
			res.Data = rpt.hardcodePLGA(res.Data.Data, res.Data.PLModels);
			var data = ba.buildStructure(ba.breakdownRD(), ba.expand(), res.Data.Data);
			ba.data(data);
			var date = moment(res.time).format("dddd, DD MMMM YYYY HH:mm:ss");
			ba.breakdownNote('Last refreshed on: ' + date);

			rpt.plmodels(res.Data.PLModels);
			ba.emptyGrid();
			ba.contentIsLoading(false);
			ba.render();
			rpt.prepareEvents();
		}, function () {
			ba.emptyGrid();
			ba.contentIsLoading(false);
		}, {
			cache: useCache == true ? 'breakdown chart' : false
		});
	};

	ba.oldBreakdownBy(ba.breakdownBy());
	ba.contentIsLoading(true);
	fetch();
};

ba.clickExpand = function (e) {
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

ba.emptyGrid = function () {
	$('.breakdown-view').replaceWith('<div class="breakdown-view ez"  id="branch-analysis"></div>');
};

ba.render = function () {
	if (ba.data().length == 0) {
		$('.breakdown-view').html('No data found.');
		return;
	}

	// ========================= TABLE STRUCTURE

	var percentageWidth = 100;
	var data = _.orderBy(ba.data(), function (d) {
		return d.PL8A;
	}, 'desc');

	var wrapper = toolkit.newEl('div').addClass('pivot-pnl-branch pivot-pnl').appendTo($('.breakdown-view'));

	var tableHeaderWrap = toolkit.newEl('div').addClass('table-header').appendTo(wrapper);

	var tableHeader = toolkit.newEl('table').addClass('table').appendTo(tableHeaderWrap);

	var tableContentWrap = toolkit.newEl('div').appendTo(wrapper).addClass('table-content');

	var tableContent = toolkit.newEl('table').addClass('table').appendTo(tableContentWrap);

	var trHeader = toolkit.newEl('tr').appendTo(tableHeader);

	toolkit.newEl('th').html('P&L').css('height', rpt.rowHeaderHeight() * ba.level() + 'px').attr('data-rowspan', ba.level()).css('vertical-align', 'middle').addClass('cell-percentage-header').appendTo(trHeader);

	toolkit.newEl('th').html('Total').css('height', rpt.rowHeaderHeight() * ba.level() + 'px').attr('data-rowspan', ba.level()).css('vertical-align', 'middle').addClass('cell-percentage-header align-right').appendTo(trHeader);

	toolkit.newEl('th').html('% of N Sales').css('height', rpt.rowHeaderHeight() * ba.level() + 'px').css('vertical-align', 'middle').css('font-weight', 'normal').css('font-style', 'italic').width(percentageWidth - 20).attr('data-rowspan', ba.level()).css('vertical-align', 'middle').addClass('cell-percentage-header align-right').appendTo(trHeader);

	var trContents = [];
	for (var i = 0; i < ba.level(); i++) {
		trContents.push(toolkit.newEl('tr').appendTo(tableContent).css('height', rpt.rowHeaderHeight() + 'px'));
	}

	// ========================= BUILD HEADER

	var columnWidth = 100;
	var totalColumnWidth = 0;
	var pnlTotalSum = 0;
	var dataFlat = [];

	var countWidthThenPush = function countWidthThenPush(thheader, each, key) {
		var currentColumnWidth = each._id.length * 10;
		if (currentColumnWidth < columnWidth) {
			currentColumnWidth = columnWidth;
		}

		if (ba.expand() && ba.subBreakdownValue().length > 0) {
			if (ba.subBreakdownValue().indexOf('I1') > -1) {
				if (each._id == 'Other') {
					currentColumnWidth = 180;
				}
			}
		}

		if (each._id.indexOf('% of') > -1) {
			currentColumnWidth -= 20;
			thheader.css('font-weight', 'normal').css('font-style', 'italic');
		}

		each.key = key.join('_');
		dataFlat.push(each);
		totalColumnWidth += currentColumnWidth;

		thheader.width(currentColumnWidth);
	};

	data.forEach(function (lvl1, i) {
		var thheader1 = toolkit.newEl('th').html(lvl1._id).attr('colspan', lvl1.count).addClass('align-center').appendTo(trContents[0]).css('border-top', 'none');

		if (ba.level() == 1) {
			countWidthThenPush(thheader1, lvl1, [lvl1._id]);
			return;
		}
		thheader1.attr('colspan', lvl1.count);

		lvl1.subs.forEach(function (lvl2, j) {
			var thheader2 = toolkit.newEl('th').html(lvl2._id).addClass('align-center').appendTo(trContents[1]);

			if (ba.level() == 2) {
				countWidthThenPush(thheader2, lvl2, [lvl1._id, lvl2._id]);
				return;
			}
			thheader2.attr('colspan', lvl2.count);

			lvl2.subs.forEach(function (lvl3, k) {
				var thheader3 = toolkit.newEl('th').html(lvl3._id).addClass('align-center').appendTo(trContents[2]);

				if (ba.level() == 3) {
					countWidthThenPush(thheader3, lvl3, [lvl1._id, lvl2._id, lvl3._id]);

					if (lvl3._id == 'Total') {
						thheader2.attr('rowspan', 2);
						thheader2.css('vertical-align', 'middle');
						thheader3.remove();
					}

					return;
				}
				thheader3.attr('colspan', lvl3.count);
			});
		});
	});

	tableContent.css('min-width', totalColumnWidth);

	// ========================= CONSTRUCT DATA

	var plmodels = _.sortBy(rpt.plmodels(), function (d) {
		return parseInt(d.OrderIndex.replace(/PL/g, ''));
	});
	var exceptions = ["PL94C" /* "Operating Income" */, "PL39B" /* "Earning Before Tax" */, "PL41C" /* "Earning After Tax" */, "PL6A" /* "Discount" */];
	var netSalesPLCode = 'PL8A';
	var netSalesPlModel = rpt.plmodels().find(function (d) {
		return d._id == netSalesPLCode;
	});
	var netSalesRow = {};
	var grossSalesPLCode = 'PL0';
	var grossSalesRow = {};
	var discountActivityPLCode = 'PL7A';

	var rows = [];

	rpt.fixRowValue(dataFlat);

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
		// dataFlat.forEach((e) => {
		// 	let breakdown = e.key
		// 	let percentage = toolkit.number(e[`${d._id}`] / row.PNLTotal) * 100;
		// 	percentage = toolkit.number(percentage)

		// 	if (d._id != netSalesPLCode) {
		// 		percentage = toolkit.number(row[breakdown] / netSalesRow[breakdown]) * 100
		// 	}

		// 	if (percentage < 0)
		// 		percentage = percentage * -1

		// 	row[`${breakdown} %`] = percentage
		// })

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

	// ========================= PLOT DATA

	rows.forEach(function (d, i) {
		pnlTotalSum += d.PNLTotal;

		var PL = d.PLCode;
		PL = PL.replace(/\s+/g, '');
		var trHeader = toolkit.newEl('tr').addClass('header' + PL).attr('idheaderpl', PL).attr('data-row', 'row-' + i).appendTo(tableHeader).css('height', rpt.rowContentHeight() + 'px');

		trHeader.on('click', function () {
			ba.clickExpand(trHeader);
		});

		toolkit.newEl('td').html('<i></i>' + d.PNL).appendTo(trHeader);

		var pnlTotal = kendo.toString(d.PNLTotal, 'n0');
		toolkit.newEl('td').html(pnlTotal).addClass('align-right').appendTo(trHeader);

		toolkit.newEl('td').html(kendo.toString(d.Percentage, 'n2') + '%').addClass('align-right').appendTo(trHeader);

		var trContent = toolkit.newEl('tr').addClass('column' + PL).attr('idpl', PL).attr('data-row', 'row-' + i).css('height', rpt.rowContentHeight() + 'px').appendTo(tableContent);

		dataFlat.forEach(function (e, f) {
			var key = e.key;
			var value = kendo.toString(d[key], 'n0');

			var percentage = kendo.toString(d[key + ' %'], 'n2');

			if ($.trim(value) == '') {
				value = 0;
			}

			if (e._id == "% of N Sales") {
				value = d[key];
			}

			var cell = toolkit.newEl('td').html(value).addClass('align-right').appendTo(trContent);
		});

		rpt.putStatusVal(trHeader, trContent);
	});

	// ========================= CONFIGURE THE HIRARCHY
	rpt.buildGridLevels(rows);
};

ba.breakdownValueAll = { _id: 'All', Name: 'All' };
ba.optionBreakdownValues = ko.computed(function () {
	var branches = rpt.masterData.Branch().map(function (d) {
		return { _id: d.Name, Name: d.Name };
	});
	return [ba.breakdownValueAll].concat(branches);
}, rpt.masterData.Branch);

ba.subBreakdownValue = ko.observableArray([]);
ba.optionSubBreakdown = ko.computed(function () {
	switch (ba.breakdownRD()) {
		case 'All':
			return rpt.optionsChannels();
			break;
		case 'OnlyRD':
			return rpt.optionsChannels().filter(function (d) {
				return d._id == 'I1';
			});
			break;
		case 'NonRD':
			return rpt.optionsChannels().filter(function (d) {
				return d._id != 'I1';
			});
			break;
	}

	return [];
}, ba.breakdownRD);

ba.changeBreakdownValue = function () {
	var all = ba.breakdownValueAll;
	setTimeout(function () {
		var condA1 = ba.breakdownValue().length == 2;
		var condA2 = ba.breakdownValue().indexOf(all._id) == 0;
		if (condA1 && condA2) {
			ba.breakdownValue.remove(all._id);
			return;
		}

		var condB1 = ba.breakdownValue().length > 1;
		var condB2 = ba.breakdownValue().reverse()[0] == all._id;
		if (condB1 && condB2) {
			ba.breakdownValue([all._id]);
			return;
		}

		var condC1 = ba.breakdownValue().length == 0;
		if (condC1) {
			ba.breakdownValue([all._id]);
		}
	}, 100);
};

vm.currentMenu('Analysis');
vm.currentTitle('Branch Analysis');
vm.breadcrumb([{ title: 'Godrej', href: '#' }, { title: 'Analysis', href: '#' }, { title: 'Branch Analysis', href: '#' }]);

ba.title('&nbsp;');

rpt.refresh = function () {
	ba.refresh(false);
};

$(function () {
	rpt.refresh();
	rpt.showExport(true);

	setTimeout(function () {
		ba.breakdownValue(['All']);
	}, 200);
});