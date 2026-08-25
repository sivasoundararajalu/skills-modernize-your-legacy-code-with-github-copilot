# COBOL Student Account System

This directory documents the COBOL account-management example in `src/cobol`. The program provides a simple interactive interface for viewing and updating a student's account balance.

## Source Files

### `src/cobol/main.cob`

`MainProgram` is the user-facing entry point. It displays the account-management menu, accepts a numeric choice, and dispatches the selected action to `Operations`.

Key responsibilities:

- Display the options to view the balance, credit the account, debit the account, or exit.
- Accept choices `1` through `4`.
- Call `Operations` with the corresponding six-character operation code:
  - `TOTAL ` for viewing the balance.
  - `CREDIT` for adding funds.
  - `DEBIT ` for removing funds.
- Display an error for any choice outside the supported menu options.
- Continue prompting until the user selects exit.

### `src/cobol/operations.cob`

`Operations` implements the account actions requested by the main program. It receives an operation code through its linkage section and coordinates all balance reads and writes through `DataProgram`.

Key functions:

- **Total:** Read and display the current balance.
- **Credit:** Accept an amount, read the current balance, add the amount, save the updated balance, and display the result.
- **Debit:** Accept an amount, read the current balance, and subtract the amount only when sufficient funds are available.

### `src/cobol/data.cob`

`DataProgram` is the balance data-access routine. It owns the stored balance and exposes a small read/write interface through its linkage section.

Key functions:

- **`READ`:** Copy the stored balance into the balance value supplied by the caller.
- **`WRITE`:** Replace the stored balance with the caller's value.

The balance is held in working storage, so it is available only for the lifetime of the running program. There is no file or database persistence in the current implementation.

## Student Account Business Rules

- A new account starts with a balance of `1000.00`.
- A balance inquiry does not change the account balance.
- Credits increase the current balance by the entered amount and are saved immediately.
- Debits decrease the current balance only when `current balance >= debit amount`.
- A debit that exceeds the current balance is rejected and displays `Insufficient funds for this debit.` The stored balance remains unchanged.
- The account balance uses two decimal places and supports values up to `999999.99` based on the COBOL picture `9(6)V99`.
- The current code does not explicitly reject zero, negative, or over-range input amounts. Input validation should be added before treating those cases as valid student-account transactions.
- Operation codes are six-character values. `TOTAL ` and `DEBIT ` include a trailing space to match the declared field width.

## Runtime Flow

```text
MainProgram
    -> Operations (TOTAL / CREDIT / DEBIT)
        -> DataProgram (READ)
        -> DataProgram (WRITE, for successful credits and debits)
```

The program exits when the user selects option `4`.

## Application Data Flow

```mermaid
sequenceDiagram
  actor Student
  participant Main as MainProgram
  participant Ops as Operations
  participant Data as DataProgram

  loop Until the student exits
    Main->>Student: Display menu and request choice
    Student-->>Main: Enter choice 1-4

    alt View balance (1)
      Main->>Ops: CALL Operations("TOTAL ")
      Ops->>Data: CALL DataProgram("READ", balance)
      Data-->>Ops: Return stored balance
      Ops-->>Student: Display current balance
    else Credit account (2)
      Main->>Ops: CALL Operations("CREDIT")
      Ops->>Student: Request credit amount
      Student-->>Ops: Enter amount
      Ops->>Data: CALL DataProgram("READ", balance)
      Data-->>Ops: Return stored balance
      Ops->>Ops: Add amount to balance
      Ops->>Data: CALL DataProgram("WRITE", updated balance)
      Data-->>Ops: Store updated balance
      Ops-->>Student: Display credited amount and new balance
    else Debit account (3)
      Main->>Ops: CALL Operations("DEBIT ")
      Ops->>Student: Request debit amount
      Student-->>Ops: Enter amount
      Ops->>Data: CALL DataProgram("READ", balance)
      Data-->>Ops: Return stored balance

      alt Balance covers debit
        Ops->>Ops: Subtract amount from balance
        Ops->>Data: CALL DataProgram("WRITE", updated balance)
        Data-->>Ops: Store updated balance
        Ops-->>Student: Display debited amount and new balance
      else Insufficient funds
        Ops-->>Student: Display insufficient-funds message
      end
    else Exit (4)
      Main->>Main: Set continue flag to NO
      Main-->>Student: Display goodbye message
    else Invalid choice
      Main-->>Student: Display invalid-choice message
    end
  end
```
