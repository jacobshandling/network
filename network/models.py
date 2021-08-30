from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    following = models.ManyToManyField('User', blank=True, related_name='followers')

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    time = models.DateTimeField(auto_now_add=True)
    body = models.TextField(max_length=2200)
    likers = models.ManyToManyField(User, blank=True, default=None, related_name='liked_posts')

    class Meta:
        ordering = ('-time',)

    def serialize(self):
        
        # # mirror Django's default datetime output
        # time = list(self.time.strftime("%B %d, %Y, %-I:%M %p"))
        # time[-2] = time[-2].lower()
        # time[-1] = time[-1].lower()
        # time.insert(-1, '.')
        # time.append('.')
        # time = ''.join(time)

        return {
            "id": self.id,
            "user": self.user.username,
            "user_id": self.user.id,
            "body": self.body,
            "time": self.time.timestamp(),
            "likers": [liker.id for liker in self.likers.all()]
        }
         
    def __str__(self):
        return f"At {self.time}, {self.user} wrote: {self.body}"