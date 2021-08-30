import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.core import paginator
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect
from django.http.response import JsonResponse
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from django.core import serializers
from django.core.paginator import Paginator

from .models import User, Post


def index(request):
    posts = Post.objects.all()
    paginator = Paginator(posts, 10)
    
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    return render(request, "network/index.html", {
        'posts_and_user_likes_post_and_post_timestamps': zip([post for post in page_obj], [request.user in post.likers.all() for post in page_obj], [post.time.timestamp() for post in page_obj]),
        'filter': 'all',
        'page_obj': page_obj
    })

@login_required
def view_following_posts(request):
    following = User.objects.get(username=request.user).following.all()
    posts = []
    for followed_user in following:
        user_posts = followed_user.posts.all()
        posts.extend(user_posts)
    
    paginator = Paginator(posts, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    return render(request, "network/index.html", {
        'posts_and_user_likes_post_and_post_timestamps': zip([post for post in page_obj], [request.user in post.likers.all() for post in page_obj], [post.time.timestamp() for post in page_obj]),
        'filter': 'following',
        'page_obj': page_obj
    })

def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")

@csrf_exempt
@login_required
def post(request):
    '''
    If request.method == 'POST', saves a new post and returns status 201
    If request.method == 'GET', returns the most recent post in the DB as json or the post with specified post ID
    If request.method == 'PUT', edits or updates like state of the post
    '''
    
    if request.method == "POST":

        data = json.loads(request.body)
        post_body = data.get("post_body", "")
        new_post = Post(
            user = request.user,
            body = post_body
        )
        new_post.save()

        return JsonResponse({"message": "Post saved successfully."}, status=201)

    elif request.method == "GET":
        post_id = request.GET['id']
        if post_id =='-1':
        # get most recent (assuming Post rows ordered by most recent) post
            try:
                post = Post.objects.first()
            except Post.DoesNotExist:
                return JsonResponse({"error": "First post not found"}, status=404)
        else:
            try:
                post = Post.objects.get(id=post_id) 
            except Post.DoesNotExist:
                return JsonResponse({"error": "Post not found"}, status=404)
        
        return JsonResponse(post.serialize(), status=200)
    
    elif request.method == "PUT":
        data = json.loads(request.body)
        operation = data.get("operation", "")
        post_id = data.get("post_id", "")

        if operation == 'edit':
            new_post_body = data.get("new_post_body", "")
            post = Post.objects.get(id=post_id)
            post.body = new_post_body
            post.save()

            return JsonResponse({"message": "Edited post saved successfully."}, status=201)

        elif operation == 'like':
            post = Post.objects.get(id=post_id)
            if post.likers.filter(id=request.user.id).exists():
                return JsonResponse({"message": "Error - you've already liked this post"}, status = 418)
            else:
                post.likers.add(request.user)
                post.save()

                return JsonResponse({"message": "Liked post successfully."}, status=201)

        elif operation == 'unlike':
            post = Post.objects.get(id=post_id)
            if not post.likers.filter(id=request.user.id).exists():
                return JsonResponse({"message": "Error - you haven't liked this post"}, status = 418)
            else:
                post.likers.remove(request.user)
                post.save()

                return JsonResponse({"message": "Unliked post successfully."}, status=201)

    else:
        return JsonResponse({'message': 'Must be GET, POST, or PUT'}, status = 405)

@csrf_exempt
@login_required
def profile(request, user_id):
    '''
    On GET, renders the profile page of the user with user_id
    on PUT, follows or unfollows the user with user_id
    '''

    profile_user = User.objects.get(id=user_id)
    current_user = User.objects.get(username=request.user)

    if request.method == 'GET':

        user_posts = profile_user.posts.all()
        paginator = Paginator(user_posts, 10)
        page_number = request.GET.get('page')
        page_obj = paginator.get_page(page_number) 

        return render(request, "network/profile.html", {
            "profile_username": profile_user,
            "profile_user_id": user_id,
            "followers": profile_user.followers.all(),
            "following": profile_user.following.all(),
            'posts_and_user_likes_post_and_post_timestamps': zip([post for post in page_obj], [request.user in post.likers.all() for post in page_obj], [post.time.timestamp() for post in page_obj]),
            'page_obj': page_obj
        })
    elif request.method == 'PUT':
        # follow or unfollow the user
        data = json.loads(request.body)
        if data.get('follow') == True:
            current_user.following.add(profile_user)
        else:
            current_user.following.remove(profile_user)
        current_user.save()
        return HttpResponse(status=204)

    else:
        return JsonResponse({
            "error": "GET or PUT request required."
        }, status=400)

