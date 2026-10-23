
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatMessages = document.getElementById("chat-messages");
const sendButton = document.getElementById("send-button");

function createContactIcon(type) {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 20 20");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute(
        "d",
        type === "email"
            ? "M3 5.5h14v9H3z M3.5 6l6.5 5 6.5-5"
            : "M6.2 3.5h2.1l1.1 3.1-1.6 1.2a12 12 0 0 0 4.4 4.4l1.2-1.6 3.1 1.1v2.1a1.7 1.7 0 0 1-1.8 1.7A12.8 12.8 0 0 1 4.5 5.3a1.7 1.7 0 0 1 1.7-1.8Z"
    );
    icon.appendChild(path);
    return icon;
}

function addMessage(sender, message) {
    const bubble = document.createElement("div");
    bubble.className = `message ${sender}`;

    const label = document.createElement("strong");
    label.className = "message-time";
    label.textContent = sender === "user" ? "YOU · JUST NOW" : "CONCIERGE · JUST NOW";

    const paragraph = document.createElement("p");
    const contactPattern = /([\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?:\+?\d[\d ()-]{7,}\d))/g;
    let lastIndex = 0;
    for (const match of message.matchAll(contactPattern)) {
        paragraph.appendChild(
            document.createTextNode(message.slice(lastIndex, match.index))
        );

        const contact = match[0];
        const isEmail = contact.includes("@");
        const link = document.createElement("a");
        link.className = "contact-link";
        link.appendChild(createContactIcon(isEmail ? "email" : "phone"));

        const contactText = document.createElement("span");
        contactText.textContent = contact;
        link.appendChild(contactText);

        if (isEmail) {
            link.href = `mailto:${contact}?subject=Message%20for%20Guled`;
            link.setAttribute("aria-label", `Email Guled at ${contact}`);
        } else {
            link.href = `tel:${contact.replace(/[^\d+]/g, "")}`;
            link.setAttribute("aria-label", `Call Guled at ${contact}`);
        }
        paragraph.appendChild(link);
        lastIndex = match.index + contact.length;
    }
    paragraph.appendChild(document.createTextNode(message.slice(lastIndex)));

    bubble.append(label, paragraph);
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage(message) {
    const question = message.trim();

    if (!question) return;

    addMessage("user", question);
    messageInput.value = "";
    sendButton.disabled = true;
    sendButton.querySelector("span").textContent = "Sending";

    try {
        const response = await fetch("/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: question })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.reply || "The request failed.");
        }

        addMessage("bot", data.reply);
    } catch (error) {
        addMessage(
            "bot",
            "Sorry, I could not connect to the hotel server. " +
            "Please check that the Python application is running, " +
            "then try again."
        );
        console.error(error);
    } finally {
        sendButton.disabled = false;
        sendButton.querySelector("span").textContent = "Send";
        messageInput.focus();
    }
}

chatForm.addEventListener("submit", function (event) {
    event.preventDefault();
    sendMessage(messageInput.value);
});

document.querySelectorAll("[data-message]").forEach(button => {
    button.addEventListener("click", function () {
        sendMessage(button.dataset.message);
    });
});
