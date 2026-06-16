from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import login, logout, authenticate
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.contrib import messages
from django.db.models import Q, Avg
from django.http import JsonResponse
from django.views.decorators.http import require_POST
import json
from .models import Product, Category, Order, OrderItem, Review, UserProfile


# ─── Cart Helpers ──────────────────────────────────────────────────────────────

def get_cart(request):
    return request.session.get('cart', {})

def save_cart(request, cart):
    request.session['cart'] = cart
    request.session.modified = True

def cart_total(cart, products_dict):
    total = 0
    for pid, qty in cart.items():
        p = products_dict.get(int(pid))
        if p:
            total += float(p.price) * qty
    return round(total, 2)


# ─── Pages ─────────────────────────────────────────────────────────────────────

def home(request):
    featured = Product.objects.filter(is_featured=True, is_active=True)[:8]
    categories = Category.objects.all()
    new_arrivals = Product.objects.filter(is_active=True).order_by('-created_at')[:8]
    return render(request, 'store/home.html', {
        'featured': featured,
        'categories': categories,
        'new_arrivals': new_arrivals,
    })


def product_list(request):
    products = Product.objects.filter(is_active=True)
    categories = Category.objects.all()
    category_slug = request.GET.get('category')
    query = request.GET.get('q', '')
    sort = request.GET.get('sort', 'newest')

    if category_slug:
        products = products.filter(category__slug=category_slug)
    if query:
        products = products.filter(Q(name__icontains=query) | Q(description__icontains=query))
    if sort == 'price_asc':
        products = products.order_by('price')
    elif sort == 'price_desc':
        products = products.order_by('-price')
    elif sort == 'name':
        products = products.order_by('name')
    else:
        products = products.order_by('-created_at')

    return render(request, 'store/product_list.html', {
        'products': products,
        'categories': categories,
        'selected_category': category_slug,
        'query': query,
        'sort': sort,
    })


def product_detail(request, slug):
    product = get_object_or_404(Product, slug=slug, is_active=True)
    reviews = product.reviews.all().order_by('-created_at')
    avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
    related = Product.objects.filter(category=product.category, is_active=True).exclude(id=product.id)[:4]
    user_review = None
    if request.user.is_authenticated:
        user_review = reviews.filter(user=request.user).first()

    if request.method == 'POST' and request.user.is_authenticated:
        rating = request.POST.get('rating')
        comment = request.POST.get('comment')
        if rating and comment:
            Review.objects.update_or_create(
                product=product, user=request.user,
                defaults={'rating': int(rating), 'comment': comment}
            )
            messages.success(request, 'Review submitted!')
            return redirect('product_detail', slug=slug)

    return render(request, 'store/product_detail.html', {
        'product': product,
        'reviews': reviews,
        'avg_rating': round(avg_rating, 1),
        'related': related,
        'user_review': user_review,
    })


# ─── Cart Views ────────────────────────────────────────────────────────────────

def cart_view(request):
    cart = get_cart(request)
    items = []
    total = 0
    for pid, qty in cart.items():
        try:
            product = Product.objects.get(id=int(pid), is_active=True)
            subtotal = float(product.price) * qty
            total += subtotal
            items.append({'product': product, 'qty': qty, 'subtotal': round(subtotal, 2)})
        except Product.DoesNotExist:
            pass
    return render(request, 'store/cart.html', {'items': items, 'total': round(total, 2)})


@require_POST
def add_to_cart(request):
    data = json.loads(request.body)
    pid = str(data.get('product_id'))
    qty = int(data.get('quantity', 1))
    cart = get_cart(request)
    cart[pid] = cart.get(pid, 0) + qty
    save_cart(request, cart)
    count = sum(cart.values())
    return JsonResponse({'success': True, 'cart_count': count, 'message': 'Added to cart!'})


@require_POST
def update_cart(request):
    data = json.loads(request.body)
    pid = str(data.get('product_id'))
    qty = int(data.get('quantity', 0))
    cart = get_cart(request)
    if qty <= 0:
        cart.pop(pid, None)
    else:
        cart[pid] = qty
    save_cart(request, cart)
    return JsonResponse({'success': True, 'cart_count': sum(cart.values())})


