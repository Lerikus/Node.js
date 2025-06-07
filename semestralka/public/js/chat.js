document.addEventListener('DOMContentLoaded', function() {
  // Get elements
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const messagesContainer = document.getElementById('messages-container');
  const channelIdElement = document.getElementById('channel-id');
  
  if (!messageForm || !channelIdElement) {
    return; // Not on a chat page
  }
  
  const channelId = channelIdElement.value;
  const userId = document.getElementById('user-id')?.value;
  
  // Focus input when the page loads
  messageInput.focus();
  
  // Load initial messages
  loadMessages();
  
  // --- WebSocket setup ---
  let ws;
  let reconnectTimeout;

  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${protocol}://${window.location.host}/ws?channelId=${channelId}`);

    ws.addEventListener('open', () => {
      // Optionally: console.log('WebSocket connected');
    });

    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_message') {
        // Add the new message to the UI
        if (messagesNeedUpdate([...previousMessages, data.message])) {
          // Only append if it's a new message
          appendMessageToUI(data.message);
          previousMessages.push(data.message);
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    });

    ws.addEventListener('close', () => {
      // Try to reconnect after a short delay
      reconnectTimeout = setTimeout(connectWebSocket, 2000);
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }

  connectWebSocket();
  
  // Handle form submission
  messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    // Get HTML content and plain text fallback
    const content = messageInput.innerHTML.trim();
    const plainText = messageInput.innerText.trim();
    const imageInput = document.getElementById('image-input');
    const file = imageInput && imageInput.files && imageInput.files[0];
    if (!plainText && !file) return;
    try {
      let response;
      if (file) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('channelId', channelId);
        formData.append('image', file);
        response = await fetch('/api/messages', {
          method: 'POST',
          body: formData
        });
      } else {
        response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content,
            channelId
          })
        });
      }
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      messageInput.innerHTML = '';
      if (imageInput) imageInput.value = '';
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      showErrorToast('Failed to send message. Please try again.');
    }
  });
  
  // Function to load messages
  async function loadMessages() {
    try {
      const response = await fetch(`/api/messages/${channelId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const messages = await response.json();
      
      // Clear loading message if present
      const loadingElement = document.querySelector('.loading-messages');
      if (loadingElement) {
        loadingElement.remove();
      }
      
      // Check if we need to update the UI
      if (messagesNeedUpdate(messages)) {
        // Clear messages container
        messagesContainer.innerHTML = '';
        
        // Group messages by date
        const messagesByDate = groupMessagesByDate(messages);
        
        // Add messages in reverse order (newest at bottom)
        Object.keys(messagesByDate).forEach(date => {
          // Add date divider
          messagesContainer.appendChild(createDateDivider(date));
          
          // Add messages for this date
          messagesByDate[date].forEach(message => {
            appendMessageToUI(message);
          });
        });
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
      
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  }
  
  // Track previous messages for comparison
  let previousMessages = [];
  
  // Check if messages need to be updated in UI
  function messagesNeedUpdate(newMessages) {
    // If length is different, update is needed
    if (previousMessages.length !== newMessages.length) {
      previousMessages = newMessages;
      return true;
    }
    
    // If any message ID is different, update is needed
    const needsUpdate = newMessages.some((msg, i) => 
      !previousMessages[i] || previousMessages[i].id !== msg.id
    );
    
    if (needsUpdate) {
      previousMessages = newMessages;
    }
    
    return needsUpdate;
  }
  
  // Group messages by date
  function groupMessagesByDate(messages) {
    return messages.reverse().reduce((groups, message) => {
      const date = new Date(message.createdAt).toLocaleDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});
  }
  
  // Create a date divider element
  function createDateDivider(dateStr) {
    const today = new Date().toLocaleDateString();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    
    let displayDate = dateStr;
    if (dateStr === today) {
      displayDate = "Today";
    } else if (dateStr === yesterday) {
      displayDate = "Yesterday";
    }
    
    const divider = document.createElement('div');
    divider.className = 'date-divider';
    divider.innerHTML = `
      <hr>
      <span>${displayDate}</span>
      <hr>
    `;
    
    return divider;
  }
  
  // Append a message to the UI
  function appendMessageToUI(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.id = `message-${message.id}`;
    
    // Check if this message is from the current user
    if (message.user.id == userId) {
      messageElement.classList.add('message-own');
    }
    
    const time = new Date(message.createdAt).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit'
    });
    
    let imageHtml = '';
    if (message.imageUrl) {
      imageHtml = `<div class="message-image"><img src="${message.imageUrl}" alt="uploaded image" style="max-width:220px;max-height:180px;border-radius:6px;margin-top:6px;"></div>`;
    }
    
    messageElement.innerHTML = `
      <div class="message-header">
        <span class="message-username">${escapeHtml(message.user.username)}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-content">${formatMessageContent(message.content)}</div>
      ${imageHtml}
    `;
    
    messagesContainer.appendChild(messageElement);
  }
  
  // Format message content (convert URLs to links, Markdown-like formatting, etc)
  function formatMessageContent(content) {
    // DO NOT escape HTML here, since we want to allow formatting tags
    // Bold: **text** or __text__
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    content = content.replace(/__(.*?)__/g, '<strong>$1</strong>');
    // Italic: *text* or _text_ (not inside bold)
    content = content.replace(/(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    content = content.replace(/(?<!_)_(?!_)([^_]+)(?<!_)_(?!_)/g, '<em>$1</em>');
    // Strikethrough: ~~text~~
    content = content.replace(/~~(.*?)~~/g, '<s>$1</s>');

    // Replace URLs with clickable links
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    content = content.replace(
      urlRegex, 
      url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`
    );
    // Replace newlines with <br>
    return content.replace(/\n/g, '<br>');
  }
  
  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  // Show error toast
  function showErrorToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.classList.add('toast-visible');
    }, 10);
    
    setTimeout(() => {
      toast.classList.remove('toast-visible');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 3000);
  }
  
  // --- Formatting toolbar logic for contenteditable ---
  function wrapSelectionHtml(tag) {
    document.execCommand(tag, false, null);
    messageInput.focus();
  }

  // Attach event listeners to formatting buttons if present
  const boldBtn = document.getElementById('format-bold');
  const italicBtn = document.getElementById('format-italic');
  const strikeBtn = document.getElementById('format-strike');
  const underlineBtn = document.getElementById('format-underline');

  if (boldBtn) boldBtn.addEventListener('click', function(e) {
    e.preventDefault();
    wrapSelectionHtml('bold');
  });
  if (italicBtn) italicBtn.addEventListener('click', function(e) {
    e.preventDefault();
    wrapSelectionHtml('italic');
  });
  if (strikeBtn) strikeBtn.addEventListener('click', function(e) {
    e.preventDefault();
    wrapSelectionHtml('strikeThrough');
  });
  if (underlineBtn) underlineBtn.addEventListener('click', function(e) {
    e.preventDefault();
    wrapSelectionHtml('underline');
  });
  
  // Add CSS for date divider and toast
  const style = document.createElement('style');
  style.textContent = `
    .date-divider {
      display: flex;
      align-items: center;
      margin: 20px 0;
      color: #616061;
      font-size: 12px;
    }
    
    .date-divider hr {
      flex: 1;
      border: none;
      height: 1px;
      background-color: #E2E2E2;
    }
    
    .date-divider span {
      padding: 0 10px;
    }
    
    .toast {
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%) translateY(-20px);
      padding: 10px 20px;
      background-color: #E01E5A;
      color: white;
      border-radius: 4px;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.3s, transform 0.3s;
    }
    
    .toast-visible {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  `;
  document.head.appendChild(style);
  
  // Clean up when leaving the page
  window.addEventListener('beforeunload', () => {
    if (ws) ws.close();
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
  });
});
