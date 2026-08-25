const { DataProgram, Operations, evaluateUserChoice } = require('./index');

function createOutputSpy() {
  return {
    logs: [],
    log(message) {
      this.logs.push(String(message));
    },
  };
}

function createRlMock(answers) {
  let index = 0;
  return {
    async question() {
      const value = answers[index];
      index += 1;
      return value;
    },
  };
}

describe('COBOL parity test plan coverage', () => {
  test('TC-001: view initial account balance', async () => {
    const output = createOutputSpy();
    const dataProgram = new DataProgram();
    const operations = new Operations(dataProgram, createRlMock([]), output);

    await operations.execute('TOTAL ');

    expect(output.logs).toContain('Current balance: 1000.00');
  });

  test('TC-002: credit account with a valid amount', async () => {
    const output = createOutputSpy();
    const dataProgram = new DataProgram();
    const operations = new Operations(dataProgram, createRlMock(['250.00']), output);

    await operations.execute('CREDIT');

    expect(output.logs).toContain('Amount credited. New balance: 1250.00');
    expect(dataProgram.execute('READ', 0)).toBe(1250);
  });

  test('TC-003: debit account with sufficient funds', async () => {
    const output = createOutputSpy();
    const dataProgram = new DataProgram();
    const operations = new Operations(dataProgram, createRlMock(['300.00']), output);

    await operations.execute('DEBIT ');

    expect(output.logs).toContain('Amount debited. New balance: 700.00');
    expect(dataProgram.execute('READ', 0)).toBe(700);
  });

  test('TC-004: reject debit when funds are insufficient', async () => {
    const output = createOutputSpy();
    const dataProgram = new DataProgram();
    dataProgram.execute('WRITE', 200);
    const operations = new Operations(dataProgram, createRlMock(['500.00']), output);

    await operations.execute('DEBIT ');

    expect(output.logs).toContain('Insufficient funds for this debit.');
    expect(dataProgram.execute('READ', 0)).toBe(200);
  });

  test('TC-005: handle invalid menu selection', async () => {
    const output = createOutputSpy();
    const operations = {
      execute: jest.fn(),
    };

    const shouldExit = await evaluateUserChoice(5, operations, output);

    expect(shouldExit).toBe(false);
    expect(operations.execute).not.toHaveBeenCalled();
    expect(output.logs).toContain('Invalid choice, please select 1-4.');
  });

  test('TC-006: exit application from menu option 4', async () => {
    const output = createOutputSpy();
    const operations = {
      execute: jest.fn(),
    };

    const shouldExit = await evaluateUserChoice(4, operations, output);

    expect(shouldExit).toBe(true);
    expect(operations.execute).not.toHaveBeenCalled();
  });

  test('TC-007: validate sequential state across operations in one run', async () => {
    const output = createOutputSpy();
    const dataProgram = new DataProgram();
    const operations = new Operations(dataProgram, createRlMock(['200.00', '50.00']), output);

    await operations.execute('TOTAL ');
    await operations.execute('CREDIT');
    await operations.execute('DEBIT ');
    await operations.execute('TOTAL ');

    expect(dataProgram.execute('READ', 0)).toBe(1150);
    expect(output.logs).toContain('Current balance: 1000.00');
    expect(output.logs).toContain('Amount credited. New balance: 1200.00');
    expect(output.logs).toContain('Amount debited. New balance: 1150.00');
    expect(output.logs).toContain('Current balance: 1150.00');
  });

  test('TC-008: credit zero amount keeps balance unchanged', async () => {
    const output = createOutputSpy();
    const dataProgram = new DataProgram();
    const operations = new Operations(dataProgram, createRlMock(['0.00']), output);

    await operations.execute('CREDIT');

    expect(output.logs).toContain('Amount credited. New balance: 1000.00');
    expect(dataProgram.execute('READ', 0)).toBe(1000);
  });

  test('TC-009: debit zero amount keeps balance unchanged', async () => {
    const output = createOutputSpy();
    const dataProgram = new DataProgram();
    const operations = new Operations(dataProgram, createRlMock(['0.00']), output);

    await operations.execute('DEBIT ');

    expect(output.logs).toContain('Amount debited. New balance: 1000.00');
    expect(dataProgram.execute('READ', 0)).toBe(1000);
  });

  test('TC-010: handles arithmetic near upper bound with two-decimal precision', async () => {
    const output = createOutputSpy();
    const dataProgram = new DataProgram();
    dataProgram.execute('WRITE', 999999.9);
    const operations = new Operations(dataProgram, createRlMock(['0.09', '0.01']), output);

    await operations.execute('CREDIT');
    await operations.execute('DEBIT ');

    expect(output.logs).toContain('Amount credited. New balance: 999999.99');
    expect(output.logs).toContain('Amount debited. New balance: 999999.98');
    expect(dataProgram.execute('READ', 0)).toBe(999999.98);
  });

  test('TC-011: balance inquiry is read-only', async () => {
    const output = createOutputSpy();
    const dataProgram = new DataProgram();
    const operations = new Operations(dataProgram, createRlMock([]), output);

    await operations.execute('TOTAL ');
    await operations.execute('TOTAL ');

    expect(dataProgram.execute('READ', 0)).toBe(1000);
    expect(output.logs).toEqual(['Current balance: 1000.00', 'Current balance: 1000.00']);
  });

  test('TC-012: no persistence across separate program runs', async () => {
    const firstRunDataProgram = new DataProgram();
    firstRunDataProgram.execute('WRITE', 1234.56);
    expect(firstRunDataProgram.execute('READ', 0)).toBe(1234.56);

    const secondRunDataProgram = new DataProgram();
    expect(secondRunDataProgram.execute('READ', 0)).toBe(1000);
  });
});
