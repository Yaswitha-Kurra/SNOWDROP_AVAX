# ❄️ SNOWDROP AVAX

SnowDrop AVAX is a Web3-powered tipping platform that lets you **tip AVAX or USDC directly on Twitter posts** without leaving the platform.  
It also includes **Jar Tipping**, allowing you to deposit funds in a personal on-chain "jar" and send gasless tips using a backend relayer.

---

## 📥 Download & Install the Extension

We are still awaiting approval on the Chrome Web Store.  
For now, you can manually download and load the extension from GitHub.

### Steps:
1. **Download Extension**
   - Get the extension from here: [SnowDrop Extension Repository](https://github.com/Yaswitha-Kurra/SnowDrop)
   
2. **Get Your Extension ID**
   - After loading the extension (see below), note down your **Extension ID** — it will be needed for configuration.

3. **Load the Extension in Developer Mode**
   - Open **Chrome** → go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in the top right).
   - Click **Load unpacked** → select the downloaded extension folder.
   - Pin the extension in your toolbar for quick access.

4. **Start Tipping**
   - Open Twitter, click the tip icon under a tweet, and send tips instantly.

---

## 💰 Jar Tipping (Backend Setup)

Jar Tipping lets you send gasless tips from your pre-funded jar.

### Steps:
1. **Download Backend**
   - Get the backend zip from the repository.
   
2. **Run the Backend**
   ```bash
   node index.cjs
