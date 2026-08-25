const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

function formatAmount(amount) {
  return amount.toFixed(2);
}

function toCents(amount) {
  return Math.round(amount * 100);
}

function fromCents(cents) {
  return cents / 100;
}

class DataProgram {
  constructor() {
    this.storageBalance = 1000.0;
  }

  execute(passedOperation, balance) {
    if (passedOperation === 'READ') {
      return this.storageBalance;
    }

    if (passedOperation === 'WRITE') {
      this.storageBalance = balance;
      return this.storageBalance;
    }

    return balance;
  }
}

class Operations {
  constructor(dataProgram, rl, output = console) {
    this.dataProgram = dataProgram;
    this.rl = rl;
    this.output = output;
  }

  async promptAmount(promptLabel) {
    const rawAmount = await this.rl.question(promptLabel);
    const amount = Number.parseFloat(rawAmount);

    if (Number.isNaN(amount)) {
      this.output.log('Invalid amount. Please enter a numeric value.');
      return null;
    }

    return amount;
  }

  async execute(passedOperation) {
    const operationType = passedOperation;

    if (operationType === 'TOTAL ') {
      const finalBalance = this.dataProgram.execute('READ', 0);
      this.output.log(`Current balance: ${formatAmount(finalBalance)}`);
      return;
    }

    if (operationType === 'CREDIT') {
      const amount = await this.promptAmount('Enter credit amount: ');
      if (amount === null) {
        return;
      }

      let finalBalance = this.dataProgram.execute('READ', 0);
      finalBalance = fromCents(toCents(finalBalance) + toCents(amount));
      this.dataProgram.execute('WRITE', finalBalance);
      this.output.log(`Amount credited. New balance: ${formatAmount(finalBalance)}`);
      return;
    }

    if (operationType === 'DEBIT ') {
      const amount = await this.promptAmount('Enter debit amount: ');
      if (amount === null) {
        return;
      }

      let finalBalance = this.dataProgram.execute('READ', 0);
      if (toCents(finalBalance) >= toCents(amount)) {
        finalBalance = fromCents(toCents(finalBalance) - toCents(amount));
        this.dataProgram.execute('WRITE', finalBalance);
        this.output.log(`Amount debited. New balance: ${formatAmount(finalBalance)}`);
      } else {
        this.output.log('Insufficient funds for this debit.');
      }
    }
  }
}

async function evaluateUserChoice(userChoice, operations, output = console) {
  switch (userChoice) {
    case 1:
      await operations.execute('TOTAL ');
      return false;
    case 2:
      await operations.execute('CREDIT');
      return false;
    case 3:
      await operations.execute('DEBIT ');
      return false;
    case 4:
      return true;
    default:
      output.log('Invalid choice, please select 1-4.');
      return false;
  }
}

async function runMainProgram() {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  const output = console;
  const dataProgram = new DataProgram();
  const operations = new Operations(dataProgram, rl, output);
  let continueFlag = 'YES';

  while (continueFlag !== 'NO') {
    output.log('--------------------------------');
    output.log('Account Management System');
    output.log('1. View Balance');
    output.log('2. Credit Account');
    output.log('3. Debit Account');
    output.log('4. Exit');
    output.log('--------------------------------');

    const userChoiceInput = await rl.question('Enter your choice (1-4): ');
    const userChoice = Number.parseInt(userChoiceInput, 10);

    const shouldExit = await evaluateUserChoice(userChoice, operations, output);
    if (shouldExit) {
      continueFlag = 'NO';
    }
  }

  output.log('Exiting the program. Goodbye!');
  rl.close();
}

if (require.main === module) {
  runMainProgram().catch((error) => {
    console.error('Unexpected error while running the accounting application:', error);
    process.exitCode = 1;
  });
}

module.exports = {
  DataProgram,
  Operations,
  evaluateUserChoice,
  formatAmount,
  toCents,
  fromCents,
  runMainProgram,
};
