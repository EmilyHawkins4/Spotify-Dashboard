
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

let trackNames = [];
let tracksPop = [];

function populateUI(profile, tracks, artists, liked) {
    document.getElementById("displayName").innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar").appendChild(profileImage);
        document.getElementById("imgUrl").innerText = profile.images[0].url;
    }
    document.getElementById("id").innerText = profile.id;
    document.getElementById("email").innerText = profile.email;
    document.getElementById("uri").innerText = profile.uri;
    document.getElementById("uri").setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url").innerText = profile.href;
    document.getElementById("url").setAttribute("href", profile.href);

    // loops through all returned top tracks and creates and adds the name of the song to the list
    for( let item of tracks.items){
        createCard(item.album.images[0].url, item.name, "tracks")
        //trackNames.push(item.name)
        //tracksPop.push(item.popularity)
    }

    // loops through all returned top artists and creates and adds the name of the artist to the list
    let artist_graph = []
    let artist_pop_graph = []
    for( let item of artists.items){
        //console.log(item.name);
        createCard(item.images[0].url, item.name, "artists")
        artist_graph.push(item.name)
        artist_pop_graph.push(item.popularity)
    }

    // loops through all returned liked songs and creates and adds the name of the song to the list
    for( let item of liked.items){
        //console.log(item.name);
        createCard(item.track.album.images[0].url, item.track.name, "liked")
    }

    const ctx = document.getElementById('bar-chart');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: artist_graph.slice(0, 10),
        datasets: [{
          label: 'Your Artist Popularity',
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
  
    const ctx2 = document.getElementById('pie-chart');
  
    new Chart(ctx2, {
      type: 'pie',
      data: {
        labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
        datasets: [{
          label: '# of Votes',
          data: [12, 19, 3, 5, 2, 3],
          borderWidth: 1
        }]
      },
      
    });

}

function createCard(image, title, type) { // add artist, link
    
    const outerDiv = document.createElement('div');
    outerDiv.className = "inline-block px-3";

    // creating card box
    const card = document.createElement('div');
    card.className = "w-64 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300 ease-in-out";

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
    trackName.className = "mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white";
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
        // <div class="">
        //     <img class="rounded-t-lg" src="`+ item.album.images[0].url +`" alt="" />
        //     <div class="p-5">
        //         <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">`+ item.name +`</h5>
        //         <p class="mb-3 font-normal text-gray-700 dark:text-gray-400"></p>
        //         <a href="`+item.external_urls.spotify`" class="inline-flex items-center px-3 py-2 text-sm font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800">
        //             View Song on Spotify
        //             <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 10">
        //                 <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M1 5h12m0 0L9 1m4 4L9 9"/>
        //             </svg>
        //         </a>
        //     </div>
        // </div>`