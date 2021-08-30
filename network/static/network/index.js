document.addEventListener('DOMContentLoaded', function() {

    const compose_form = document.querySelector('#compose-form')
    if (compose_form !== null) {
        compose_form.onsubmit = (event) => submit_post(event);
    }

    document.querySelectorAll('.post').forEach(post_div => {

        const edit_button = post_div.querySelector('.edit-btn');
        if (edit_button !== null) {
            edit_button.onclick = function() {
                edit_post(post_div);
            };
        }

        const like_button = post_div.querySelector('.like-btn');
        if (like_button !== null) {
            const user_likes_post = post_div.dataset.userHasLiked;
            if (user_likes_post === 'False') {
                like_button.onclick = function() {
                    like_post(post_div);
                };
            } else {
                swap_un_like_text_and_function(post_div);
                like_button.onclick = function() {
                    unlike_post(post_div);
                }
            }
        }

        const post_time_UTC = new Date(post_div.dataset.secondsTimestamp * 1000);
        post_div.querySelector('.post-time').innerText = post_time_UTC.toLocaleString();

    });

});

// will use to avoid race conditions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

async function submit_post(event) {
    
    event.preventDefault();
    post_body = document.querySelector('#compose-body').value;
    if (post_body === '') {
        alert("enter something to post");
    }
    else {
        // post the new post to the database
        fetch('/post', {
            method: 'POST',
            body: JSON.stringify({
                post_body: post_body
            })
        })
        // after waiting,
        .then(await sleep(100))

        //fetch the new post and add it to the DOM
        .then(get_and_add_latest_post())

        // then clear the text area
        .then(document.querySelector('#compose-body').value = '');
    }
}

function get_and_add_latest_post() {
    fetch('/post?id=-1')
    .then(response => response.json())
    .then(result => {
        dynamically_add_post(result);
    })
}

function dynamically_add_post(post_object) {

    // create new post div
    const post_div = create_new_post_div(post_object);

    // create content div
    const post_content_div = create_new_post_content_div(post_object);

    // create actions div
    const post_actions_div = document.createElement('div');
    post_actions_div.className = "post-actions";

        // add like button to actions div
    const like_button = document.createElement('button');
    like_button.className = 'like-btn btn-sm btn-outline-primary';
    like_button.innerText = 'Like';
    like_button.onclick = () => {
        like_post(post_div);
    };
    post_actions_div.append(like_button);
        
        // add edit button to actions div
    if (post_object.user === user) {
        const edit_button = document.createElement('button');
        edit_button.className = "edit-btn btn btn-sm btn-outline-primary";
        edit_button.innerText = 'Edit';
        edit_button.onclick = function() {
            edit_post(post_div);
        };
        post_actions_div.append(edit_button);
    }

    // add content and actions to post div
    post_div.append(post_content_div, post_actions_div);

    // add post div and break to top of posts view in DOM
    posts_view = document.querySelector('#posts-view')
    posts_view.insertBefore(document.createElement('br'), posts_view.firstChild);
    posts_view.insertBefore(post_div, posts_view.firstChild);

    }

function edit_post(post_object) {

    const post_content = post_object.querySelector(".post-content");

    // first, get the objects of the current post (same as inner html of the post)
    const post_body = post_content.querySelector(".post-body");
    const post_text = post_body.innerHTML;

    // then replace the body with a textarea
    const editing_text_area = document.createElement('textarea');
    editing_text_area.className= 'new-post-body';
    editing_text_area.autofocus = true;
    editing_text_area.value = post_text;

    post_content.replaceChild(editing_text_area, post_body);


    //  and hide the like and edit buttons and the like count
    const post_actions = post_object.querySelector('.post-actions');
    for (var i = 0; i < post_actions.children.length; i++) {
        var action_button = post_actions.children[i];
        action_button.style.display = 'none';
    };
    post_object.querySelector('.like-count').style.display = 'none';

    // add a save button
    const save_button = document.createElement('button');
    save_button.className='save-btn btn btn-sm btn-outline-primary';
    save_button.innerText='Save';
    save_button.onclick = function() {
        save_edited_post(post_object);
    };
    post_actions.append(save_button);
}


async function save_edited_post(post_object) {
    
    // fetch PUT request to server with new data
    const post_id = post_object.dataset.postId;
    fetch('/post', {
        method: 'PUT',
        body: JSON.stringify({
            operation: 'edit',
            new_post_body: post_object.querySelector('.new-post-body').value,
            post_id: post_id
        })
    })

    .then(await sleep(100))

    // fetch new data from server and add the new post text
    .then(
        fetch(`/post?id=${post_id}`)
        .then(response => response.json()) 
        .then(result => {
            reset_post_view(post_object, result);
        })
    );
    
}

