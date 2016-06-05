viewModel.breakdown = new Object()
let bkd = viewModel.breakdown

bkd.data = ko.observableArray([])
bkd.getParam = () => ra.wrapParam('analysis_ideas')
bkd.refresh = () => {
	// bkd.data(DATATEMP_BREAKDOWN)
	app.ajaxPost("/report/summarycalculatedatapivot", bkd.getParam(), (res) => {
		bkd.data(res.Data)
		bkd.render()
	})
}
bkd.render = () => {
	let data = _.sortBy(bkd.data(), (d) => 
		parseInt(d.orderindex.replace("PL", ""), 10)
	)

    let config = {
	    filterable: false,
	    reorderable: false,
	    dataSource: {
	        data: data,
	        schema: {
	            model: {
	                fields: {
	                    _id: { type: "string" },
	                    plheader1: { type: "string" },
	                    plheader2: { type: "string" },
	                    // plheader3: { type: "string" },
	                    value: { type: "number" }
	                }
	            },
	            cube: {
	                dimensions: {
	                    _id: { type: "string" },
	                    plheader1: { caption: "Group 1" },
	                    plheader2: { caption: "Group 2" },
	                    // plheader3: { caption: "Group 3" }
	                },
	                measures: {
	                    Amount: {
	                        field: "value",
	                        aggregate: "sum",
	                        format: "{0:n2}"
	                    }
	                }
	            }
	        },
	        rows: [
	        	{ name: "plheader1", expand: true },
	            { name: "plheader2" },
	            // { name: "plheader3" }
	        ],
	        measures: ["Amount"]
	    },
        dataCellTemplate: (d) => `<div class="align-right">${kendo.toString(d.dataItem.value, "n2")}</div>`,
    	dataBound: () => {
        	$('.breakdown-view .k-grid.k-widget.k-alt tr:first td:first').remove()
        	$('.breakdown-view .k-grid.k-widget.k-alt tr').each((i, e) => {
			    let target = $(e).find('td:eq(1) span:eq(1)')
			    target.remove()

			    $(e).find('[colspan="2"]').attr('colspan', 1)

			    // temporary hidden until level 3 is readdy
			    $(e).find('.k-grid-footer').remove()
			})

        	$('.breakdown-view .k-grid-header .k-header').find('span').html('Value')
        }
	}

	app.log('breakdown', app.clone(config))
	$('.breakdown-view').replaceWith(`<div class="breakdown-view ez"></div>`)
	$('.breakdown-view').kendoPivotGrid(config)
}

$(() => {
	bkd.refresh()
})