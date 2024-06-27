
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

    populateUI(profile, tracks, artists);
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

function populateUI(profile, tracks, artists) {
    
    // displays profile photo, username, email
    if (profile.images[0]) {
        const img = document.createElement('img');
        img.className = "rounded-full border-2";
        img.src = profile.images[0].url;
        document.getElementById("profile-box").appendChild(img);
    }
    var profile_text = document.createElement("div");
    var name = document.createElement("a");
    name.innerText = profile.display_name;
    name.href = profile.external_urls.spotify;
    name.className = 'underline';
    profile_text.appendChild(name);

    var email = document.createElement("p");
    email.innerText = profile.email;
    email.className = 'text-sm text-gray-500 dark:text-gray-400';
    profile_text.appendChild(email);

    document.getElementById("profile-box").appendChild(profile_text);


    // loops through all returned top tracks, creates card, and adds the name of the song to the list
    let top_tracks_artists = [];
    for( let item of tracks.items){
        let track_artists = '';
        for(let i of item.artists){
            top_tracks_artists.push(i.name);
            track_artists += i.name + ", "
        }
        createCard(item.album.images[0].url, item.name, track_artists,  "tracks");
        for(let i of item.artists){
            top_tracks_artists.push(i.name);
        }
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
    compilePieChart(genres, 'genre');
    compilePieChart(top_tracks_artists, 'artist');

    const ctx = document.getElementById('bar-chart');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: artist_graph.slice(0, 10),
        datasets: [{
          label: 'Artist Popularity',
          backgroundColor: 'rgba(30, 215, 96, .4)',
          borderColor: 'rgba(30, 215, 96, 1)',
          data: artist_pop_graph.slice(0, 10),
          borderWidth: 1
        }]
      },
      options: {
        scales: {
          y: {
            beginAtZero: true,
            suggestedMax: 100
          }
        }
      }
    });
    
//     for(let artist of artist_graph){
//         var checkElement = document.getElementById("artist-reccomendations")
//         selectElement.add(new Option(artist, artist));
//     }

//     $(document).on('change','#artist-reccomendations',function(){
//         var e = document.getElementById("artist-reccomendations");
//         var value = e.value;
//         alert(value);
//    });

}

function createCard(image, title, text, type) { // add artist, link
    
    // creating padding around cards
    const outerDiv = document.createElement('div');
    outerDiv.className = "inline-block px-3";

    // creating card box
    const card = document.createElement('div');
    card.className = "w-64 max-w-xs bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300 ease-in-out";

    // adding image to card box
    const img = document.createElement('img');
    img.className = "rounded-t-lg aspect-square";
    img.src = image;
    card.appendChild(img);

    // creating content div 
    const div1 = document.createElement('div');
    div1.className = "p-5"

    // ading title to content div
    const cardTitle = document.createElement('h5');
    cardTitle.innerHTML = title;
    cardTitle.className = "mb-2 text-xl font-bold tracking-tight text-gray-900 dark:text-white";
    div1.appendChild(cardTitle);

    // adding subtext to content div
    const cardText = document.createElement('h5');
    cardText.innerHTML = text;
    cardText.className = "mb-3 font-normal text-gray-700 dark:text-gray-400";
    div1.appendChild(cardText);

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

function compilePieChart(items, type){
    var counts = [];
    const visited = new Array(items.length).fill(0)
    for(var i=0; i<items.length; i++){
        if(visited[i] == 0){
            var count = 1;
            for(var j=i+1; j<items.length; j++){
                if(items[i] == items[j]){
                    visited[j] = 1;
                    count++;
                }
            }
            counts.push([items[i], count])
        }
    }
    counts.sort((a, b) =>b[1]-a[1]);
    counts = counts.slice(0, 5);
    var top_items = []
    var top_counts = []
    for(var i=0; i<counts.length; i++){
        top_items.push(counts[i][0]);
        top_counts.push(counts[i][1]);
    }

    if(type == 'genre'){
        const ctx2 = document.getElementById('genre-pie-chart');
  
        new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: top_items,
                datasets: [{
                    label: 'Most Listened to Genres',
                    data: top_counts,
                    backgroundColor: [
                        'rgb(0, 222, 18)',
                        '#70e000',
                        '#ccff33',
                        '#0d9e0d',
                        '#0F7436'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    } else if(type == 'artist'){
        const ctx3 = document.getElementById('artist-pie-chart');
  
        new Chart(ctx3, {
            type: 'pie',
            data: {
                labels: top_items,
                datasets: [{
                    label: 'Top Artists Based on Top Songs',
                    data: top_counts,
                    backgroundColor: [
                        'rgb(0, 222, 18)',
                        '#70e000',
                        '#ccff33',
                        '#0d9e0d',
                        '#0F7436'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
      
        });
    }
    

}