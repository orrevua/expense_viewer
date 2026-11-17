// Browser-side wrappers for the finance server actions: turn { ok: false } results
// into thrown errors that carry the real reason (shown to the user).
import * as actions from '@/actions/finance';

export class ActionError extends Error {
  constructor(result) {
    super(result.error || 'error');
    this.setup = !!result.setup;
  }
}

const wrap = (fn) => async (...args) => {
  const result = await fn(...args);
  if (result && result.ok === false) throw new ActionError(result);
  return result;
};

export const createCategory = wrap(actions.createCategory);
export const updateCategory = wrap(actions.updateCategory);
export const deleteCategory = wrap(actions.deleteCategory);
export const addTransaction = wrap(actions.addTransaction);
export const updateTransaction = wrap(actions.updateTransaction);
export const deleteTransaction = wrap(actions.deleteTransaction);
export const setBudget = wrap(actions.setBudget);
export const createAccount = wrap(actions.createAccount);
export const updateAccount = wrap(actions.updateAccount);
export const deleteAccount = wrap(actions.deleteAccount);
export const setMajorThreshold = wrap(actions.setMajorThreshold);
export const createRecurring = wrap(actions.createRecurring);
export const updateRecurring = wrap(actions.updateRecurring);
export const endRecurring = wrap(actions.endRecurring);
export const deleteRecurring = wrap(actions.deleteRecurring);
export const markRecurringPaid = wrap(actions.markRecurringPaid);
export const unmarkRecurringPaid = wrap(actions.unmarkRecurringPaid);
export const setCardBillAmount = wrap(actions.setCardBillAmount);
export const setCardBillPaid = wrap(actions.setCardBillPaid);
export const createGoal = wrap(actions.createGoal);
export const updateGoal = wrap(actions.updateGoal);
export const deleteGoal = wrap(actions.deleteGoal);
export const addSavingsEntry = wrap(actions.addSavingsEntry);
export const deleteSavingsEntry = wrap(actions.deleteSavingsEntry);
export const setCarryover = wrap(actions.setCarryover);
export const removeCarryover = wrap(actions.removeCarryover);

// Message for an alert(): the setup hint for database permission/table problems, else the reason.
export function errorMessage(t, err) {
  if (err instanceof ActionError) {
    return err.setup ? `${t('errorSaving')}\n\n${t('setupSaveHint')}\n\n(${err.message})` : `${t('errorSaving')}\n\n(${err.message})`;
  }
  return t('errorSaving');
}
