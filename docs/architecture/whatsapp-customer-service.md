# WhatsApp Customer Service

## Purpose

WhatsApp is a customer-to-business handoff after an order is already persisted. It never creates, changes, or sends an order automatically.

## Central WhatsApp Module

`window.GoTienda.whatsapp` owns the business phone, URL encoding, popup attempt, general support, persisted checkout messages, and existing-order support.

## Post-Persistence Rule

Checkout calls `create_order_from_cart` first. Only after success and cart cleanup does it reload the order through the authenticated Supabase client and open WhatsApp.

## Authoritative Order Data

Messages use the RLS-authorized persisted order, delivery snapshot, item snapshots, total, status, and `points_earned`. They never use current cart prices, localStorage, catalog names, or the current loyalty conversion as authority.

## Existing and General Support

Mi cuenta reloads a selected order through RLS before preparing concise support. The floating customer-service action uses a general message without customer or order data. Legacy orders with missing delivery data remain supported.

## Popup Blocking and Privacy

The same prepared URL is exposed as the checkout fallback link if a popup is blocked. The browser does not auto-send, log, or persist WhatsApp messages, addresses, or message history.
