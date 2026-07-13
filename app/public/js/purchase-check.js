// Purchase check from Add Expense page — calls POST /expenses/purchase-check and renders JSON result.
(function(){
  'use strict';

  function money(n){
    return window.SwCurrencyFormat
      ? window.SwCurrencyFormat.formatMoney(n)
      : ('$' + (Number(n) || 0).toFixed(2));
  }

  function renderRecommendation(container, rec){
    if(!container) return;
    container.innerHTML = '';
    if(!rec){
      container.textContent = 'No recommendation available.';
      return;
    }

    var wrapper = document.createElement('div');
    wrapper.className = 'purchase-check__wrap';

    var title = document.createElement('div');
    title.style.fontWeight = 700;
    title.style.marginBottom = '0.25rem';
    title.textContent = 'Status: ' + (rec.result || 'Unknown');
    wrapper.appendChild(title);

    var badge = document.createElement('div');
    badge.style.marginBottom = '0.5rem';
    badge.textContent = (rec.spendingInsight && rec.spendingInsight.warningMessage) ? rec.spendingInsight.warningMessage : '';
    wrapper.appendChild(badge);

    var current = document.createElement('div');
    current.innerHTML = '<strong>Current:</strong> ' + money(rec.analysis.totalSpent) + ' spent / ' + money(rec.analysis.remainingBudget) + ' remaining';
    wrapper.appendChild(current);

    var after = document.createElement('div');
    after.style.marginTop = '0.35rem';
    after.innerHTML = '<strong>After purchase:</strong> ' + money(rec.itemPrice) + ' — new remaining ' + money(rec.analysis.newRemainingBudget) + ' (' + (rec.analysis.newPercentageUsed || 0) + '% used)';
    wrapper.appendChild(after);

    if (Array.isArray(rec.reasons) && rec.reasons.length){
      var reasons = document.createElement('ul');
      reasons.style.marginTop = '0.5rem';
      rec.reasons.forEach(function(r){
        var li = document.createElement('li');
        li.textContent = r;
        reasons.appendChild(li);
      });
      wrapper.appendChild(reasons);
    }

    container.appendChild(wrapper);
  }

  function showError(container, message){
    if(!container) return;
    container.innerHTML = '<div style="color:#9b1c1c">' + String(message) + '</div>';
  }

  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('checkPurchaseBtn');
    if(!btn) return;
    var form = document.getElementById('expenseForm') || document.getElementById('addExpenseForm');
    var resultEl = document.getElementById('purchaseCheckResult');

    btn.addEventListener('click', function(e){
      e.preventDefault();
      var amountEl = document.getElementById('amount');
      var titleEl = document.getElementById('title');
      var categoryIdEl = document.getElementById('categoryId');
      var categoryLabel = document.getElementById('expenseCategoryLabel');

      var amount = amountEl ? amountEl.value : '';
      var title = titleEl ? titleEl.value : '';
      var categoryName = categoryLabel ? categoryLabel.textContent.trim() : '';

      if (!amount || isNaN(Number(String(amount).replace(/[$,\s]/g,'')))){
        showError(resultEl, 'Please enter a valid amount first.');
        return;
      }

      resultEl.innerHTML = 'Checking...';

      fetch('/expenses/purchase-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ itemName: title, itemPrice: amount, category: categoryName })
      })
      .then(function(res){ return res.json(); })
      .then(function(json){
        if (!json || !json.success){
          showError(resultEl, json && json.error ? json.error : 'Unexpected response');
          return;
        }
        renderRecommendation(resultEl, json.recommendation);
      })
      .catch(function(err){
        showError(resultEl, 'Request failed');
        console.error('Purchase check failed', err);
      });
    });
  });
})();
