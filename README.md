# What is Escape Arena

Escape Arena is an escape room based in Toronto being built by a friend. I am consulting for the company and my first project was to build a dyanmic soundboard to notify the amount of time participants have left in the game. 

There are cue's that can be selected (5 minutes left, 10 minutes left, etc), and you can select any length of time for the room to be (harder rooms can be alloted more time). 

One thing I'd like to add in the future is live feedback for raspberry pi traps we've set up in the arena. The cue cooresponding to this is titled "blackout" to signify 1 minute left in the game, but this is a (hopefully) temporary placeholder. 

## Flask Socket.IO connection

### Offline LAN deployment

Install dependencies once while online, then build and copy the complete site:

```sh
cd easound-main
npm install
npm run build
python3 ../earaspberrypi-main/copy_frontend.py ./dist
cd ../earaspberrypi-main
source .venv/bin/activate
python client.py
```

For folders named `easound` and `earaspberrypi`, substitute those names.
Install the server requirements into its `.venv` during initial setup as well.
Open `http://<laptop-LAN-IP>:5000` on the same Wi-Fi network. The production
build uses `/` as its base and Flask serves the entire `dist` copy, including
all MP3s from `public/`. React and Socket.IO are bundled locally, with no runtime
CDNs. After setup, startup and playback need no internet. Rebuild and rerun the
copy script after frontend edits. This build targets Flask, not GitHub Pages.

Set the Pico's `SERVER_HOST` to the laptop's LAN IP, and allow incoming port
5000 connections through the laptop firewall. The Wi-Fi network must allow
devices to communicate with each other. If port 5000 is occupied (for example
by macOS AirPlay Receiver), free it or use `PORT=5050 python client.py`, open
port 5050 in the browser, and set the Pico's `SERVER_PORT` to 5050 too.
Browser audio may require clicking Start once to enable playback.

Run `npm install`, then `npm run dev`. For a separate local Flask server,
create `.env.local` in this repository containing:

```dotenv
VITE_SOCKET_URL=http://localhost:5000
```

Restart Vite after changing the environment file. Development uses this URL
when set, otherwise it connects to `window.location.origin`. Production always
uses the page's origin, even if `VITE_SOCKET_URL` was set during the build.
Production hosting must serve or proxy `/socket.io/` to Flask on that same
origin. GitHub Pages alone cannot provide the Flask Socket.IO endpoint.

The frontend receives `trap_triggered` events with `device_id`, `event`,
`location`, `sequence`, and `received_at`. It displays the trap location and
server timestamp in the browser's local time and plays the existing `trap.mp3`.
The server connection status updates on connect, disconnect, and connection
errors. Listeners are registered once and removed when the component unmounts.
The timer and normal audio cues are unchanged.

Verify with `npm run build` and `npm run lint`.

Note: the text below is the generated README from the Vite development server (React, Javascript)

# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
