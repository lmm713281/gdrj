package main

import (
	gdrj "eaciit/gdrj/model"
	"fmt"
	"github.com/eaciit/dbox"
	_ "github.com/eaciit/dbox/dbc/mongo"
	"github.com/eaciit/toolkit"
	// "math"
	"os"
	"runtime"
	"strings"
)

var (
	arrstrbrand   = []string{"HIT", "Stella", "mitu", "CleanPack", "Carera"}
	arrbranch     = []string{"CD01", "CD02", "CD03", "CD04", "CD05", "JB01", "JB02", "JB03", "JTIM01", "JTIM02", "JTIM03", "JTENG01", "JTENG02", "JTENG03", "BAL01"}
	arrkeyaccount = []string{"KA-01", "KA-02", "KA-03", "KA-04", "KA-05"}
	arrzone       = []string{"Z1|1|Jakarta", "Z1|2|Cirebon", "Z1|1|Bogor", "Z2|1|Surabaya", "Z2|1|Malang", "Z3|1|Yogyakarta", "Z3|2|Semarang", "Z4|1|Bali"}
)

func main() {
	runtime.GOMAXPROCS(runtime.NumCPU())

	conn, err := prepareConnection()

	if err != nil {
		fmt.Printf("Error connecting to database: %s \n", err.Error())
		os.Exit(1)
	}

	err = gdrj.SetDb(conn)
	if err != nil {
		fmt.Printf("Error set database to gdrj: %s \n", err.Error())
		os.Exit(1)
	}

	fmt.Printf("Start : Generate Product Data \n")
	genproductdata()
	fmt.Printf("Done : Generate Product Data \n")

	fmt.Printf("Start : Generate Branch Data \n")
	genbranchdata()
	fmt.Printf("Done : Generate Branch Data \n")

	fmt.Printf("Start : Generate Profit Center Data \n")
	genprofitcenterdata()
	fmt.Printf("Done : Generate Profit Center Data \n")

	fmt.Printf("Start : Generate Cost Center Data \n")
	gencostcenterdata()
	fmt.Printf("Done : Generate Cost Center Data \n")

	fmt.Printf("Start : Generate Truck Master Data \n")
	gentruckmasterdata()
	fmt.Printf("Done : Generate Truck Master Data \n")

	fmt.Printf("Start : Generate Customer Data \n")
	gencustomerdata()
	fmt.Printf("Done : Generate Customer Data \n")
}

func genproductdata() {
	arrconfig := []string{"big", "medium", "small"}

	for i := 1; i <= 10000; i++ {

		gproduct := new(gdrj.Product)
		gproduct.ID = toolkit.Sprintf("SKU%06d", i)
		gproduct.Name = fmt.Sprintf("%v - %v", arrstrbrand[i%5], arrconfig[i%3])
		gproduct.Config = arrconfig[i%3]
		gproduct.Brand = arrstrbrand[i%5]
		gproduct.LongName = fmt.Sprintf("[%v] %v - %v", toolkit.Sprintf("SKU%06d", i), arrstrbrand[i%5], arrconfig[i%3])

		err := gproduct.Save()
		if err != nil {
			fmt.Printf("%v \n", err.Error())
		}
	}

	return
}

func genbranchdata() {
	for _, v := range arrbranch {
		gbranch := new(gdrj.Branch)
		gbranch.ID = v
		gbranch.Name = fmt.Sprintf("%v Name", v)
		gbranch.Location = fmt.Sprintf("%v Location", v)

		err := gbranch.Save()
		if err != nil {
			fmt.Printf("%v \n", err.Error())
		}
	}

	return
}

func genprofitcenterdata() {
	for i := 1; i <= 100; i++ {
		gprofitcenter := new(gdrj.ProfitCenter)
		gprofitcenter.ID = toolkit.Sprintf("PC%06d", i)
		gprofitcenter.Name = toolkit.Sprintf("PC%06d", i)
		gprofitcenter.Brand = arrstrbrand[i%5]
		gprofitcenter.BranchID = arrbranch[i%15]
		gprofitcenter.BranchType = 1

		err := gprofitcenter.Save()
		if err != nil {
			fmt.Printf("%v \n", err.Error())
		}
	}
}

func gencostcenterdata() {
	for i := 1; i <= 100; i++ {
		gcostcenter := new(gdrj.CostCenter)
		gcostcenter.ID = toolkit.Sprintf("CC%06d", i)
		gcostcenter.Name = toolkit.Sprintf("CC%06d", i)
		gcostcenter.CostGroup01 = "GCC01"
		gcostcenter.CostGroup02 = "GCC02"
		gcostcenter.CostGroup03 = "GCC03"
		gcostcenter.BranchID = arrbranch[i%15]
		gcostcenter.BranchType = 1

		err := gcostcenter.Save()
		if err != nil {
			fmt.Printf("%v \n", err.Error())
		}
	}
}

func gentruckmasterdata() {
	for i := 1; i <= 1000; i++ {
		gtruck := new(gdrj.Truck)
		gtruck.ID = toolkit.Sprintf("T%04d", i)
		gtruck.PlateNo = toolkit.Sprintf("TNO%04d", i)
		gtruck.BranchID = arrbranch[i%15]
		gtruck.Year = 2016

		err := gtruck.Save()
		if err != nil {
			fmt.Printf("%v \n", err.Error())
		}
	}
}

func gencustomerdata() {
	for i := 1; i <= 10000; i++ {
		gcust := new(gdrj.Customer)
		gcust.ID = toolkit.Sprintf("O%04d", i)
		gcust.CustomerID = toolkit.Sprintf("C%04d", i)
		gcust.Plant = arrbranch[i%15]
		gcust.Name = toolkit.Sprintf("Cust - %v", gcust.ID)
		gcust.KeyAccount = ""
		if i%6 == 3 {
			gcust.KeyAccount = arrbranch[(i/6)%5]
		}
		gcust.Channel = gdrj.ToChannelEnum(i % 6)
		gcust.Group = "1"
		gcust.National = "Indonesia"
		tzone := strings.Split(arrzone[i%8], "|")
		gcust.Zone = tzone[0]
		gcust.Region = tzone[1]
		gcust.Area = tzone[2]

		err := gcust.Save()
		if err != nil {
			fmt.Printf("%v \n", err.Error())
		}
	}
}

func prepareConnection() (dbox.IConnection, error) {
	var config = toolkit.M{}.Set("timeout", 5)
	ci := &dbox.ConnectionInfo{"localhost:27017", "godrej", "", "", config}
	c, e := dbox.NewConnection("mongo", ci)
	if e != nil {
		return nil, e
	}

	e = c.Connect()
	if e != nil {
		return nil, e
	}

	return c, nil
}
