// notifications.js - Real-time notification system for TalesPay

class NotificationSystem {
  constructor(database, userId) {
    this.database = database;
    this.userId = userId;
    this.audio = new Audio('noti.mp3');
    this.audio.preload = 'auto';
    this.lastCheck = Date.now();
    this.notificationCount = 0;
    this.notificationElement = null;
    this.badgeElement = null;
    this.init();
  }

  init() {
    // Create notification UI if it doesn't exist
    this.createNotificationUI();
    
    // Listen for new transactions
    this.listenForTransactions();
    
    // Listen for balance changes
    this.listenForBalanceChanges();
    
    // Listen for profile updates
    this.listenForProfileUpdates();
  }

  createNotificationUI() {
    // Create notification container
    const container = document.createElement('div');
    container.id = 'notification-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(container);

    // Create notification badge for header
    const badge = document.createElement('div');
    badge.id = 'notification-badge';
    badge.style.cssText = `
      position: fixed;
      top: 20px;
      right: 80px;
      background: #b22234;
      color: white;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      z-index: 10000;
      cursor: pointer;
      pointer-events: auto;
      display: none;
    `;
    badge.onclick = () => this.showNotifications();
    document.body.appendChild(badge);
    
    this.notificationElement = container;
    this.badgeElement = badge;
  }

  playSound() {
    try {
      this.audio.currentTime = 0;
      this.audio.play().catch(e => console.log('Audio play failed:', e));
    } catch (error) {
      console.log('Sound error:', error);
    }
  }

  showNotification(title, message, type = 'info', data = null) {
    this.notificationCount++;
    this.updateBadge();

    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: white;
      border-radius: 16px;
      padding: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.2);
      margin-bottom: 10px;
      min-width: 300px;
      max-width: 400px;
      border-left: 4px solid ${type === 'credit' ? '#0f6e4a' : type === 'debit' ? '#b22234' : '#13294b'};
      animation: slideIn 0.3s ease;
      pointer-events: auto;
      cursor: pointer;
      transition: transform 0.2s;
      position: relative;
      overflow: hidden;
    `;

    // Add hover effect
    notification.onmouseover = () => {
      notification.style.transform = 'translateX(-5px)';
    };
    notification.onmouseout = () => {
      notification.style.transform = 'translateX(0)';
    };

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.remove();
            this.notificationCount--;
            this.updateBadge();
          }
        }, 300);
      }
    }, 5000);

    // Click to dismiss
    notification.onclick = () => {
      notification.remove();
      this.notificationCount--;
      this.updateBadge();
      
      // If it's a transaction, maybe navigate to details
      if (data && data.transactionId) {
        // Optional: navigate to transaction details
        // window.location.href = `transaction.html?id=${data.transactionId}`;
      }
    };

    // Icon based on type
    const icon = type === 'credit' ? 'call_received' : 
                 type === 'debit' ? 'call_made' : 
                 type === 'balance' ? 'account_balance' : 'notifications';

    const iconColor = type === 'credit' ? '#0f6e4a' : 
                      type === 'debit' ? '#b22234' : '#13294b';

    // Format amount if present
    const amountHTML = data && data.amount ? 
      `<div style="font-weight: 700; color: ${iconColor}; margin-top: 8px; font-size: 1.1rem;">
        KES ${data.amount.toLocaleString()}
      </div>` : '';

    notification.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <div style="background: ${iconColor}20; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <span class="material-symbols-outlined" style="color: ${iconColor};">${icon}</span>
        </div>
        <div style="flex: 1;">
          <div style="font-weight: 600; color: #13294b; margin-bottom: 4px;">${title}</div>
          <div style="font-size: 0.9rem; color: #64748b;">${message}</div>
          ${amountHTML}
          <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 8px;">
            ${new Date().toLocaleTimeString()}
          </div>
        </div>
        <button style="background: none; border: none; cursor: pointer; color: #94a3b8;" onclick="event.stopPropagation(); this.closest('div[style*=\"pointer-events: auto\"]').remove(); window.notificationSystem.notificationCount--; window.notificationSystem.updateBadge();">
          <span class="material-symbols-outlined" style="font-size: 1.2rem;">close</span>
        </button>
      </div>
    `;

    this.notificationElement.appendChild(notification);
    this.playSound();
  }

  updateBadge() {
    if (this.notificationCount > 0) {
      this.badgeElement.style.display = 'flex';
      this.badgeElement.textContent = this.notificationCount > 9 ? '9+' : this.notificationCount;
    } else {
      this.badgeElement.style.display = 'none';
    }
  }

  showNotifications() {
    // Scroll to show all notifications
    this.notificationElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }

  listenForTransactions() {
    // Listen for new transactions
    const transactionsRef = this.database.ref('transactions')
      .orderByChild('userId')
      .equalTo(this.userId)
      .limitToLast(1);

    transactionsRef.on('child_added', (snapshot) => {
      const transaction = snapshot.val();
      const now = Date.now();
      
      // Only notify for transactions created in the last 10 seconds
      const txTime = new Date(transaction.createdAt).getTime();
      if (now - txTime < 10000) {
        
        if (transaction.type === 'credit') {
          // Money received
          this.showNotification(
            'Money Received! 💰',
            `From: ${transaction.senderName || transaction.from || 'Unknown'}`,
            'credit',
            transaction
          );
        } else if (transaction.type === 'debit') {
          // Money sent
          this.showNotification(
            'Money Sent 📤',
            `To: ${transaction.recipientName || transaction.to || 'Unknown'}`,
            'debit',
            transaction
          );
        }
      }
    });
  }

  listenForBalanceChanges() {
    // Listen for balance updates
    const balanceRef = this.database.ref(`users/${this.userId}/balance`);
    
    balanceRef.on('value', (snapshot) => {
      const newBalance = snapshot.val();
      const oldBalance = this.lastBalance;
      
      if (oldBalance !== undefined && newBalance !== oldBalance) {
        const difference = newBalance - oldBalance;
        
        if (Math.abs(difference) > 0) {
          this.showNotification(
            'Balance Updated',
            difference > 0 ? `+ KES ${difference.toLocaleString()}` : `- KES ${Math.abs(difference).toLocaleString()}`,
            difference > 0 ? 'credit' : 'debit',
            { amount: Math.abs(difference) }
          );
        }
      }
      
      this.lastBalance = newBalance;
    });
  }

  listenForProfileUpdates() {
    // Listen for profile changes
    const profileRef = this.database.ref(`users/${this.userId}/fullName`);
    
    profileRef.on('child_changed', (snapshot) => {
      this.showNotification(
        'Profile Updated',
        'Your account information has been updated',
        'info'
      );
    });
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Make available globally
window.NotificationSystem = NotificationSystem;