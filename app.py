import os
import json
from flask import Flask, render_template, request, jsonify
from supabase import create_client, Client

app = Flask(__name__)


def load_env():
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    os.environ.setdefault(key.strip(), val.strip())


load_env()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL") or os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("VITE_SUPABASE_ANON_KEY") or os.environ.get("SUPABASE_ANON_KEY", "")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

FRONT_DESK_PHONE = "0792194284"
FRONT_DESK_EMAIL = "guledmohamud099@gmail.com"


def contact_front_desk():
    return (
        f"Please call our front desk at {FRONT_DESK_PHONE} or email "
        f"{FRONT_DESK_EMAIL} for assistance."
    )


def restaurant_chatbot(message):
    """Generate a helpful response to a restaurant question."""
    text = message.lower().strip()

    if not text:
        return "What would you like to know?"

    first_word = text.split(maxsplit=1)[0].strip(".,!?") if text else ""
    if first_word in {"hello", "hi", "hey"}:
        return "Hi! Welcome to Guled Restaurant and Dining. How can I help?"

    if any(word in text for word in ["thanks", "thank you", "thx"]):
        return "You're welcome! Enjoy your meal."

    if any(word in text for word in ["hours", "opening", "open", "closing", "close"]):
        return (
            "We're open every day from 7:00 AM to 11:00 PM. "
            "You can order online anytime for delivery!"
        )

    if any(word in text for word in ["deliver", "delivery", "takeaway", "take away", "pickup"]):
        return (
            "Yes! We offer delivery across the city and pickup at our location. "
            "Just browse the menu and add items to your cart to place an order."
        )

    if any(word in text for word in ["menu", "food", "dish", "eat", "drink"]):
        return (
            "We have a wide selection! Browse the menu on the left — you'll find "
            "mains like Nyama Choma and Pilau, sides like Chapati and Samosa, "
            "plus drinks including Dawa Tea and fresh juices. Add items to your "
            "cart and check out when you're ready."
        )

    if any(word in text for word in ["price", "cost", "how much", "expensive", "cheap"]):
        return (
            "Our mains range from KSH 500 to KSH 1,200, sides from KSH 50 to KSH 300, "
            "and drinks from KSH 100 to KSH 250. Great value for generous portions!"
        )

    if any(word in text for word in ["order", "cart", "checkout", "check out", "buy"]):
        return (
            "To place an order, browse the menu, tap items to add them to your cart, "
            "then fill in your name, phone, and delivery address at checkout. "
            "We'll confirm your order right away!"
        )

    if any(word in text for word in ["pay", "payment", "mpesa", "cash"]):
        return (
            "We accept cash on delivery and M-Pesa. Pay our rider when your food arrives. "
            "Simple and convenient!"
        )

    if any(word in text for word in ["help", "services", "what can you do"]):
        return (
            "I can help with the menu, pricing, delivery, hours, and placing orders. "
            f"For anything else, " + contact_front_desk()
        )

    return (
        "I'm here to help with menu questions, pricing, delivery, and orders. "
        + contact_front_desk()
    )


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/menu")
def menu():
    try:
        response = supabase.table("menu_items").select("*").eq("available", True).order("sort_order").execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/order", methods=["POST"])
def place_order():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request."}), 400

    customer_name = (data.get("customer_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    address = (data.get("address") or "").strip()
    items = data.get("items", [])
    total = data.get("total", 0)
    notes = (data.get("notes") or "").strip()

    if not customer_name or not phone or not address:
        return jsonify({"error": "Name, phone, and address are required."}), 400

    if not isinstance(items, list) or len(items) == 0:
        return jsonify({"error": "Your cart is empty."}), 400

    try:
        response = supabase.table("orders").insert({
            "customer_name": customer_name,
            "phone": phone,
            "address": address,
            "items": items,
            "total": total,
            "status": "pending",
            "notes": notes,
        }).execute()

        order = response.data[0] if response.data else None
        return jsonify({"order": order}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/reviews/<menu_item_id>")
def get_reviews(menu_item_id):
    try:
        response = supabase.table("reviews").select("*").eq("menu_item_id", menu_item_id).order("created_at", desc=True).execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/reviews", methods=["POST"])
def add_review():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"error": "Invalid request."}), 400

    menu_item_id = (data.get("menu_item_id") or "").strip()
    author_name = (data.get("author_name") or "").strip()
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()

    if not menu_item_id or not author_name:
        return jsonify({"error": "Menu item and your name are required."}), 400

    try:
        rating = int(rating)
    except (TypeError, ValueError):
        return jsonify({"error": "Rating must be a number from 1 to 5."}), 400

    if rating < 1 or rating > 5:
        return jsonify({"error": "Rating must be between 1 and 5 stars."}), 400

    try:
        response = supabase.table("reviews").insert({
            "menu_item_id": menu_item_id,
            "author_name": author_name[:80],
            "rating": rating,
            "comment": comment[:500],
        }).execute()

        review = response.data[0] if response.data else None
        return jsonify({"review": review}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/order/<order_id>")
def get_order(order_id):
    try:
        response = supabase.table("orders").select("*").eq("id", order_id).maybeSingle().execute()
        if not response.data:
            return jsonify({"error": "Order not found."}), 404
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return jsonify({"reply": "Please send a JSON object containing a message."}), 400

    message = data.get("message", "")
    if not isinstance(message, str):
        return jsonify({"reply": "Please send a text message."}), 400

    reply = restaurant_chatbot(message)
    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(debug=False)
