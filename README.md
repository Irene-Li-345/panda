# Panda Bistro

A pickup-only prototype with sample menu items, a simulated phone verification
step, and a kitchen screen that updates without staff acknowledgment.

## Try it locally

Serve the `public` directory with a static web server. For example, with Python
installed, run `python -m http.server 4173 --bind 127.0.0.1 --directory public`.
Open `http://127.0.0.1:4173/` and `http://127.0.0.1:4173/?view=kitchen` in two
tabs of the same browser profile. Enable sound in the kitchen tab once, then
place a customer order using the sample number `(609) 555-0142` and the
on-screen code. The customer should see an order number and a pickup estimate
of about 15 minutes. The kitchen should see a ticket and hear up to five chimes.

Orders and the pause switch are stored in the browser. This prototype uses
sample prices, an always-open schedule unless paused, and pay at pickup. It
does not store phone numbers, send texts, or support separate devices. The
staff screen is a local demo without sign-in.
