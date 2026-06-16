# NOVA Shop — Django E-Commerce Store

A full-stack e-commerce application built with Django and a dark-themed, premium frontend.

## Features

- **Product Listings** — Grid layout with category filtering, search, and sorting
- **Product Detail Pages** — Image, description, pricing, stock status, reviews & ratings
- **Shopping Cart** — Live quantity updates, remove items, total calculation (session-based)
- **Checkout** — Shipping form, order summary, stock deduction
- **Order Management** — Order history, order detail with status tracking
- **User Auth** — Register, Login, Logout, Profile editing
- **Reviews** — Authenticated users can rate & review products
- **Admin Panel** — Django admin for managing products, orders, users
- **Database** — SQLite (dev) with Django ORM models for Products, Categories, Orders, Reviews, UserProfiles

## Tech Stack

| Layer    | Technology |
|----------|-----------|
| Backend  | Python 3.x + Django 4.2 |
| Database | SQLite (swap to PostgreSQL for production) |
| Frontend | HTML5, CSS3 (CSS variables, Grid, Flexbox), Vanilla JS |
| Fonts    | Bebas Neue (display), DM Sans (body), DM Mono (prices) |
| Icons    | Font Awesome 6 |

## Quick Start

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run migrations
```bash
python manage.py migrate
```

### 3. Seed the database with sample data
```bash
python manage.py seed_data
```
This creates:
- 5 categories (Electronics, Clothing, Books, Home & Kitchen, Sports)
- 13 products with images
- Demo user: `demo / demo1234`
- Admin user: `admin / admin1234`

### 4. Start the dev server
```bash
python manage.py runserver
```

Visit **http://127.0.0.1:8000**

## Project Structure

```
ecommerce/
├── manage.py
├── requirements.txt
├── ecommerce/              # Django project config
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── store/                  # Main app
    ├── models.py           # Product, Category, Order, OrderItem, Review, UserProfile
    ├── views.py            # All page views + cart API
    ├── urls.py             # URL routing
    ├── admin.py            # Django admin config
    ├── context_processors.py
    ├── management/
    │   └── commands/
    │       └── seed_data.py
    └── templates/store/
        ├── base.html           # Layout, navbar, footer, toast
        ├── home.html           # Hero, categories, featured, new arrivals
        ├── product_list.html   # Shop page with sidebar filters
        ├── product_detail.html # Product page with reviews
        ├── _product_card.html  # Reusable card partial
        ├── cart.html           # Cart with live JS updates
        ├── checkout.html       # Shipping form + order summary
        ├── order_list.html     # Order history table
        ├── order_detail.html   # Single order details
        ├── login.html          # Login form
        ├── register.html       # Registration form
        └── profile.html        # User profile editor
```

## Cart API Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST | `/cart/add/` | Add item `{product_id, quantity}` |
| POST | `/cart/update/` | Update qty `{product_id, quantity}` |
| POST | `/cart/remove/` | Remove item `{product_id}` |

All return JSON `{success, cart_count}`.

## Production Checklist

1. Set `DEBUG = False` in settings.py
2. Use a real `SECRET_KEY` (env variable)
3. Switch to PostgreSQL: update `DATABASES` setting
4. Run `python manage.py collectstatic`
5. Serve static/media files via nginx or a CDN
6. Add Stripe/PayPal for real payment processing

## Admin

Visit `/admin/` and log in with `admin / admin1234` to manage:
- Products (add/edit/toggle featured)
- Orders (update status)
- Categories
- User profiles
