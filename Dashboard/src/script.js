const clientId = "";
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    console.log(profile); // Profile data logs to console

    const tracks = await fetchTopTracks(accessToken);
    console.log(tracks); // Tracks data logs to console

    const artists = await fetchTopArtists(accessToken);
    console.log(artists); // Artists data logs to console

    const liked = await fetchLikedSongs(accessToken);
    console.log(liked); // Artists data logs to console

    populateUI(profile, tracks, artists, liked);
}

export async function redirectToAuthCodeFlow(clientId) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("scope", "user-read-private user-read-email user-top-read user-library-read");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

export async function getAccessToken(clientId, code) {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://localhost:5173/callback");
    params.append("code_verifier", verifier);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchProfile(token) {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function fetchLikedSongs(token){
    const result = await fetch(`https://api.spotify.com/v1/me/tracks`, {
        headers: { Authorization: `Bearer ${token}`, },
    });

    return await result.json();
}

async function fetchTopTracks(token){
    const result = await fetch(`https://api.spotify.com/v1/me/top/tracks`, {
        headers: { Authorization: `Bearer ${token}`, },
    });

    return await result.json();
}

async function fetchTopArtists(token){
    const result = await fetch(`https://api.spotify.com/v1/me/top/artists`, {
        headers: { Authorization: `Bearer ${token}`, },
    });

    return await result.json();
}

function populateUI(profile, tracks, artists, liked) {
    if (profile.images[0]) {
        const img = document.createElement('img');
        img.className = "rounded-full";
        img.src = profile.images[0].url;
        document.getElementById("profile-box").appendChild(img);
    }
    var profile_text = document.createElement("div");

    var name = document.createElement("a");
    name.innerText = profile.display_name;
    name.href = profile.external_urls.spotify;
    profile_text.appendChild(name);

    var email = document.createElement("p");
    email.innerText = profile.email;
    email.className = 'text-sm text-gray-500 dark:text-gray-400';
    profile_text.appendChild(email);

    document.getElementById("profile-box").appendChild(profile_text);

    // loops through all returned top tracks and creates and adds the name of the song to the list
    for( let item of tracks.items){
        createCard(item.album.images[0].url, item.name, "tracks");
    }

    // loops through all returned top artists and creates and adds the name of the artist to the list
    let artist_graph = [];
    let genres = [];
    let artist_pop_graph = [];
    for( let item of artists.items){
        createCard(item.images[0].url, item.name, "artists");
        artist_graph.push(item.name);
        artist_pop_graph.push(item.popularity);
        genres = genres.concat(item.genres);
    }
    compileGenres(genres);
    // loops through all returned liked songs and creates and adds the name of the song to the list
    for( let item of liked.items){
        createCard(item.track.album.images[0].url, item.track.name, "liked")
    }

    const ctx = document.getElementById('bar-chart');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: artist_graph.slice(0, 10),
        datasets: [{
          label: 'Artist Popularity',
          backgroundColor: 'rgba(30, 215, 96, .3)',
          borderColor: 'rgba(30, 215, 96, 1)',
          data: artist_pop_graph.slice(0, 10),
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    });
    
    

}

function createCard(image, title, type) { // add artist, link
    
    const outerDiv = document.createElement('div');
    outerDiv.className = "inline-block px-3";

    // creating card box
    const card = document.createElement('div');
    card.className = "w-64 max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300 ease-in-out";

    // adding image to card box
    const img = document.createElement('img');
    img.className = "rounded-t-lg";
    img.src = image;
    card.appendChild(img);

    // creating content div 
    const div1 = document.createElement('div');
    div1.className = "p-5"

    // ading title to content div
    const trackName = document.createElement('h5');
    trackName.innerHTML = title;
    trackName.className = "mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white";
    div1.appendChild(trackName);

    // adding artist name to content div
    // const artistName = document.createElement('p');
    // artistName.innerHTML = artist;
    // artistName.className = "mb-3 font-normal text-gray-700 dark:text-gray-400";
    // div1.appendChild(artistName);

    card.appendChild(div1);
    outerDiv.appendChild(card);
    let typeName = type+"-list"
    document.getElementById(typeName).appendChild(outerDiv);

    return card;
}

function compileGenres(genres){
    var genre_counts = [];
    const visited = new Array(genres.length).fill(0)
    for(var i=0; i<genres.length; i++){
        if(visited[i] == 0){
            var count = 1;
            for(var j=i+1; j<genres.length; j++){
                if(genres[i] == genres[j]){
                    visited[j] = 1;
                    count++;
                }
            }
            genre_counts.push([genres[i], count])
        }
    }
    genre_counts.sort((a, b) =>b[1]-a[1]);
    genre_counts = genre_counts.slice(0, 5);
    console.log(genre_counts)
    var top_genres = []
    var top_genre_counts = []
    for(var i=0; i<genre_counts.length; i++){
        top_genres.push(genre_counts[i][0]);
        top_genre_counts.push(genre_counts[i][1]);
    }

    const ctx2 = document.getElementById('pie-chart');
  
    new Chart(ctx2, {
      type: 'pie',
      data: {
        labels: top_genres,
        datasets: [{
          label: 'Most Listened to Genres',
          data: top_genre_counts,
          backgroundColor: [
            'rgb(85, 242, 109)',
            'rgb(75, 255, 43)',
            'rgb(0, 222, 18)',
            'rgb(22, 156, 44)',
            'rgb(2, 107, 46)'
          ],
          borderWidth: 1
        }]
      },
      
    });

}