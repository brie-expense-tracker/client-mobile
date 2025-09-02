# Recurring Expense Payment System

## Overview

The recurring expense payment system allows users to track and manage recurring expenses like rent, utilities, subscriptions, etc. Users can mark these expenses as paid without creating full transactions.

## How It Works

### 1. Automatic Detection

- The system automatically detects recurring patterns from your transaction history
- Patterns are identified based on vendor name, amount, and frequency
- Detected patterns become "Recurring Expenses" in your dashboard

### 2. Payment Status Tracking

- Each recurring expense shows whether the current period is paid
- Payment status is determined by:
  - Linked transactions (transactions that match the recurring expense)
  - Manual payment records (when you mark as paid)

### 3. Ways to Mark as Paid

#### Option A: Quick Mark as Paid (NEW)

- **Dashboard**: Tap "Mark as Paid" button on any unpaid recurring expense
- **Recurring Expenses List**: Tap "Mark as Paid" button on any expense
- **Overdue Expenses**: Shows "Pay Now" button for overdue items
- This creates a payment record without creating a transaction

#### Option B: Create Transaction and Link

- Go to "Add Transaction" screen
- Enter the expense details
- If the system detects a match with a recurring expense, it will suggest linking
- Or manually link by selecting the recurring expense
- The transaction will be linked to the recurring expense

#### Option C: Auto-Detection

- When you add a transaction that matches a recurring expense pattern
- The system may automatically link it to the recurring expense
- This happens in the background

## User Interface

### Dashboard Widget

- Shows upcoming recurring expenses
- Displays payment status with icons:
  - ✅ Green checkmark = Paid
  - ⚠️ Orange circle = Due soon
  - ❌ Red circle = Overdue
- "Mark as Paid" button for unpaid expenses
- "Pay Now" button for overdue expenses

### Recurring Expenses List

- Full list of all recurring expenses
- Detailed payment status
- "Mark as Paid" button for each expense
- Payment history and transaction linking

## Payment Periods

The system calculates payment periods based on frequency:

- **Monthly**: Current month (1st to last day)
- **Weekly**: Current week (Monday to Sunday)
- **Quarterly**: Current quarter (3-month period)
- **Yearly**: Current year (January to December)

## Benefits

1. **Quick Payment Tracking**: Mark expenses as paid without creating full transactions
2. **Visual Status**: Clear indicators of what's paid vs unpaid
3. **Overdue Alerts**: Special highlighting for overdue expenses
4. **Flexible Options**: Multiple ways to track payments
5. **Automatic Detection**: System learns from your spending patterns

## Example Workflow

1. **Rent Payment**:

   - System detects monthly $1500 payment to "ABC Apartments"
   - Creates recurring expense: "ABC Apartments - $1500/month"
   - Shows as unpaid for current month
   - Tap "Mark as Paid" to record payment
   - Status changes to "Paid" with green checkmark

2. **Netflix Subscription**:
   - System detects monthly $15.99 payment to "Netflix"
   - Creates recurring expense: "Netflix - $15.99/month"
   - When you pay, either:
     - Mark as paid directly, OR
     - Add transaction and link it to the recurring expense

## Technical Details

- Payment records are stored separately from transactions
- System checks payment status using `isCurrentPeriodPaid()`
- Payment records include period start/end dates
- Multiple payment methods supported (manual, linked transaction, etc.)
- Automatic period calculation based on frequency