function reset_post_view(post_object, fresh_post_json_from_server) {
        // remove save button
        post_object.querySelector('.save-btn').remove();

        // unhide like count and like and edit buttons
        const post_actions = post_object.querySelector('.post-actions');
        for (var i = 0; i < post_actions.children.length; i++) {
            var action_button = post_actions.children[i];
            action_button.style.display = 'inline';
        };

        post_object.querySelector('.like-count').style.display = 'inline';

        const post_content = post_object.querySelector('.post-content');
        const editing_text_area = post_content.querySelector('.new-post-body');
        const edited_post_body = get_edited_post_body(fresh_post_json_from_server);

        post_content.replaceChild(edited_post_body, editing_text_area);
    }

function get_edited_post_body(fresh_post_json_from_server) {
    const edited_post_body = document.createElement('h4');
    edited_post_body.className = 'post-body';
    edited_post_body.innerText = fresh_post_json_from_server.body;

    return edited_post_body;
}

function like_post(post_div) {
    const post_id = post_div.dataset.postId;
    fetch('/post', {
        method: 'PUT',
        body: JSON.stringify({
            operation: 'like',
            post_id: post_id
        })
    })
    .then(response => {
        if (response.status === 201) {
            increment_DOM_like_count(post_div);
            swap_un_like_text_and_function(post_div);
            swap_liked_bool(post_div);
        
        // this should never be triggered, as the user should only be presented with the 'unlike' button at this point
        } else {
            console.log('You have already liked this post');
        }
    });
}

function increment_DOM_like_count(post_div) {
    const like_count = post_div.querySelector('.like-count');
    const old_text = like_count.innerText;
    let count = Number(old_text.split(/[ ,]+/)[0]);
    count++;
    like_count.innerText = `${count} likes`;
}

function swap_un_like_text_and_function(post_div) {
    const button = post_div.querySelector('.like-btn');
    let current_button_text = button.innerText;
    if (current_button_text === 'Like') {
        button.innerText = 'Unlike';
        button.onclick = function() {
            unlike_post(post_div);
        }
    } else {
        button.innerText = 'Like';
        button.onclick = function() {
            like_post(post_div);
        }
    }
}

function swap_liked_bool(post_div) {

    let user_likes_post = post_div.dataset.userHasLiked;
    if (user_likes_post == true) {
        user_likes_post = false;
    } else {
        user_likes_post = true;
    }
}

function unlike_post(post_div) {
    const post_id = post_div.dataset.postId;
    fetch('/post', {
        method: 'PUT',
        body: JSON.stringify({
            operation: 'unlike',
            post_id: post_id
        })
    })
    .then(response => {
        if (response.status === 201) {
            decrement_DOM_like_count(post_div);
            swap_un_like_text_and_function(post_div);
            swap_liked_bool(post_div);
            
        // this should never be triggered, as the user should only be presented with the 'like' button at this point
        } else {  
            console.log('You have not liked this post');
        }
    });
}

function decrement_DOM_like_count(post_div) {
    const like_count = post_div.querySelector('.like-count');
    const old_text = like_count.innerText;
    let count = Number(old_text.split(/[ ,]+/)[0]);
    count--;
    like_count.innerText = `${count} likes`; 
}

function create_new_post_div(post_object) {
    const post_div = document.createElement('div');
    post_div.className = "post container";
    post_div.dataset.postId = post_object.id;
    post_div.dataset.secondsTimestamp = post_object.time;
    return post_div;
}

function create_new_post_content_div(post_object) {

    const post_content_div = document.createElement('div');
    const post_UTC_time = new Date(post_object.time * 1000);
    post_content_div.className = "post-content";
    post_content_div.innerHTML = `<h5><a href="/profile/${post_object.user_id}">${post_object.user}</a></h5><h4 class="post-time">${post_UTC_time.toLocaleString()}</h4>`;

    const post_body = document.createElement('h4');
    post_body.innerHTML = `${post_object.body}`;
    post_body.className = 'post-body';
    post_content_div.appendChild(post_body);

    const post_like_count = document.createElement('p');
    post_like_count.innerHTML = `${post_object.likers.length} likes`;
    post_like_count.className = 'like-count';
    post_content_div.appendChild(post_like_count);

    return post_content_div;
}