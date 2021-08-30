# network - a Twitter-like social network built with Django and vanilla JavaScript

You can see a run-through [here](https://www.youtube.com/watch?v=FBqxbH8EeA8)

# To run:

2. cd into the directory you want this repository to exist in, then run `git clone https://github.com/jacobshandling/network.git` to clone it there.
4. `cd` into commerce 
5. Activate a new environment and install requirements by running `pip3 install -r requirements.txt`
4. Run `python3 manage.py migrate` to apply migrations
5. Create a superuser account by running `python3 manage.py createsuperuser`, and filling out the requested fields. You can also register regular user accounts from the UI, but a superuser account will allow you to use the admin interface.
6. Run `python3 manage.py runserver`
7. Access the web app locally at http://127.0.0.1:8000 in your browser
8. You can also access the site admin interface at http://127.0.0.1:8000/admin/ with your superuser account
   - To allow users to add categories to their listings, you'll first want to create those categories using this admin interface
   
# For the hawk-eyed:
Congratulations, you have a sharp eye! In the video run-through, you may see a bug in which some like/edit buttons are on top of each other, while others are side-by-side.
This was a simple styling bug that is already fixed in this repo.
