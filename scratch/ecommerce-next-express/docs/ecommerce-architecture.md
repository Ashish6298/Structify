# E-Commerce architecture

The template keeps domain code independent of the chosen frontend, server, and database. UI modules consume `src/shared/api`; server route adapters consume `src/server/application`; persistence is isolated behind `src/server/infrastructure/database`.

## Bounded modules

- **auth**: controller/route adapter, application service, validation contract, and model boundary.
- **catalog**: controller/route adapter, application service, validation contract, and model boundary.
- **categories**: controller/route adapter, application service, validation contract, and model boundary.
- **cart**: controller/route adapter, application service, validation contract, and model boundary.
- **wishlist**: controller/route adapter, application service, validation contract, and model boundary.
- **orders**: controller/route adapter, application service, validation contract, and model boundary.
- **checkout**: controller/route adapter, application service, validation contract, and model boundary.
- **admin/products**: controller/route adapter, application service, validation contract, and model boundary.
- **admin/orders**: controller/route adapter, application service, validation contract, and model boundary.
- **admin/inventory**: controller/route adapter, application service, validation contract, and model boundary.

## Security baseline

Authentication and authorization are intentionally adapter-ready. Validate input at every route, use HTTP-only secure cookies or a managed identity provider, verify ownership for carts/orders/wishlists, and add rate limiting before exposing public endpoints.
