import os, sys

# ── Minimal stub so the file parses even without Django installed ──
# When run via `python manage.py seed_data` this is irrelevant;
# this guard is just to avoid import errors in IDEs.

try:
    from django.core.management.base import BaseCommand
    from django.contrib.auth.models import User
    from store.models import Category, Product, UserProfile

    class Command(BaseCommand):
        help = 'Seed the database with sample products and a demo user'

        def handle(self, *args, **kwargs):
            # Create categories
            cats = {}
            for name, slug in [
                ('Electronics', 'electronics'),
                ('Clothing', 'clothing'),
                ('Books', 'books'),
                ('Home & Kitchen', 'home-kitchen'),
                ('Sports', 'sports'),
            ]:
                c, _ = Category.objects.get_or_create(slug=slug, defaults={'name': name})
                cats[slug] = c
                self.stdout.write(f'  Category: {name}')

            # Products data: (name, slug, category, price, orig_price, stock, featured, desc, img_url)
            products = [
                ('iPhone 15 Pro', 'iphone-15-pro', 'electronics', 999, 1099, 50, True,
                 'The most powerful iPhone ever. A17 Pro chip, titanium design, and a 48MP camera system.',
                 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600'),
                ('Sony WH-1000XM5', 'sony-wh1000xm5', 'electronics', 349, 399, 30, True,
                 'Industry-leading noise canceling headphones with 30-hour battery life and crystal-clear hands-free calling.',
                 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600'),
                ('MacBook Air M3', 'macbook-air-m3', 'electronics', 1299, 1399, 20, True,
                 'Supercharged by M3. Strikingly thin and light. All-day battery. Up to 18 hours of battery life.',
                 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600'),
                ('Samsung 4K Monitor', 'samsung-4k-monitor', 'electronics', 499, 599, 15, False,
                 '27" 4K UHD monitor with HDR support, USB-C connectivity, and an ultra-slim bezel design.',
                 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=600'),
                ('Nike Air Max 270', 'nike-air-max-270', 'clothing', 150, 180, 100, True,
                 "Nike's first lifestyle Air Max shoe delivers an iconic look inspired by Air Max icons.",
                 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'),
                ('Levi\'s 501 Jeans', 'levis-501-jeans', 'clothing', 69, 89, 200, False,
                 'The original blue jean since 1873. Straight fit with a button fly.',
                 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600'),
                ('Patagonia Fleece Jacket', 'patagonia-fleece', 'clothing', 199, 229, 45, True,
                 'Made with 100% recycled polyester fleece. Warm, comfortable, and sustainable.',
                 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600'),
                ('Atomic Habits', 'atomic-habits', 'books', 18, 25, 500, False,
                 'The #1 New York Times bestseller. An easy and proven way to build good habits and break bad ones.',
                 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600'),
                ('The Psychology of Money', 'psychology-of-money', 'books', 16, 22, 300, False,
                 'Timeless lessons on wealth, greed, and happiness. Morgan Housel\'s international bestseller.',
                 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=600'),
                ('KitchenAid Stand Mixer', 'kitchenaid-mixer', 'home-kitchen', 449, 499, 25, True,
                 'The iconic tilt-head stand mixer with 10 speeds. Includes flat beater, dough hook, and wire whip.',
                 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600'),
                ('Instant Pot Duo 7-in-1', 'instant-pot-duo', 'home-kitchen', 89, 119, 80, False,
                 'Pressure cooker, slow cooker, rice cooker, steamer, sauté, yogurt maker, and warmer in one.',
                 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=600'),
                ('Yoga Mat Premium', 'yoga-mat-premium', 'sports', 79, 99, 120, False,
                 'Non-slip, eco-friendly TPE yoga mat with alignment lines. 6mm thick for extra cushion.',
                 'https://images.unsplash.com/photo-1601925228126-c48992ec94de?w=600'),
                ('Kettlebell Set', 'kettlebell-set', 'sports', 149, 179, 40, True,
                 'Cast iron kettlebells with vinyl coating. Set includes 8kg, 12kg, and 16kg weights.',
                 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600'),
            ]

            for name, slug, cat_slug, price, orig, stock, featured, desc, img in products:
                p, created = Product.objects.get_or_create(slug=slug, defaults={
                    'name': name,
                    'category': cats[cat_slug],
                    'price': price,
                    'original_price': orig,
                    'stock': stock,
                    'is_featured': featured,
                    'description': desc,
                    'image_url': img,
                    'is_active': True,
                })
                status = 'Created' if created else 'Exists'
                self.stdout.write(f'  {status}: {name}')

            # Demo user
            if not User.objects.filter(username='demo').exists():
                user = User.objects.create_user('demo', 'demo@example.com', 'demo1234',
                                                first_name='Demo', last_name='User')
                UserProfile.objects.create(user=user, city='New York', country='USA')
                self.stdout.write(self.style.SUCCESS('  Demo user created (demo / demo1234)'))

            # Admin user
            if not User.objects.filter(username='admin').exists():
                User.objects.create_superuser('admin', 'admin@example.com', 'admin1234')
                self.stdout.write(self.style.SUCCESS('  Superuser created (admin / admin1234)'))

            self.stdout.write(self.style.SUCCESS('\n✅ Database seeded successfully!'))

except ImportError:
    pass
