
# Zoom Chatbot Tutorial Series (Node.js + Express)

Welcome to the **Zoom Chatbot Tutorial Series**, a hands-on guide to building your own Zoom Team Chatbot using **Node.js** and **Express**.  
This series will teach you how to create, configure, and extend a chatbot that interacts with Zoom Team Chat — from sending messages and handling events to building interactive cards and threaded replies.

---

##  What You’ll Build

By the end of this series, you’ll have a working chatbot that can:

- Post and reply to messages within Zoom Team Chat
- Handle events from users and channels
- Respond to slash commands
- Send interactive messages, markdown, and emojis
- Search messages using the Zoom Team Chat API
- Schedule messages for future delivery
- Integrate with external APIs or databases

---

##  Tech Stack

| Tool | Description |
|------|--------------|
| **Node.js** | Backend runtime for the chatbot logic |
| **Express.js** | Framework for routing and handling webhooks |
| **ngrok** | Tunneling service to expose your local dev server to Zoom |
| **dotenv** | For managing environment variables |
| **Axios / node-fetch** | For calling the Zoom Team Chat REST APIs |
| **Zoom Chatbot SDK (API)** | Used to authenticate, send, and receive messages |
| **Chatbot Studio** | Visual builder for Zoom Chatbot configurations |

---

## 📁 Folder Structure

```bash
zoom-chatbot-series/
├── server.js                  # Entry point for Express server
├── routes/
│   ├── webhookRoutes.js       # Routes for handling Zoom chatbot events
│   ├── messageRoutes.js       # Example: endpoint to send messages
├── utils/
│   ├── zoomAuth.js            # OAuth 2.0 token generation
│   ├── zoomApi.js             # Functions for interacting with Zoom APIs
├── views/
│   ├── index.html             # Optional landing page
├── .env                       # Environment variables (Client ID, Secret, etc.)
├── package.json
└── README.md
````

---

##  Prerequisites

Before starting, make sure you have:

1. A [Zoom Developer Account](https://developers.zoom.us)
2. A **Server-to-Server OAuth App** created in the [Zoom App Marketplace](https://marketplace.zoom.us/)
3. Node.js (v18+ recommended)
4. [ngrok](https://ngrok.com) (or another tunneling service)
5. Your Zoom Chatbot credentials:

   * **Client ID**
   * **Client Secret**
   * **Bot JID**
   * **Verification Token**

---

##  Getting Started

1. **Clone this repo**

   ```bash
   git clone https://github.com/yourusername/zoom-chatbot-series.git
   cd zoom-chatbot-series
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Create a `.env` file**

   ```bash
   ZOOM_CLIENT_ID=your_client_id
   ZOOM_CLIENT_SECRET=your_client_secret
   ZOOM_BOT_JID=your_bot_jid
   ZOOM_VERIFICATION_TOKEN=your_verification_token
   PORT=4000
   ```

4. **Start the local server**

   ```bash
   npm start
   ```

5. **Expose your server using ngrok**

   ```bash
   ngrok http 4000
   ```

   Copy the ngrok HTTPS URL and set it as your **Chatbot Endpoint URL** in the Zoom App Marketplace.

---

##  Tutorial Series

| Episode | Title                                | Description                                                                             |
| ------- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| 1       | **Setup & Send Messages**            | Set up a basic Express server, connect it to Zoom, and send your first message.         |
| 2       | **Handle Events**                    | Use webhook events to respond dynamically to chat messages.                             |
| 3       | **Slash Commands**                   | Implement custom slash commands to trigger bot actions.                                 |
| 4       | **Markdown & Emojis**                | Format messages beautifully using markdown and emojis.                                  |
| 5       | **Reactions & Interactive Messages** | Capture and respond to reactions and interactive message components.                    |
| 6       | **Threaded Replies**                 | Learn how to reply to specific messages within a thread using the `reply_to` parameter. |
| 7       | **Search Messages via API**          | Retrieve and filter Zoom Team Chat messages using the API.                              |
| 8       | **Scheduling Messages**              | Automate and schedule future chatbot messages.                                          |
| 9       | **Build a Zoom Workplace App**       | Integrate your chatbot into a Zoom Workplace App for seamless collaboration.            |

---

##  Example: Sending a Message

```js
import fetch from "node-fetch";

async function sendMessage(toJid, text) {
  const token = await getAccessToken();
  const res = await fetch("https://api.zoom.us/v2/im/chat/messages", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to_jid: toJid,
      message: text,
    }),
  });
  return res.json();
}
```

---

##  Learning Objectives

* Understand how Zoom’s Chatbot API works
* Learn how to authenticate using OAuth 2.0
* Implement event-driven workflows in Express
* Enhance user interaction through markdown, emojis, and buttons
* Build production-ready Zoom chat integrations

---

##  Contributing

Pull requests are welcome!
If you’d like to suggest topics, improvements, or bug fixes, please open an issue or submit a PR.

---

## 📚 Resources

* [Zoom Team Chat API Documentation](https://developers.zoom.us/docs/team-chat-api/)
* [Zoom Chatbot Documentation](https://developers.zoom.us/docs/api/chatbot/)
* [Zoom App Marketplace](https://marketplace.zoom.us/)
* [Zoom Developer Community Forum](https://devforum.zoom.us/)