@require_POST
def remove_from_cart(request):
    data = json.loads(request.body)
    pid = str(data.get('product_id'))
    cart = get_cart(request)
    cart.pop(pid, None)
    save_cart(request, cart)
    return JsonResponse({'success': True, 'cart_count': sum(cart.values())})


# ─── Checkout & Orders ─────────────────────────────────────────────────────────

@login_required
def checkout(request):
    cart = get_cart(request)
    if not cart:
        messages.warning(request, 'Your cart is empty.')
        return redirect('cart')

    items = []
    total = 0
    for pid, qty in cart.items():
        try:
            product = Product.objects.get(id=int(pid), is_active=True)
            subtotal = float(product.price) * qty
            total += subtotal
            items.append({'product': product, 'qty': qty, 'subtotal': round(subtotal, 2)})
        except Product.DoesNotExist:
            pass

    if request.method == 'POST':
        address = request.POST.get('address', '').strip()
        city = request.POST.get('city', '').strip()
        postal = request.POST.get('postal_code', '').strip()
        country = request.POST.get('country', '').strip()
        phone = request.POST.get('phone', '').strip()
        notes = request.POST.get('notes', '').strip()

        if not all([address, city, postal, country]):
            messages.error(request, 'Please fill in all required fields.')
        else:
            order = Order.objects.create(
                user=request.user,
                total_price=round(total, 2),
                shipping_address=address,
                city=city,
                postal_code=postal,
                country=country,
                phone=phone,
                notes=notes,
            )
            for item in items:
                OrderItem.objects.create(
                    order=order,
                    product=item['product'],
                    product_name=item['product'].name,
                    price=item['product'].price,
                    quantity=item['qty'],
                )
                # reduce stock
                p = item['product']
                p.stock = max(0, p.stock - item['qty'])
                p.save()

            # clear cart
            save_cart(request, {})
            messages.success(request, f'Order #{order.id} placed successfully!')
            return redirect('order_detail', order_id=order.id)

    profile = getattr(request.user, 'profile', None)
    return render(request, 'store/checkout.html', {
        'items': items,
        'total': round(total, 2),
        'profile': profile,
    })


@login_required
def order_list(request):
    orders = Order.objects.filter(user=request.user)
    return render(request, 'store/order_list.html', {'orders': orders})


@login_required
def order_detail(request, order_id):
    order = get_object_or_404(Order, id=order_id, user=request.user)
    return render(request, 'store/order_detail.html', {'order': order})


# ─── Auth ──────────────────────────────────────────────────────────────────────

def register_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        email = request.POST.get('email', '').strip()
        password = request.POST.get('password', '')
        password2 = request.POST.get('password2', '')
        first_name = request.POST.get('first_name', '').strip()
        last_name = request.POST.get('last_name', '').strip()

        if password != password2:
            messages.error(request, 'Passwords do not match.')
        elif len(password) < 6:
            messages.error(request, 'Password must be at least 6 characters.')
        elif User.objects.filter(username=username).exists():
            messages.error(request, 'Username already taken.')
        elif User.objects.filter(email=email).exists():
            messages.error(request, 'Email already registered.')
        else:
            user = User.objects.create_user(
                username=username, email=email, password=password,
                first_name=first_name, last_name=last_name
            )
            UserProfile.objects.create(user=user)
            login(request, user)
            messages.success(request, f'Welcome, {first_name or username}!')
            return redirect('home')

    return render(request, 'store/register.html')


def login_view(request):
    if request.user.is_authenticated:
        return redirect('home')
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            next_url = request.GET.get('next', 'home')
            return redirect(next_url)
        else:
            messages.error(request, 'Invalid username or password.')
    return render(request, 'store/login.html')


def logout_view(request):
    logout(request)
    return redirect('home')


@login_required
def profile_view(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'POST':
        u = request.user
        u.first_name = request.POST.get('first_name', '').strip()
        u.last_name = request.POST.get('last_name', '').strip()
        u.email = request.POST.get('email', '').strip()
        u.save()
        profile.phone = request.POST.get('phone', '').strip()
        profile.address = request.POST.get('address', '').strip()
        profile.city = request.POST.get('city', '').strip()
        profile.country = request.POST.get('country', '').strip()
        profile.save()
        messages.success(request, 'Profile updated!')
        return redirect('profile')
    return render(request, 'store/profile.html', {'profile': profile})
