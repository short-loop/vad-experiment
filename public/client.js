const captions = window.document.getElementById("captions");

async function getMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    return new MediaRecorder(stream);
  } catch (error) {
    console.error("Error accessing microphone:", error);
    throw error;
  }
}

async function openMicrophone(microphone, socket) {
  return new Promise((resolve) => {
    microphone.onstart = async () => {
      console.log("WebSocket connection opened");
      document.body.classList.add("recording");
      const myvad = await vad.MicVAD.new({
        onFrameProcessed: (probabilities) => {
          // console.log("FRAME PROCESSED");
          // console.log(probabilities);
        },
        onSpeechStart: (e) => {
          console.log("SPEECH STARTED", e);
        },
        // onVADMisfire: () => { ... },
        onSpeechEnd: (audio) => {
          console.log("audio ended");
        },
      });
      myvad.start();
      resolve();
    };

    microphone.onstop = () => {
      console.log("WebSocket connection closed");
      document.body.classList.remove("recording");
    };

    microphone.ondataavailable = (event) => {
      // console.log(event);
      if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };

    microphone.start(1000);
  });
}

async function closeMicrophone(microphone) {
  microphone.stop();
}

async function start(socket) {
  const listenButton = document.querySelector("#record");
  let microphone;

  console.log("client: waiting to open microphone");

  listenButton.addEventListener("click", async () => {
    if (!microphone) {
      try {
        microphone = await getMicrophone();
        await openMicrophone(microphone, socket);
      } catch (error) {
        console.error("Error opening microphone:", error);
      }
    } else {
      await closeMicrophone(microphone);
      microphone = undefined;
    }
  });
}

window.addEventListener("load", async () => {
  const socket = new WebSocket("ws://localhost:3002");
  socket.addEventListener("open", async () => {
    console.log("WebSocket connection opened");
    await start(socket);
  });
  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
    console.log(data.channel.alternatives[0]);
    if (data.channel.alternatives[0].transcript !== "") {
      captions.innerHTML = data
        ? `<span>${data.channel.alternatives[0].transcript}</span>`
        : "";
    }
  });

  socket.addEventListener("close", () => {
    console.log("WebSocket connection closed");
  });
});
