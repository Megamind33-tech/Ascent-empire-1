/**
 * EconomicLedger.js — Financial Transparency Dashboard
 * =======================================================
 * Provides a detailed breakdown of income and expenses.
 * Helps the player understand "where the money is going."
 */

import { CONFIG } from '../config.js';

export function openEconomicLedger(state) {
  const overlay = document.getElementById('ledgerOverlay');
  if (!overlay) return;

  const container = document.getElementById('ledgerContent');
  if (!container) return;

  // Calculate detailed breakdown
  const incomeDetails = [
    { label: 'Base Housing Tax', value: state.buildings.housing * 2.2 },
    { label: 'Store Revenue', value: state.buildings.stores * 4 },
    { label: 'Mining Output', value: state.buildings.mines * 3.5 },
    { label: 'Refinery Profits', value: state.buildings.refineries * 6 },
    { label: 'Law Modifiers', value: state.activeModifiers.cashDelta }
  ].filter(i => Math.abs(i.value) > 0.1);

  // Upkeep values mirror economySystem.js runEconomyTick exactly so the ledger stays accurate
  const expenseDetails = [
    { label: 'Police/Security Upkeep', value: state.buildings.police * 0.75 + state.buildings.acc * 0.9 + state.buildings.dec * 0.9 },
    { label: 'Military Base Maintenance', value: state.buildings.bases * 1.8 + state.buildings.barracks * 0.9 }
  ].filter(i => i.value > 0.1);

  const totalIncome = incomeDetails.reduce((a, b) => a + b.value, 0);
  const totalExpense = expenseDetails.reduce((a, b) => a + b.value, 0);
  const netFlow = totalIncome - totalExpense;

  container.innerHTML = `
    <div class="ledger-section">
      <h3>📈 REVENUE (per second)</h3>
      ${incomeDetails.map(item => `
        <div class="ledger-row">
          <span>${item.label}</span>
          <span class="pos">+$${item.value.toFixed(2)}</span>
        </div>
      `).join('')}
      <div class="ledger-total">Total: +$${totalIncome.toFixed(2)}</div>
    </div>

    <div class="ledger-section">
      <h3>📉 EXPENSES (per second)</h3>
      ${expenseDetails.map(item => `
        <div class="ledger-row">
          <span>${item.label}</span>
          <span class="neg">-$${item.value.toFixed(2)}</span>
        </div>
      `).join('')}
      <div class="ledger-total">Total: -$${totalExpense.toFixed(2)}</div>
    </div>

    <div class="ledger-footer">
      <div class="net-flow ${netFlow >= 0 ? 'pos' : 'neg'}">
        NET FLOW: ${netFlow >= 0 ? '+' : ''}$${netFlow.toFixed(2)} / sec
      </div>
    </div>
  `;

  overlay.style.display = 'flex';
}

export function initLedgerUI() {
  const closeBtn = document.querySelector('.close-ledger');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      document.getElementById('ledgerOverlay').style.display = 'none';
    });
  }
}
