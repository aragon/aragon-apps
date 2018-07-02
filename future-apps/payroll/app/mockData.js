export const employees = [
  {
    name: "Miles Davis",
    startDate: 1526632944,
    endDate: 1527742944,
    role: "CEO",
    salary: 80000,
    totalPaidYr: 54343.32,
    tx: 1
  },
  {
    name: "May Davis",
    startDate: 1526632944,
    endDate: 1527742944,
    role: "CFO",
    salary: 80000,
    totalPaidYr: 5343.32,
    tx: 2
  },
  {
    name: "John Davis",
    startDate: 1526632944,
    endDate: 1527742944,
    role: "CZO",
    salary: 80000,
    totalPaidYr: 343.32,
    tx: 3
  }
];

export const totalPayroll = {
  employees: 9,
  avgSalary: 80000,
  monthlyBurnRate: 59995.94,
  totalPaidThisYear: 11234.43
};

// export const availableSalary = {
//   avaliableBalance: "ads",
//   totalTransfer: "ads",
//   yearlySalary: "ads",
//   numberOfEmployees: "de"
// };

export const paidSalaries = [
  { name: "SEP", uv: 4000, cost: 2400, amt: 2400, timestamp: 1530095899 },
  { name: "NOV", uv: 3000, cost: 1398, amt: 2210, timestamp: 1527417499 },
  { name: "JAN", uv: 2000, cost: 9800, amt: 2290, timestamp: 1527417499 },
  { name: "MAR", uv: 2780, cost: 3908, amt: 2000, timestamp: 1527417499 },
  { name: "MAY", uv: 1890, cost: 4800, amt: 2181, timestamp: 1510417499 },
  { name: "JUL", uv: 2390, cost: 3800, amt: 2500, timestamp: 1510417499 },
  { name: "SEP", uv: 3490, cost: 4300, amt: 2100, timestamp: 1500417499 }
];

export const keyStatsData = {
  vault: 439292329
};

export const salaryTransactions = [
  {
    token: "0x00be01CAF657Ff277269f169bd5220A390f791f7",
    transactionHash: "0x09d846935dba964e33dcba4cd5",
    amount: 3.0,
    date: 1526978544,
    exchangeRate: 620.23,
    decimals: 2,
    entity: "none",
    isIncoming: true,
    reference: "none",
    status: "Pending...",
    symbol: "ETH"
  },
  {
    token: "0x00be01CAF657Ff277269f169bd5220A390f791f7",
    transactionHash: "0x09d846935dba964ebbdcba4cd5",
    amount: 32.4747,
    date: 1526632944,
    exchangeRate: 620.23,
    decimals: 4,
    entity: "none",
    isIncoming: true,
    reference: "none",
    status: "Complete",
    symbol: "ETH"
  },
  {
    token: "0x00be01CAF657Ff277269f169bd5220A390f791f7",
    transactionHash: "0x234846935dba964ebbdcba4cd5",
    amount: 103.1,
    date: 1522658544,
    decimals: 4,
    exchangeRate: 6.23,
    entity: "none",
    isIncoming: true,
    reference: "none",
    symbol: "ANT",
    status: "Complete"
  }
];

export const avaliableSalaryData = {
  targetDate: 1530105168172,
  avaliableBalance: 5902.54,
  totalTransfered: 45352.27,
  yrSalary: 80000.0
};

export const salaryAllocData = {
  holders: [{ name: "ETH", balance: 1329 }, { name: "ANT", balance: 3321 }, { name: "SNT", balance: 1131 }],
  tokenSupply: 10000,
  tokenDecimalsBase: 5
};
