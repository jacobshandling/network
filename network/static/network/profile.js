document.addEventListener('DOMContentLoaded', function() {


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
    
    const unfollow_button = document.querySelector('#unfollow')
    if (unfollow_button !== null) {

    unfollow_button.onsubmit = (event) => unfollow(event);
    }
    const follow_button = document.querySelector('#follow')
    if (follow_button !== null) {
        follow_button.onsubmit = (event) => follow(event);
    }




});

function follow(event) {
    event.preventDefault();
    fetch(`${profile_user_id}`, {
        method: 'PUT',
        body: JSON.stringify({
            follow: true
        })
    })
    .then(swap_un_follow_button());
}


function unfollow(event) {
    event.preventDefault();
    fetch(`${profile_user_id}`, {
        method: 'PUT',
        body: JSON.stringify({
            follow: false
        })
    })
    .then(swap_un_follow_button());
}

function swap_un_follow_button() {
    const follow_button = document.querySelector('#follow');
    if (follow_button.style.display === 'none') {
        follow_button.style.display = 'block';
    }
    else {
        follow_button.style.display = 'none';
    }

    const unfollow_button = document.querySelector('#unfollow');
    if (unfollow_button.style.display === 'none') {
        unfollow_button.style.display = 'block';
    }
    else {
        unfollow_button.style.display = 'none';
    }
    
}

// COPIED FROM INDEX.JS //

// will use to avoid race conditions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
    const post_id = post_object.dataset.postId
    fetch(`/post?id=${post_id}`, {
        method: 'PUT',
        body: JSON.stringify({
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

function reset_post_view(post_object, fresh_post_json_from_server){
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